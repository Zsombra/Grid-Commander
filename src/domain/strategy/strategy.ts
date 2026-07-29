/**
 * A strategy, as the authoring rules need it.
 *
 * The field that matters most is `boundAgentCount`. A strategy is never an
 * isolated object in this product: changing one reconfigures every agent bound
 * to it, immediately, and the live account has one with five agents on it.
 * Carrying the count on the entity means no surface can present a strategy
 * without being able to say what it governs.
 */
export interface Strategy {
  readonly id: string;
  readonly name: string;
  readonly tagline: string | null;
  readonly description: string | null;
  readonly revision: number;
  readonly scope: StrategyScope;
  readonly timeframe: string;
  readonly isActive: boolean;
  /** The blast radius. Read from the platform, never counted here. See S-F. */
  readonly boundAgentCount: number;
  readonly forkedFromStrategyId: string | null;
}

export type StrategyScope = 'SYSTEM' | 'PRIVATE';

/**
 * How many more strategies this user may own.
 *
 * `list_strategies` returns it alongside the roster, the same way
 * `list_intelligence_agents` returns `slotUsage` (findings-strategies F-7).
 */
export interface StrategyQuota {
  readonly used: number;
  readonly limit: number;
  readonly remaining: number;
}

/**
 * A platform strategy cannot be edited — it is forked.
 *
 * Presenting a SYSTEM strategy as editable would offer an action the platform
 * refuses, which is the same mistake as the delete affordance in
 * `author-agents` (AL-2).
 */
export function isEditable(strategy: Strategy): boolean {
  return strategy.scope === 'PRIVATE' && strategy.isActive;
}

export function mustForkToEdit(strategy: Strategy): boolean {
  return strategy.scope === 'SYSTEM';
}

export function isArchivable(strategy: Strategy): boolean {
  return strategy.scope === 'PRIVATE' && strategy.isActive;
}

export function isRestorable(strategy: Strategy): boolean {
  return strategy.scope === 'PRIVATE' && !strategy.isActive;
}

export function hasCapacity(quota: StrategyQuota): boolean {
  return quota.remaining > 0;
}

/**
 * What editing this strategy would reach.
 *
 * Stated for zero as plainly as for five: "no agents are bound to this" is
 * information a user acts on, and leaving it out makes the warning's absence
 * ambiguous rather than reassuring.
 */
export function describeBlastRadius(count: number): string {
  if (count === 0) return 'No agents are bound to this strategy.';
  if (count === 1) return 'One agent is bound to this strategy and will be reconfigured immediately.';
  return `${count} agents are bound to this strategy and will all be reconfigured immediately.`;
}

/**
 * One context source a strategy reads.
 *
 * The roster carries a `sectionCount`. This is what the count was counting —
 * and until `get_strategy` was wired, the number was all the product had.
 */
export interface StrategySection {
  /** `platform` for a source BattleGrid provides. Carried as given, not enumerated. */
  readonly kind: string;
  /** e.g. `includeMovingAverages`. The identifier the platform uses. */
  readonly sectionKey: string;
}

/**
 * One signal, and how much it counts.
 *
 * A live strategy carries 82 of these. `allocation` is its weight, `required`
 * means the setup does not fire without it, and `params` is the signal's own
 * configuration — a threshold, a lookback — whose shape belongs to the signal
 * rather than to us. Carried opaque on purpose: inventing a union over 82
 * signals' parameters would be a second opinion on the platform's own schema.
 */
export interface SignalRule {
  readonly signalId: string;
  readonly allocation: number;
  readonly required: boolean;
  readonly params: Readonly<Record<string, unknown>>;
}

/**
 * A strategy, whole.
 *
 * Separate from `Strategy` rather than replacing it. The roster draws seventeen
 * rows and needs a name, a scope and a bound-agent count; it does not need 82
 * signal rules and a page of prose, and widening the summary would make every
 * list read pay for the detail page. `list_strategies` and `get_strategy` are
 * two different calls returning two different amounts, and the types say so.
 */
export interface StrategyDetail {
  readonly summary: Strategy;
  /** What it reads. */
  readonly sections: readonly StrategySection[];
  /** How it reasons — the instruction the model is given. */
  readonly marketReadText: string | null;
  /** When it acts. */
  readonly thresholds: StrategyThresholds;
  /** What it weighs. */
  readonly signalRules: readonly SignalRule[];
  /** Positions currently open under it. Part of the cost of changing it. */
  readonly openPositionCount: number;
  readonly cadence: string | null;
  readonly regimeAutoDerive: boolean;
  readonly regimeTimeframe: string | null;
}

export interface StrategyThresholds {
  readonly minAggregateScore: number | null;
  readonly minRequiredCount: number | null;
  readonly minAtrPct: number | null;
}

/**
 * The signals that must fire for the setup to trigger at all.
 *
 * Computed here rather than in a view: it is the difference between "82 signals"
 * and "82 signals, 3 of which are mandatory", and a surface that counted it
 * itself would be a second implementation of a rule.
 */
export function requiredSignals(detail: StrategyDetail): readonly SignalRule[] {
  return detail.signalRules.filter((r) => r.required);
}

/**
 * The signals carrying any weight at all.
 *
 * A rule with zero allocation is present and inert. Showing it beside the ones
 * that decide something would overstate what the strategy actually uses.
 */
export function weightedSignals(detail: StrategyDetail): readonly SignalRule[] {
  return detail.signalRules.filter((r) => r.allocation > 0);
}
