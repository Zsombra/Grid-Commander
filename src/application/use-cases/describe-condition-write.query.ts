import type { CompiledPlan } from '@/domain/strategy/compiled-plan.js';
import { compileConditionsIntent, postStateDrift } from '@/domain/strategy/compiled-plan.js';
import type { ConditionEdit, EditStanding } from '@/domain/strategy/condition-write.js';
import { listedKeys, resolveConditionEdit } from '@/domain/strategy/condition-write.js';
import type { ConditionVerdict, StrategyCondition } from '@/domain/strategy/condition.js';
import { describeBlastRadius, type Strategy } from '@/domain/strategy/strategy.js';
import type { BattlegridSubject } from '@/domain/connection/subject.js';
import type { StrategiesPort } from '@/ports/strategies.js';
import type { FailureCause } from '@/ports/failure.js';
import type { DescribeApplyQuery } from './apply-plan.command.js';
import type { CompilePlanCommand } from './compile-plan.command.js';

/**
 * Saving a condition: the describe, and everything it has to say that the
 * scorecard's describe does not.
 *
 * `TryConditionQuery` asks BattleGrid to resolve a condition that does not
 * exist. This asks it to compile the strategy that *would* carry it — a read,
 * annotated `readOnlyHint: true`, which writes nothing and answers with the
 * post-state it would save. Applying that plan is a separate act on a separate
 * request, performed by `ApplyPlanCommand` through the ordinary ceremony.
 *
 * **There is no per-condition tool.** All 110 probed tools, 2026-08-06: nothing
 * writes a condition. So this compiles an UPDATE carrying the strategy's *whole*
 * condition list, and every consequence follows from that — the describe states
 * what the entire list would become, which conditions would be left referring to
 * something nobody defines, and how many agents the apply reconfigures.
 *
 * **It mints nothing itself.** The confirmation is issued by `DescribeApplyQuery`,
 * the one place this pipeline's token is bound (`strategyPlan(strategyId,
 * intentDigest)` — the compiler's own digest, carried on the plan). Minting here
 * would be a second binding for one act, and the two would disagree the first
 * time either changed. What this adds is the *material*: the sentences an
 * operator must read are handed to that query as the addendum, so the token is
 * issued against the whole text and the audit can prove what was on screen.
 */

/** What the surface asked for, before the strategy has been read. */
export type ConditionEditRequest =
  | { readonly kind: 'compose'; readonly condition: StrategyCondition }
  /**
   * Seeded from a condition the strategy carries, at whatever depth it has.
   *
   * The same arm `TryConditionQuery` takes, and resolved the same way: the
   * definition travels whole and the identity is the operator's. Without it, a
   * draft seeded from a deeply nested condition could be tried and never saved
   * — the composer builds one level of grouping and the grammar nests to 64.
   */
  | {
      readonly kind: 'from-existing';
      readonly sourceKey: string;
      readonly conditionKey: string | null;
      readonly name: string | null;
      readonly verdict: ConditionVerdict;
    }
  | { readonly kind: 'remove'; readonly conditionKey: string };

export interface DescribeConditionWriteRequest {
  readonly userId: string;
  /** BattleGrid's identity for the acting account; `null` when unknown. */
  readonly battlegridSubject: BattlegridSubject | null;
  readonly accessToken: string;
  readonly strategyId: string;
  /** `null` opens the surface on the strategy's list without compiling anything. */
  readonly edit: ConditionEditRequest | null;
}

export interface ConditionWriteProposal {
  readonly strategyId: string;
  readonly strategyName: string;
  /** The revision the describe compiled against. */
  readonly expectedRevision: number;
  readonly conditionKey: string;
  readonly standing: EditStanding;
  /** What the whole list would become — the thing actually being agreed to. */
  readonly listKeys: readonly (string | null)[];
  readonly dangling: readonly string[];
  readonly boundAgentCount: number | null;
  /** Carried to the perform unchanged: what is applied is what was reviewed. */
  readonly plan: CompiledPlan;
  /** The text the confirmation was issued against, whole. */
  readonly consequence: string;
  readonly confirmationToken: string;
}

/** What the surface can always draw, whatever the edit did. */
interface Listing {
  readonly strategy: Strategy;
  readonly existing: readonly StrategyCondition[];
}

