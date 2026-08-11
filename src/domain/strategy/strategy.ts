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

/**
 * Whether a private copy is how this strategy changes, and whether one can be
 * made right now.
 *
 * A union rather than a boolean and a reason string, because the invariant is
 * the point: something offered has nothing to explain, and something withheld
 * always does. Two fields could hold both at once, and the surface would have to
 * be trusted not to.
 */
export type ForkAffordance =
  /** Editable directly — a copy is not how this one changes. */
  | { readonly kind: 'not-needed' }
  | { readonly kind: 'offered' }
  /** Platform-owned, and there is no room. `because` goes where the control was. */
  | { readonly kind: 'withheld'; readonly because: string };

/**
 * A control that cannot work is not offered, and its absence is explained.
 *
 * The rule this product already applies to a delete button it never built and to
 * a rename input it stopped rendering (AL-2). The strategy roster broke it twelve
 * times on one screen, directly beneath a sentence stating the constraint that
 * made every one of them impossible: `fork_strategy` answers
 * `VALIDATION_ERROR: "Strategy limit reached — you can have at most 25 active
 * strategies."`
 *
 * **Unknown is not at-capacity.** `quota` is `null` when the platform reported
 * none, and withholding a working control on a fact we do not have is the
 * opposite mistake — the fork page refuses honestly if BattleGrid declines. Only
 * a counted refusal withholds anything.
 */
export function forkAffordance(
  strategy: Strategy,
  quota: StrategyQuota | null,
): ForkAffordance {
  if (!mustForkToEdit(strategy)) return { kind: 'not-needed' };
  if (quota === null || hasCapacity(quota)) return { kind: 'offered' };
  // Said where the control would have been. A control that simply vanishes reads
  // as the page forgetting rather than refusing, and the roster's own top-level
  // sentence says what to do about it — this says why *this row* lost its action.
  return { kind: 'withheld', because: `No room for a copy — you own all ${quota.limit}.` };
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
import type { StrategyCondition } from './condition.js';

export interface StrategySection {
  /** `platform` for a source BattleGrid provides. Carried as given, not enumerated. */
  readonly kind: string;
  /** e.g. `includeMovingAverages`. The identifier the platform uses. */
  readonly sectionKey: string;
  /**
   * A custom table's own definition, carried whole because the platform
   * demands it back whole.
   *
   * A platform section is fully named by its key, but a custom one is not:
   * `preview_strategy_report` rejects `{kind:'custom', sectionKey}` and
   * requires the self-contained `title` + `columns` (live, 2026-08-01 —
   * which is how the preview surface came to refuse every strategy holding
   * a custom table). The columns stay opaque here: their grammar belongs to
   * the platform's column contract, not to this domain.
   */
  readonly title?: string | undefined;
  readonly timeframe?: string | undefined;
  readonly columns?: readonly Readonly<Record<string, unknown>>[] | undefined;
}

/**
 * One section the platform's vocabulary advertises.
 *
 * Two variants, discriminated by which key is present:
 * - `platform` — a named section (e.g. `includeRsi`) the platform provides natively.
 * - `custom` — a composite template (e.g. `momentum-composite`) that bundles several sections.
 *
 * Both are discovered at runtime from `list_strategy_vocabulary`. Neither is
 * enumerated in Grid-Commander — the platform's list is the list.
 */
export type SectionTemplate =
  | {
      readonly kind: 'platform';
      readonly sectionKey: string;
      readonly label: string;
      /** Category this template belongs to, as reported by the platform. Optional — absent templates are ungrouped. */
      readonly category?: string | undefined;
      readonly columns?: TemplateColumns;
    }
  | {
      readonly kind: 'custom';
      readonly templateKey: string;
      readonly label: string;
      readonly category?: string | undefined;
      readonly columns?: TemplateColumns;
    };

/**
 * The columns a template renders, exactly as the platform declared them.
 *
 * Opaque here for the same reason `StrategySection.columns` is: the column
 * grammar belongs to the platform's column contract, which closes it to ten
 * keys and has already widened by two in a single deployment (`bars`,
 * `ordering`). A domain shape enumerating them would be a second opinion on a
 * schema this product does not own, and the layer that needs the parts reads
 * them where it can also say which ones it did not recognise.
 *
 * Absent means the platform's entry published none — which is not the same as a
 * template that renders nothing, and the surfaces keep the two apart.
 */
export type TemplateColumns = readonly Readonly<Record<string, unknown>>[] | undefined;

/**
 * One signal, and how much it counts.
 *
 * A live strategy carries one per platform signal — 84 on v9.0.0, and the
 * number is the platform's to change. `allocation` is its weight, `required`
 * means the setup does not fire without it, and `params` is the signal's own
 * configuration — a threshold, a lookback — whose shape belongs to the signal
 * rather than to us. Carried opaque on purpose: inventing a union over every
 * signal's parameters would be a second opinion on the platform's own schema —
 * which is why v9 adding `threshold` to a rule's params needed no change here.
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
 * rows and needs a name, a scope and a bound-agent count; it does not need every
 * signal rule and a page of prose, and widening the summary would make every
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
  /** What governs its trades — stop bounds and risk:reward floor. */
  readonly tradeLevelPolicy: TradeLevelPolicy | null;
  /** What it weighs. */
  readonly signalRules: readonly SignalRule[];
  /**
   * What decides direction, above the signals.
   *
   * Empty is a strategy that defines none. A strategy that could not be read
   * never reaches here at all — `StrategyDetailResult` carries that state —
   * so an empty list here means empty rather than unknown.
   */
  readonly conditions: readonly StrategyCondition[];
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
 * The stop-loss bounds and risk:reward floor that govern a strategy's trades.
 *
 * Moved from the agent's `tradingConfig` onto the strategy at BattleGrid v15.
 * The compiler declares these fields but does not yet process changes to them,
 * so the entire fleet is pinned to whatever the platform set — which is why
 * this type is read-only and the detail page offers no editing control.
 */
export interface TradeLevelPolicy {
  readonly maxStopLossPct: number;
  readonly minStopLossAtrMultiple: number;
  readonly minRiskRewardRatio: number;
}

/**
 * The signals that must fire for the setup to trigger at all.
 *
 * Computed here rather than in a view: it is the difference between "every signal"
 * and "every signal, 3 of which are mandatory", and a surface that counted it
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
