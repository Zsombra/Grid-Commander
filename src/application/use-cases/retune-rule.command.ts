import type { ConfirmationStore } from '@/domain/capability/confirmation.js';
import { CONFIRMATION_TTL_SECONDS, confirmationTarget } from '@/domain/capability/confirmation.js';
import type { SignalRule } from '@/domain/strategy/strategy.js';
import type { StrategiesPort } from '@/ports/strategies.js';
import type { Clock } from '@/ports/clock.js';
import type { Randomness } from './connect.commands.js';
import { outcomeOf } from './failure-outcome.js';

export interface RetuneIntent {
  readonly allocation: number;
  readonly required: boolean;
  /** Exactly what will be sent — every declared parameter, or nothing. */
  readonly ruleParams: Readonly<Record<string, unknown>> | undefined;
}

export interface DescribeRetuneRequest {
  readonly userId: string;
  readonly accessToken: string;
  readonly strategyId: string;
  readonly signalId: string;
  readonly intent: RetuneIntent;
}

export interface RetuneProposal {
  readonly strategyId: string;
  readonly strategyName: string;
  /** The revision the describe read — what the perform must send. */
  readonly expectedRevision: number;
  readonly signalId: string;
  readonly current: SignalRule;
  readonly intent: RetuneIntent;
  readonly boundAgentCount: number;
  /** What the user must read. The confirmation is issued against this text. */
  readonly consequence: string;
  readonly confirmationToken: string;
}

export type DescribeRetuneResult =
  | { readonly kind: 'proposal'; readonly proposal: RetuneProposal }
  | { readonly kind: 'strategy-missing' }
  | { readonly kind: 'not-a-rule'; readonly reason: string }
  | { readonly kind: 'no-op'; readonly reason: string }
  | { readonly kind: 'unreadable'; readonly reason: string };

/** The digestable form of the intent — one shape, used by mint and spend alike. */
function intentRecord(intent: RetuneIntent): Readonly<Record<string, unknown>> {
  return {
    allocation: intent.allocation,
    required: intent.required,
    ...(intent.ruleParams !== undefined ? { params: intent.ruleParams } : {}),
  };
}

function sameParams(
  a: Readonly<Record<string, unknown>> | undefined | null,
  b: Readonly<Record<string, unknown>> | undefined,
): boolean {
  return JSON.stringify(a ?? {}) === JSON.stringify(b ?? {});
}

/**
 * Compose a retune and issue the confirmation for it.
 *
 * The platform's own description carries the stakes — the change propagates
 * to every bound agent immediately and open positions do not block it — so
 * the consequence says exactly that, with this strategy's actual count. The
 * token is bound to the strategy at the revision read, the signal, and a
 * digest of the exact values (DL-1); the signal must already be one of the
 * strategy's rules (DL-2).
 */
export class DescribeRetuneQuery {
  constructor(
    private readonly strategies: StrategiesPort,
    private readonly confirmations: ConfirmationStore,
    private readonly random: Randomness,
    private readonly clock: Clock,
  ) {}

  async execute(req: DescribeRetuneRequest): Promise<DescribeRetuneResult> {
    const read = await this.strategies.readStrategy(req);
    if (read.kind === 'missing') return { kind: 'strategy-missing' };
    if (read.kind === 'unreadable') return { kind: 'unreadable', reason: read.reason };

    const { summary } = read.detail;
    const current = read.detail.signalRules.find((r) => r.signalId === req.signalId);
    if (!current) {
      return {
        kind: 'not-a-rule',
        reason: `"${summary.name}" does not weigh ${req.signalId}. Only a rule the strategy already carries can be retuned here.`,
      };
    }

    const { intent } = req;
    if (
      current.allocation === intent.allocation &&
      current.required === intent.required &&
      (intent.ruleParams === undefined || sameParams(current.params, intent.ruleParams))
    ) {
      return {
        kind: 'no-op',
        reason: `${req.signalId} already has allocation ${current.allocation}${current.required ? ', required' : ''}. Nothing would change.`,
      };
    }

    const agents =
      summary.boundAgentCount === 0
        ? 'No agents are bound to it, so nothing is reconfigured today — but the next bound agent inherits this.'
        : summary.boundAgentCount === 1
          ? 'The one agent bound to it is reconfigured immediately; open positions do not block the edit.'
          : `All ${summary.boundAgentCount} agents bound to it are reconfigured immediately; open positions do not block the edit.`;
    const consequence =
      `Setting ${req.signalId} on "${summary.name}" to allocation ${intent.allocation}` +
      `${intent.required ? ', required' : ', not required'}` +
      `${intent.ruleParams !== undefined ? ', with its parameters as shown' : ''}. ${agents}`;

    const confirmationToken = this.random.token(32);
    await this.confirmations.issue({
      token: confirmationToken,
      userId: req.userId,
      tool: 'update_strategy_signal_rule',
      target: confirmationTarget.strategyRule(
        summary.id,
        summary.revision,
        req.signalId,
        intentRecord(intent),
      ),
      // Stored as shown, so the audit can prove what was agreed to rather
      // than what a later version of the copy happens to say.
      consequence,
      expiresAt: new Date(this.clock.now().getTime() + CONFIRMATION_TTL_SECONDS * 1000),
      consumedAt: null,
    });

    return {
      kind: 'proposal',
      proposal: {
        strategyId: summary.id,
        strategyName: summary.name,
        expectedRevision: summary.revision,
        signalId: req.signalId,
        current,
        intent,
        boundAgentCount: summary.boundAgentCount,
        consequence,
        confirmationToken,
      },
    };
  }
}

export interface RetuneRuleRequest {
  readonly userId: string;
  readonly accessToken: string;
  readonly strategyId: string;
  readonly signalId: string;
  readonly expectedRevision: number;
  readonly intent: RetuneIntent;
  readonly confirmationToken: string;
}

export type RetuneRuleResult =
  | { readonly kind: 'retuned' }
  | { readonly kind: 'refused'; readonly reason: string }
  /**
   * The account's authority is gone, not this operation refused. Carries the
   * sentence the failure built — which names the remedy belonging to *this*
   * deployment, so it must be shown rather than replaced by a redirect.
   */
  | { readonly kind: 'authority-lost'; readonly reason: string };

/**
 * Perform the retune.
 *
 * The target is recomputed from the submitted values — strategy, revision,
 * signal, and the values digest — so a tampered hidden field fails the
 * guard's match before the platform is asked (DL-1). The confirmation
 * itself is checked in the guard sequence, not here; the platform's
 * `expectedRevision` check stands behind both.
 */
export class RetuneRuleCommand {
  constructor(private readonly strategies: StrategiesPort) {}

  async execute(req: RetuneRuleRequest): Promise<RetuneRuleResult> {
    try {
      await this.strategies.updateSignalRule({
        userId: req.userId,
        accessToken: req.accessToken,
        strategyId: req.strategyId,
        expectedRevision: req.expectedRevision,
        signalId: req.signalId,
        allocation: req.intent.allocation,
        required: req.intent.required,
        ruleParams: req.intent.ruleParams,
        confirmation: {
          token: req.confirmationToken,
          target: confirmationTarget.strategyRule(
            req.strategyId,
            req.expectedRevision,
            req.signalId,
            intentRecord(req.intent),
          ),
        },
      });
      return { kind: 'retuned' };
    } catch (err) {
      // The reason returns to the surface acted from, in the platform's own
      // words — a revision CONFLICT, a parameter refusal, a guard refusal.
      return outcomeOf(err);
    }
  }
}