export type DescribeConditionWriteResult =
  | ({ readonly kind: 'listing' } & Listing)
  | ({ readonly kind: 'proposal'; readonly proposal: ConditionWriteProposal } & Listing)
  /** A removal naming a condition the strategy does not define. */
  | ({ readonly kind: 'no-such-condition'; readonly conditionKey: string } & Listing)
  /** The draft carries a form this product will not write back. Ours to say. */
  | ({ readonly kind: 'inexpressible'; readonly reasons: readonly string[] } & Listing)
  /**
   * The compiler's post-state moved something this write never offered to change.
   *
   * Its own outcome rather than a refusal, because the two have different
   * causes and different next steps: a refusal is BattleGrid declining the
   * change, and this is BattleGrid accepting a *different* change from the one
   * that was submitted. Nothing was written — a compile writes nothing — so
   * this is the cheapest possible place to find out.
   */
  | ({ readonly kind: 'drift'; readonly reasons: readonly string[] } & Listing)
  /** The platform's own words: a compiler rejection, or a plan that cannot be applied. */
  | ({ readonly kind: 'refused'; readonly reason: string } & Listing)
  | { readonly kind: 'strategy-missing' }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

export class DescribeConditionWriteQuery {
  constructor(
    private readonly strategies: StrategiesPort,
    /**
     * The compile, as a use case rather than a bare port call.
     *
     * It is the one place the plan's `intentDigest` is computed, and that digest
     * is what the confirmation binds. Reaching past it to `compilePlan` and
     * digesting the request here would be a second opinion on which bytes are
     * the intent — the exact defect `confirmation-binds-values.test.ts` records
     * as the fifth dead write path, in its other direction.
     */
    private readonly compile: CompilePlanCommand,
    /**
     * The apply describe, injected rather than reimplemented. It holds every
     * check this write needs and did not invent — the intent digest still
     * matching the plan, viability, the plan token's expiry and account, and
     * the requirement that BattleGrid described the operation in its own words.
     */
    private readonly describeApply: DescribeApplyQuery,
  ) {}

  async execute(req: DescribeConditionWriteRequest): Promise<DescribeConditionWriteResult> {
    // Read fresh on every attempt. The list is submitted whole, so a stale copy
    // would resubmit conditions as they were rather than as they are — an edit
    // to one condition silently reverting another.
    const read = await this.strategies.readStrategy(req);
    if (read.kind === 'missing') return { kind: 'strategy-missing' };
    if (read.kind === 'unreadable') {
      return { kind: 'unreadable', reason: read.reason, cause: read.cause };
    }

    const { detail } = read;
    const listing: Listing = { strategy: detail.summary, existing: detail.conditions };
    if (req.edit === null) return { kind: 'listing', ...listing };

    const seeded = resolve(req.edit, detail.conditions);
    if (seeded.kind === 'no-such-condition') {
      return { kind: 'no-such-condition', conditionKey: seeded.conditionKey, ...listing };
    }
    const { edit } = seeded;

    const resolved = resolveConditionEdit(detail.conditions, read.conditionsAsGiven, edit);
    if (resolved.kind === 'inexpressible') {
      return { kind: 'inexpressible', reasons: resolved.reasons, ...listing };
    }
    if (resolved.kind === 'no-such-condition') {
      return { kind: 'no-such-condition', conditionKey: resolved.conditionKey, ...listing };
    }

    const { change } = resolved;
    const key = edit.kind === 'remove' ? edit.conditionKey : edit.condition.conditionKey;
    const summary = detail.summary;
    const intent = compileConditionsIntent({
      strategyId: summary.id,
      expectedRevision: summary.revision,
      intentSummary: intentSummary(change.standing, key, summary.name),
      assumptions: ['Only the condition list changes'],
      conditions: change.conditions,
    });

    const compiled = await this.compile.execute({
      userId: req.userId,
      accessToken: req.accessToken,
      request: intent,
    });
    if (compiled.kind === 'rejected') {
      return { kind: 'refused', reason: compiled.reason, ...listing };
    }

    const keys = listedKeys(change.conditions);
    const plan: CompiledPlan = compiled.review.plan;
    // The compiler's own account of what it would save, read back before anyone
    // is asked to agree. This is what turns "an omitted field is preserved"
    // from a finding into a check that runs every time.
    const drift = postStateDrift(plan.approvedPlan, {
      conditionKeys: keys,
      tagline: summary.tagline,
      sectionKeys: detail.sections.map((s) => s.sectionKey),
    });
    if (drift.length > 0) return { kind: 'drift', reasons: drift, ...listing };

    const count = compiled.review.boundAgentCount;
    const described = await this.describeApply.execute({
      userId: req.userId,
      battlegridSubject: req.battlegridSubject,
      accessToken: req.accessToken,
      strategyId: summary.id,
      plan,
      currentIntent: intent,
      currentRevision: summary.revision,
      addendum: addendum({
        strategyName: summary.name,
        standing: change.standing,
        conditionKey: key,
        keys,
        dangling: change.dangling,
        // Stated from the strategy as read only when the plan carried no count
        // of its own. Two counts for one act would read as two facts, and the
        // platform's is the authoritative one; silence when it is absent would
        // be the one thing worse than either.
        boundAgentCount: count === null ? summary.boundAgentCount : null,
      }),
    });
    if (described.kind === 'refused') {
      return { kind: 'refused', reason: described.reason, ...listing };
    }

    return {
      kind: 'proposal',
      proposal: {
        strategyId: summary.id,
        strategyName: summary.name,
        expectedRevision: summary.revision,
        conditionKey: key,
        standing: change.standing,
        listKeys: keys,
        dangling: change.dangling,
        boundAgentCount: count,
        plan,
        consequence: described.proposal.consequence,
        confirmationToken: described.proposal.confirmationToken,
      },
      ...listing,
    };
  }
}

