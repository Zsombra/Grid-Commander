import type { ConfirmationStore } from '@/domain/capability/confirmation.js';
import { CONFIRMATION_TTL_SECONDS } from '@/domain/capability/confirmation.js';
import type { CompiledPlan } from '@/domain/strategy/compiled-plan.js';
import {
  blastRadius,
  confirmationSummary,
  isViable,
  toApplyPlan,
} from '@/domain/strategy/compiled-plan.js';
import { describeBlastRadius } from '@/domain/strategy/strategy.js';
import { describeRefusal, parsePlanToken, refuseLocally } from '@/domain/strategy/plan-token.js';
import type { StrategiesPort } from '@/ports/strategies.js';
import type { Clock } from '@/ports/clock.js';
import type { Randomness } from './connect.commands.js';
import {  } from './compile-plan.command.js';
import { confirmationTarget } from '@/domain/capability/confirmation.js';
import { digestOf } from '@/domain/capability/digest.js';
import type { BattlegridSubject } from '@/domain/connection/subject.js';

export interface DescribeApplyRequest {
  readonly userId: string;
  /** BattleGrid's identity for the acting account. `null` when unknown. */
  readonly battlegridSubject: BattlegridSubject | null;
  readonly accessToken: string;
  readonly strategyId: string;
  readonly plan: CompiledPlan;
  /** The intent currently on screen. Must still be the one that was compiled. */
  readonly currentIntent: Readonly<Record<string, unknown>>;
  readonly currentRevision?: number | undefined;
  /**
   * Consequences the surface that composed this plan can state and the platform
   * cannot, appended before the token is minted.
   *
   * Added for the condition write, whose blast radius is not the one BattleGrid
   * describes: `compile_strategy_plan` accounts for a plan, and a condition
   * write is a resubmission of the strategy's *whole* condition list, so what
   * the list becomes and which references it would leave dangling are facts only
   * the composing surface holds. Part of the consequence rather than beside it,
   * because the stored text is what the audit can prove was agreed to — a
   * warning shown and not stored is one nobody can be held to.
   *
   * Absent for every other caller, and the composed string is byte-identical
   * when it is absent.
   */
  readonly addendum?: string | undefined;
}

export interface ApplyProposal {
  readonly strategyId: string;
  readonly planToken: string;
  readonly consequence: string;
  readonly boundAgentCount: number | null;
  readonly confirmationToken: string;
}

export type DescribeApplyResult =
  | { readonly kind: 'proposal'; readonly proposal: ApplyProposal }
  | { readonly kind: 'refused'; readonly reason: string };

/**
 * Prepare an apply: check everything that can be checked here, then issue the
 * confirmation against the platform's own description of the operation.
 *
 * Four things are refused locally, each with a reason the user can act on and
 * each ending in "compile again" — expired, foreign, superseded, unviable. None
 * of them is evidence that a plan which passes *is* valid; the server decides
 * that. See S-B.
 */
export class DescribeApplyQuery {
  constructor(
    private readonly confirmations: ConfirmationStore,
    private readonly random: Randomness,
    private readonly clock: Clock,
  ) {}

  async execute(req: DescribeApplyRequest): Promise<DescribeApplyResult> {
    const { plan } = req;

    // The intent moved after compiling. The token is bound to what was compiled,
    // so applying would land the old change while the screen shows the new one.
    if (digestOf(req.currentIntent) !== plan.intentDigest) {
      return {
        kind: 'refused',
        reason:
          'This change has been edited since it was compiled. Compile again so you ' +
          'review what would actually be applied.',
      };
    }

    if (!isViable(plan.approvedPlan)) {
      return {
        kind: 'refused',
        reason: 'BattleGrid reports this plan as not viable, so it cannot be applied as it stands.',
      };
    }

    const refusal = refuseLocally(
      parsePlanToken(plan.planToken),
      {
        // BattleGrid's identity for the acting account, not our local row id. See
        // DL-1: they are two facts, and this check is about theirs.
        battlegridSubject: req.battlegridSubject,
        strategyId: req.strategyId,
        currentRevision: req.currentRevision,
      },
      this.clock.now(),
    );
    if (refusal) return { kind: 'refused', reason: describeRefusal(refusal) };

    const summary = confirmationSummary(plan.reviewContext);
    if (!summary) {
      // The consequence text is the platform's, not ours (S-D). Without it there
      // is nothing honest to put in front of the user, and inventing a
      // description of a fleet-wide change is exactly the wrong place to guess.
      return {
        kind: 'refused',
        reason:
          'BattleGrid did not describe what this plan would do, so it cannot be confirmed. ' +
          'Compile again.',
      };
    }

    const count = blastRadius(plan.approvedPlan);
    const consequence = [
      summary,
      count === null ? null : describeBlastRadius(count),
      req.addendum ?? null,
    ]
      .filter((part): part is string => part !== null && part.length > 0)
      .join('\n\n');

    const confirmationToken = this.random.token(32);
    await this.confirmations.issue({
      token: confirmationToken,
      userId: req.userId,
      tool: 'apply_strategy_plan',
      target: confirmationTarget.strategyPlan(req.strategyId, plan.intentDigest),
      consequence,
      expiresAt: new Date(this.clock.now().getTime() + CONFIRMATION_TTL_SECONDS * 1000),
      consumedAt: null,
    });

    return {
      kind: 'proposal',
      proposal: {
        strategyId: req.strategyId,
        planToken: plan.planToken,
        consequence,
        boundAgentCount: count,
        confirmationToken,
      },
    };
  }
}

export interface ApplyPlanRequest {
  readonly userId: string;
  readonly accessToken: string;
  readonly strategyId: string;
  readonly plan: CompiledPlan;
  readonly confirmationToken: string;
}

export interface ApplyPlanResult {
  readonly applied: Readonly<Record<string, unknown>>;
}

/**
 * Apply the plan the platform compiled.
 *
 * The only transformation between review and application is `toApplyPlan`, which
 * is a projection and not a rebuild — the values are the compiler's, and this
 * chooses which of them to send rather than what they should be. See S-A.
 */
export class ApplyPlanCommand {
  constructor(private readonly strategies: StrategiesPort) {}

  async execute(req: ApplyPlanRequest): Promise<ApplyPlanResult> {
    const applied = await this.strategies.applyPlan({
      userId: req.userId,
      accessToken: req.accessToken,
      strategyId: req.strategyId,
      plan: toApplyPlan(req.plan.approvedPlan),
      planToken: req.plan.planToken,
      confirmation: {
        token: req.confirmationToken,
        // The same construction the proposal used. These two were
        // `strategy:<id>#<digest>` and `strategy:<id>` — see the adapter comment.
        target: confirmationTarget.strategyPlan(req.strategyId, req.plan.intentDigest),
      },
    });
    return { applied };
  }
}
