/**
 * What a condition *did*, as opposed to what it says.
 *
 * `condition.ts` models the definition. This models the platform's answer for
 * that definition, resolved against live market state, per coin — the payload
 * `preview_strategy_report` returns as `conditionOutcomes` and this product had
 * been producing and discarding since the layer arrived.
 *
 * Shaped from the live capture of **2026-08-04** recorded in
 * `openspec/backlog/condition-outcomes-are-unrendered.md`. Nothing here is
 * modelled from the declared schema alone: the declaration also promises a
 * per-ticker `verdict` field that no capture this repo holds has ever shown, so
 * it is deliberately absent and filed as
 * `preview-per-ticker-verdict-is-unobserved` rather than guessed at.
 *
 * Nothing in this file resolves a condition. Every value below is carried from
 * the platform, and `Grid-Commander Never Decides Whether A Condition Holds`
 * makes that a requirement with a test — the columns these outcomes are
 * resolved against are market data this product does not hold, so a locally
 * computed answer would be a different claim wearing BattleGrid's authority.
 */

/**
 * One clause's reason, in the platform's own terms.
 *
 * `operand` is what the market actually showed; `literal` is what the condition
 * required. That pair is the single most useful thing on the payload — it
 * answers *why* a rule did not fire rather than only that it did not — and it
 * is carried as two strings rather than compared here, because comparing them
 * would be this product forming its own opinion about the outcome.
 */
export interface ClauseEvidence {
  readonly kind: 'clause';
  /** e.g. `includeRegimeContext`. */
  readonly sectionKey: string;
  /** e.g. `regTrend_now`. */
  readonly header: string;
  /** The platform's own operator word — `is`, `gt`, `between`, … */
  readonly op: string;
  /** What was observed, e.g. `ranging`. */
  readonly operand: string;
  /** What was required, e.g. `trending up`. */
  readonly literal: string;
  /** This clause's own outcome, as the platform worded it. */
  readonly outcome: string;
}

/**
 * An evidence entry in a form this product does not model.
 *
 * Not an error and not a silent drop, on the same reasoning as
 * `ConditionDefinition`'s `unrecognised`: the declared schema already carries a
 * second variant (`conditionRef`) that no capture has shown, and the grammar is
 * still being rolled out. An outcome explained by four entries must render four
 * entries, with the one nobody models reported rather than omitted — a reader
 * not told sees a shorter explanation than the one the platform gave.
 */
export interface UnmodelledEvidence {
  readonly kind: 'unmodelled';
  /** Kept even when the rest is not understood — it is still the platform's answer. */
  readonly outcome: string;
  /** Written for a reader on the preview page, not for a log. */
  readonly reason: string;
}

export type ConditionEvidence = ClauseEvidence | UnmodelledEvidence;

/**
 * A threshold group's tally.
 *
 * **`unresolvedCount` is a third state**, not a synonym for false: a member the
 * platform could not answer for at all, usually because the report does not
 * carry the column it reads. The declared schema gives no hint that it means
 * anything of the sort — it was found by calling — so nothing but the shape
 * here and the requirement above it stops a surface summing it into "did not
 * hold".
 *
 * No false count. It is derivable from the three numbers, and deriving it is
 * exactly the collapse this shape exists to prevent: the moment a surface has
 * one it will show two states where the platform reported three.
 */
export interface ConditionCounts {
  readonly trueCount: number;
  readonly total: number;
  readonly unresolvedCount: number;
}

/** One condition's resolution, on one coin. */
export interface ConditionOutcome {
  readonly conditionKey: string;
  readonly name: string;
  /**
   * The platform's own word — `TRUE`, `FALSE`, `UNRESOLVED` are the three the
   * schema declares today.
   *
   * Carried as a string rather than narrowed to those three. A union would have
   * to be widened after every deployment that adds a fourth, and until someone
   * noticed, the fourth would arrive as either a crash or a coercion into one
   * of the three — which is precisely how a three-state becomes a two-state.
   * The same reading `RuleMembership.status` and `SignalSummary.direction`
   * already take.
   */
  readonly outcome: string;
  /** The bar is not closed: this answer can still change before it settles. */
  readonly provisional: boolean;
  /** `null` is "not a threshold group", never "nothing held". */
  readonly counts: ConditionCounts | null;
  readonly evidence: readonly ConditionEvidence[];
}

/** Every condition's resolution, on one coin. */
export interface TickerOutcomes {
  readonly ticker: string;
  readonly outcomes: readonly ConditionOutcome[];
}

/**
 * The outcomes that have not settled yet.
 *
 * Computed here rather than in a view, for the same reason `buildingBlocks` is:
 * "four conditions resolved" and "two resolved, two still moving" are different
 * claims about a coin, and a page counting it itself would be a second
 * implementation of the distinction. This reads a flag the platform set; it
 * decides nothing.
 */
export function stillProvisional(
  outcomes: readonly ConditionOutcome[],
): readonly ConditionOutcome[] {
  return outcomes.filter((o) => o.provisional);
}

/** Whether any part of an outcome's explanation is a form this product does not model. */
export function hasUnmodelledEvidence(outcome: ConditionOutcome): boolean {
  return outcome.evidence.some((e) => e.kind === 'unmodelled');
}