/**
 * The seeded arm resolved against the strategy, or `null` when its source is gone.
 *
 * Exactly `TryConditionQuery`'s resolution: the definition whole, the identity
 * from the form. A draft that could be tried under a new key must be savable
 * under it too, or the deep conditions — the ones worth asking about — would be
 * the ones that could never be authored.
 */
function resolve(
  wanted: ConditionEditRequest,
  existing: readonly StrategyCondition[],
):
  | { readonly kind: 'edit'; readonly edit: ConditionEdit }
  | { readonly kind: 'no-such-condition'; readonly conditionKey: string } {
  if (wanted.kind === 'compose') {
    return { kind: 'edit', edit: { kind: 'upsert', condition: wanted.condition } };
  }
  if (wanted.kind === 'remove') {
    return { kind: 'edit', edit: { kind: 'remove', conditionKey: wanted.conditionKey } };
  }
  const source = existing.find((c) => c.conditionKey === wanted.sourceKey);
  if (!source) return { kind: 'no-such-condition', conditionKey: wanted.sourceKey };
  return {
    kind: 'edit',
    edit: {
      kind: 'upsert',
      condition: {
        definition: source.definition,
        conditionKey: wanted.conditionKey ?? source.conditionKey,
        name: wanted.name ?? source.name,
        verdict: wanted.verdict,
      },
    },
  };
}

function intentSummary(standing: EditStanding, key: string, strategyName: string): string {
  if (standing === 'removed') return `Remove the condition ${key} from ${strategyName}`;
  if (standing === 'replaced') return `Change the condition ${key} on ${strategyName}`;
  return `Add the condition ${key} to ${strategyName}`;
}

/**
 * What this write says that the scorecard's describe does not have to.
 *
 * Three sentences, one per fact the platform's own summary cannot carry,
 * because the platform is describing a plan and these are about the list:
 * what the strategy would be left defining, what would be left dangling, and —
 * only when the plan itself named none — how many agents are bound.
 *
 * Composed as the text that is stored with the token, not merely rendered.
 * A warning an operator was shown and the audit cannot prove is a warning
 * nobody can be held to.
 */
function addendum(input: {
  readonly strategyName: string;
  readonly standing: EditStanding;
  readonly conditionKey: string;
  readonly keys: readonly (string | null)[];
  readonly dangling: readonly string[];
  readonly boundAgentCount: number | null;
}): string {
  const named = input.keys.map((k) => k ?? '(an entry with no key)');
  const act =
    input.standing === 'removed'
      ? `${input.conditionKey} is removed.`
      : input.standing === 'replaced'
        ? `${input.conditionKey} stands in place of the condition of that key.`
        : `${input.conditionKey} is added.`;
  const list =
    named.length === 0
      ? `"${input.strategyName}" would be left defining no conditions at all.`
      : `"${input.strategyName}" would be left defining ${named.length} condition(s): ${named.join(', ')}.`;
  const whole =
    'BattleGrid takes the condition list whole — there is no tool that writes one ' +
    'condition — so every condition named above is resubmitted, not only the one ' +
    'being changed.';
  const parts = [`${act} ${list}`, whole];
  if (input.dangling.length > 0) {
    parts.push(
      `After this, ${input.dangling.join(', ')} would be referred to by a condition in ` +
        'the list and defined by none of them, leaving a rule nobody can evaluate.',
    );
  }
  if (input.boundAgentCount !== null) {
    parts.push(
      `BattleGrid's plan states no blast radius; this strategy as read: ${describeBlastRadius(input.boundAgentCount)}`,
    );
  }
  return parts.join('\n\n');
}
