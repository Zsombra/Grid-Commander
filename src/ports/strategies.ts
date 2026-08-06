import type {
  SectionTemplate,
  Strategy,
  StrategyDetail,
  StrategyQuota,
  StrategySection,
} from '@/domain/strategy/strategy.js';
import type { Confirmation } from '@/domain/capability/confirmation.js';
import type { TickerOutcomes } from '@/domain/strategy/condition-outcome.js';
import type { FailureCause } from './failure.js';

/**
 * Everything the product does with strategies.
 *
 * Note what compiling and applying are: two methods, not one with a flag.
 * `compilePlan` writes nothing and `applyPlan` writes to every bound agent at
 * once, and a boolean between them would be one typo away from the wrong one.
 */
export interface StrategiesPort {
  listStrategies(params: { userId: string; accessToken: string }): Promise<StrategyListResult>;

  /** Writes nothing. Returns what applying *would* do. */
  compilePlan(params: {
    userId: string;
    accessToken: string;
    request: Readonly<Record<string, unknown>>;
  }): Promise<CompileResult>;

  /**
   * Writes, destructively, to the strategy and every agent bound to it.
   *
   * `plan` must be the projection of the compiled `approvedPlan` — see
   * `toApplyPlan`. Passing `approvedPlan` itself is an unknown-key error.
   */
  applyPlan(params: {
    userId: string;
    accessToken: string;
    strategyId: string;
    plan: Readonly<Record<string, unknown>>;
    planToken: string;
    confirmation: Confirmation;
  }): Promise<Readonly<Record<string, unknown>>>;

  forkStrategy(params: {
    userId: string;
    accessToken: string;
    strategyId: string;
    sourceRevision: number;
  }): Promise<Strategy>;

  /**
   * One strategy, whole.
   *
   * Distinct from `listStrategies` because they are two different calls
   * returning two different amounts — see `StrategyDetail`.
   */
  readStrategy(params: {
    userId: string;
    accessToken: string;
    strategyId: string;
  }): Promise<StrategyDetailResult>;

  setActive(params: {
    userId: string;
    accessToken: string;
    strategyId: string;
    /** The revision the intent was formed against. BattleGrid requires it. */
    expectedRevision: number;
    active: boolean;
    confirmation?: Confirmation | undefined;
  }): Promise<LifecycleResult>;

  /**
   * Change one signal rule's allocation, Required flag, and declared strict
   * parameters. Destructive on the platform's own annotation: the change
   * propagates to every bound agent immediately and open positions do not
   * block it — which is why it only ever runs with a confirmation. The
   * response passes through opaque; its shape has not been observed live.
   */
  updateSignalRule(params: {
    userId: string;
    accessToken: string;
    strategyId: string;
    /** The revision the describe read. BattleGrid refuses a stale one. */
    expectedRevision: number;
    signalId: string;
    allocation: number;
    required: boolean;
    ruleParams?: Readonly<Record<string, unknown>> | undefined;
    confirmation: Confirmation;
  }): Promise<Readonly<Record<string, unknown>>>;

  readVocabulary(params: { userId: string; accessToken: string }): Promise<VocabularyResult>;

  /**
   * All section templates the platform's vocabulary advertises.
   *
   * A single call returns the full list regardless of which category is passed.
   * The adapter handles that detail — the use case sees one call.
   */
  listVocabularyTemplates(params: { userId: string; accessToken: string }): Promise<VocabularyTemplatesResult>;

  /**
   * Render a draft composition as the report text an agent would receive,
   * over a bounded live coin selection — saving nothing, changing nothing.
   * A platform refusal of the draft is a result here, in its words.
   */
  previewReport(params: {
    userId: string;
    accessToken: string;
    timeframe: string;
    regimeAutoDerive: boolean;
    regimeTimeframe?: string | null | undefined;
    sections: readonly StrategySection[];
    coinSelection: CoinSelection;
    /**
     * The strategy's conditions, as the platform sent them.
     *
     * Optional, and the reason the surface has been receiving an empty
     * `conditionOutcomes` since the condition layer arrived: the tool resolves
     * only what it is given and takes no strategy id, so a preview that sends
     * nothing gets nothing back. Passed straight through — see
     * `StrategyDetail.conditionsAsGiven` for why they are not rebuilt here.
     */
    conditions?: readonly Readonly<Record<string, unknown>>[] | undefined;
  }): Promise<ReportPreviewOutcome>;

  /**
   * Which signals a draft composition can feed — per-signal membership,
   * status, and the platform's default allocation. Reads no persisted
   * strategy; writes nothing.
   */
  deriveRuleView(params: {
    userId: string;
    accessToken: string;
    sections: readonly StrategySection[];
  }): Promise<readonly RuleMembership[]>;

  /**
   * What a set of signal weightings would score — stateless, saves nothing.
   *
   * Verified against five real evaluations on 2026-08-03: fed each one's
   * triggered signals and effective allocations with its own gate, the
   * returned aggregate matched the platform's own `aggregateScore` to its
   * rounding, and the attribution percentages matched signal-for-signal.
   * This is the pipeline's arithmetic exposed, not an approximation of it.
   *
   * The platform caps `signals` at twenty and **refuses** twenty-one rather
   * than truncating, so callers check before asking. Allocation 0 means the
   * signal contributes nothing.
   */
  simulateAggregate(params: {
    userId: string;
    accessToken: string;
    signals: readonly SimulationSignal[];
    gate: number;
  }): Promise<SimulationResult>;

  /**
   * The vocabulary's full metric index. Read fresh each time — the metric
   * list is platform vocabulary and goes stale after a deployment like
   * everything else.
   */
  listMetrics(params: { userId: string; accessToken: string }): Promise<MetricListResult>;

  /**
   * One metric's transform-authoring detail. Callers establish the key
   * exists via `listMetrics` first — the platform enum-rejects unknown keys.
   */
  metricHints(params: {
    userId: string;
    accessToken: string;
    metric: string;
  }): Promise<MetricHints>;

  /**
   * Compile a candidate column against the platform's contract — a read;
   * no market values, no writes. A refusal is a *result* here: the
   * validator's structured teaching is the surface's content, not a failure.
   */
  columnContract(params: {
    userId: string;
    accessToken: string;
    column: ColumnProposal;
  }): Promise<ColumnCheckOutcome>;

  /**
   * Every strategy signal the platform publishes, as compact summaries.
   * Read fresh each time — the signal list is platform vocabulary and goes
   * stale after a deployment like everything else.
   */
  listSignals(params: { userId: string; accessToken: string }): Promise<SignalListResult>;

  /**
   * One signal's full authoring definition. Callers establish the id exists
   * via `listSignals` first — the platform enum-rejects unknown ids, and a
   * refusal here is a read failure to surface, not a "no such signal".
   */
  signalDefinition(params: {
    userId: string;
    accessToken: string;
    signalId: string;
  }): Promise<SignalDefinition>;
}

/**
 * Why there is no strategy to show.
 *
 * `missing` and `unreadable` are separate for the same reason `empty` and
 * `unreadable` are separate on a roster: one says the thing is not there, the
 * other says we could not ask. Telling a user their strategy is gone when the
 * platform merely refused is the mistake this codebase has already made once,
 * one layer down.
 */
export type StrategyDetailResult =
  | {
      readonly kind: 'strategy';
      readonly detail: StrategyDetail;
      /**
       * The strategy's conditions exactly as the platform sent them, carried
       * whole because the platform needs them back whole.
       *
       * `preview_strategy_report` resolves only the conditions it is given, so
       * asking how a strategy's rules stand against live coins means sending
       * them — and sending them re-serialised out of `detail.conditions` would
       * drop whatever the mapper read as `unrecognised`. The grammar is still
       * being rolled out (eight platform strategies gained conditions across a
       * single deployment), so "nothing is unrecognised today" is not a
       * property to build a round trip on. Same reasoning as
       * `StrategySection.columns`, which the preview already sends back whole.
       *
       * On the *result* rather than on `StrategyDetail`, deliberately. This is
       * plumbing for one call, not part of what a strategy is: putting it on
       * the entity would have shipped a byte-identical second condition list to
       * every model calling `read_strategy`, which reads as two answers to one
       * question.
       */
      readonly conditionsAsGiven: readonly Readonly<Record<string, unknown>>[];
    }
  | { readonly kind: 'missing' }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

/**
 * Three outcomes, and the middle one is why this is a type rather than a length
 * check.
 *
 * An account with no strategies and an account whose catalog failed to load look
 * identical as blank space, and telling the second user they own nothing is how
 * someone recreates work they already have. `RosterResult` and `JournalResult`
 * both carry this distinction already; this one did not, and a component
 * branching on `strategies.length === 0` would have made it a convention that
 * each surface has to remember rather than something the type enforces.
 *
 * `empty` carries no quota, deliberately. A quota is meaningful against the
 * strategies you own, and an empty catalog owns none — unlike `RosterResult`'s
 * `empty`, which keeps `slots` because an account with no agents still has a
 * capacity worth showing.
 */
export type StrategyListResult =
  | {
      readonly kind: 'strategies';
      readonly strategies: readonly Strategy[];
      readonly quota: StrategyQuota | null;
    }
  | { readonly kind: 'empty' }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

export type CompileResult =
  | {
      readonly kind: 'compiled';
      readonly approvedPlan: Readonly<Record<string, unknown>>;
      readonly reviewContext: Readonly<Record<string, unknown>>;
      readonly planToken: string;
    }
  /** The compiler refused the request itself — bad vocabulary, nothing to change. */
  | { readonly kind: 'rejected'; readonly reason: string };

/**
 * Restoring can come back needing repair.
 *
 * A distinct case rather than an error: the strategy stays inactive and the way
 * forward is the RESTORE arm of the compile pipeline, which is something the
 * user can do — so telling them it "failed" would be both wrong and unhelpful.
 */
export type LifecycleResult =
  | { readonly kind: 'changed'; readonly strategy: Strategy }
  | { readonly kind: 'repair-required'; readonly reason: string }
  /**
   * The platform said no, with its reason — a revision that moved, a refusal
   * code. Its own case because the alternative was observed: a thrown
   * refusal crashed the server action, and the page's `?problem=` arm only
   * ever received the command's own pre-checks.
   */
  | { readonly kind: 'refused'; readonly reason: string };

export interface VocabularyCategory {
  readonly category: string;
  readonly label: string;
  readonly purpose: string;
  readonly metricCount: number;
  /** Guidance fields from the platform — optional, surfaces in UI as tooltips or help copy. */
  readonly whenToUse?: string | undefined;
  readonly bestPractices?: string | undefined;
  readonly commonMisuses?: string | undefined;
  readonly examples?: string | undefined;
}

export type VocabularyResult =
  | { readonly kind: 'vocabulary'; readonly categories: readonly VocabularyCategory[] }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

/**
 * The ceilings a preview runs under, as the platform publishes them.
 *
 * New in BattleGrid v9.0.0. `preview_strategy_report` used to carry its own
 * limits and now says they are "served by discovery, not by this result" — so
 * they arrive on `list_strategy_vocabulary`, in the same payload the section
 * templates come from.
 *
 * `null` when the platform does not publish them. Not defaulted: a ceiling
 * this product invented would be shown to an author as the platform's, and a
 * guessed limit is worse than an absent one — they would compose against it.
 */
export interface PreviewLimits {
  /** How large a rendered preview may be before the platform refuses it. */
  readonly maxResultBytes: number;
  /** How long the platform will spend rendering one. */
  readonly deadlineMs: number;
}

export type VocabularyTemplatesResult =
  | {
      readonly kind: 'templates';
      readonly templates: readonly SectionTemplate[];
      /** Free — the same payload the templates came from already carries it. */
      readonly limits: PreviewLimits | null;
    }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

/**
 * One metric as the vocabulary's index lists it — shaped from the live
 * `list_strategy_vocabulary` payload of 2026-08-01, whose `metrics` key this
 * product had been dropping.
 */
export interface MetricSummary {
  readonly id: string;
  readonly label: string;
  readonly family: string;
  readonly unit: string | null;
  readonly precision: number | null;
  /** Declared only for bounded outputs (oscillators); null is "unbounded". */
  readonly range: readonly [number, number] | null;
  readonly timeframeMode: string | null;
  readonly transformIds: readonly string[];
}

export type MetricListResult =
  | { readonly kind: 'metrics'; readonly metrics: readonly MetricSummary[] }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

export interface TransformParameter {
  readonly key: string;
  readonly required: boolean;
  /** Rendered as declared — defaults arrive as numbers or words. */
  readonly defaultValue: string | null;
  readonly description: string | null;
}

/** One transform's authoring detail, in the platform's words. */
export interface MetricTransform {
  readonly id: string;
  readonly label: string;
  readonly parameters: readonly TransformParameter[];
  readonly calculationSummary: string | null;
  readonly formula: string | null;
  readonly nullBehavior: string | null;
  readonly operandRequired: boolean;
  readonly chainSuccessors: readonly string[];
}

export interface MetricHints {
  readonly summary: MetricSummary;
  readonly transforms: readonly MetricTransform[];
}

/** A candidate column as the check form composes it. */
export interface ColumnProposal {
  readonly metric: string;
  readonly transformId: string;
  readonly chainedTransformId?: string | undefined;
  readonly timeframe: { readonly rel: string } | { readonly abs: string };
  readonly window?: number | undefined;
  readonly offset?: number | undefined;
  readonly side?: string | undefined;
  /** Operand metric keys, in order. */
  readonly inputs?: readonly string[] | undefined;
  readonly bars?: string | undefined;
  readonly ordering?: string | undefined;
}

export interface ColumnOutput {
  readonly header: string;
  readonly meaning: string | null;
  readonly unit: string | null;
  readonly nullable: boolean;
}

/** What a valid column compiles to — the platform's own contract for it. */
export interface ColumnContract {
  readonly formula: string | null;
  readonly calculationSummary: string | null;
  readonly nullBehavior: string | null;
  readonly nullSentinel: string | null;
  readonly outputs: readonly ColumnOutput[];
  /** As normalized by the platform — rendered verbatim, key by key. */
  readonly effectiveParameters: Readonly<Record<string, unknown>>;
  readonly requiresSectionTimeframe: boolean;
}

/**
 * A refusal that teaches. The platform's column validator names the
 * offending path, the value it received, and — for enum-domain refusals —
 * exactly what is legal in its place. Flattening this to "invalid" would
 * discard the most instructive dataset the authoring surface has.
 */
export interface ColumnRefusal {
  readonly message: string;
  readonly authoringCode: string | null;
  readonly path: readonly (string | number)[];
  readonly received: string | null;
  readonly allowedValues: readonly string[];
  readonly allowedRule: string | null;
}

export type ColumnCheckOutcome =
  | { readonly kind: 'contract'; readonly contract: ColumnContract }
  | { readonly kind: 'refused'; readonly refusal: ColumnRefusal };

/** How a preview bounds its live coin selection — the platform's two modes. */
export type CoinSelection =
  | { readonly mode: 'ranked'; readonly limit: number; readonly category?: string | undefined }
  | { readonly mode: 'explicit'; readonly tickers: readonly string[] };

export interface RenderedSection {
  readonly sectionKey: string;
  readonly title: string;
  /** The literal report text an agent would receive. The platform's words. */
  readonly text: string;
}

export interface BudgetGauge {
  readonly name: string;
  readonly used: number;
  readonly cap: number;
}

/**
 * What `preview_strategy_report` renders — shaped live 2026-08-01, reshaped
 * against v9.0.0 on 2026-08-06.
 *
 * **`estimatedTokenCount` is deliberately absent.** v9 stopped returning it and
 * moved the number into `budget` as a used/cap gauge named `estimatedTokens` —
 * its own description says so. Until then this carried the standalone field and
 * mapped it to `null` forever, so the preview page reported "Token estimate
 * unavailable" directly above `estimatedTokens: 1767 of 16000`.
 *
 * Not reconstructed from the gauge. The gauge is the better shape — a bare
 * count cannot say how close to the cap it is — and rebuilding the old one
 * would model a payload the platform no longer sends, which is this project's
 * most expensive recurring mistake.
 */
export interface ReportPreview {
  readonly sections: readonly RenderedSection[];
  /** How the platform counted, for the budget note. Still returned by v9. */
  readonly tokenCountModel: string | null;
  readonly budget: readonly BudgetGauge[];
  /**
   * How the strategy's conditions stand, per coin — the platform resolving each
   * one against the same live market state the report above was rendered from.
   *
   * Empty when no conditions were sent to resolve, which is every preview this
   * product made before the argument existed.
   */
  readonly conditionOutcomes: readonly TickerOutcomes[];
}

export type ReportPreviewOutcome =
  | { readonly kind: 'preview'; readonly preview: ReportPreview }
  /** The platform refused the draft — its words are the content. */
  | { readonly kind: 'refused'; readonly reason: string };

/** One signal's membership against a draft — from `derive_strategy_rule_view`. */
export interface RuleMembership {
  readonly signalId: string;
  readonly inReport: boolean;
  readonly status: string;
  readonly defaultAllocation: number | null;
}

/** One signal as the library lists it — shaped from the live payload of 2026-08-01. */
export interface SignalSummary {
  readonly id: string;
  /** Platform module key, e.g. `RSI`, `PRICE_STRUCTURE`. The grouping axis. */
  readonly module: string;
  /** `LONG` / `SHORT` as the platform declares it — not interpreted. */
  readonly direction: string;
  readonly name: string;
  readonly description: string;
}

export type SignalListResult =
  | { readonly kind: 'signals'; readonly signals: readonly SignalSummary[] }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

/** A parameter as the definition's schema declares it. */
export interface SignalParameter {
  readonly key: string;
  readonly description: string | null;
  readonly min: number | null;
  readonly max: number | null;
  /** From the platform's `defaultParams`, rendered as declared. */
  readonly defaultValue: number | null;
}

export interface SignalExample {
  readonly scenario: string;
  readonly outcome: string;
}

/**
 * The full authoring card. Every field is the platform's own copy — this
 * product explains signals in BattleGrid's words, never its own.
 */
export interface SignalDefinition {
  readonly summary: SignalSummary;
  readonly moduleName: string;
  readonly moduleDescription: string | null;
  readonly detects: string | null;
  readonly fires: string | null;
  readonly exampleSetup: string | null;
  readonly examples: readonly SignalExample[];
  readonly bestFor: string | null;
  readonly watchOut: string | null;
  /** Empty is a real state — some signals take no parameters at all. */
  readonly parameters: readonly SignalParameter[];
  /** Indicator labels the signal reads, e.g. `RSI(14)`. */
  readonly indicators: readonly string[];
}

/**
 * Sections available for each category, ready for the edit-page checklist.
 *
 * `templates` is flat — the edit page groups by `template.category` when rendering.
 * `categories` carries metadata (label, guidance) for group headers.
 */
export interface CategoryOptions {
  readonly category: string;
  readonly label: string;
  readonly purpose: string;
  readonly templates: readonly SectionTemplate[];
}

export type SectionOptionsResult =
  | {
      readonly kind: 'ready';
      readonly detail: StrategyDetail;
      /** All available templates, flat. Group by `template.category` for display. */
      readonly templates: readonly SectionTemplate[];
      /** Category metadata for group headers. */
      readonly categories: readonly VocabularyCategory[];
      /**
       * What a preview of this composition may cost before the platform
       * refuses it. Shown while composing, which is when it can change a
       * decision — by the time a preview is refused, the refusal says so
       * itself in the platform's own words.
       */
      readonly limits: PreviewLimits | null;
    }
  | { readonly kind: 'strategy-missing' }
  | { readonly kind: 'strategy-unreadable' }
  | { readonly kind: 'vocabulary-unreadable' };

export type { SectionTemplate };


/** The most signals the platform's simulator accepts. Twenty-one is refused. */
export const SIMULATION_SIGNAL_CAP = 20;

export interface SimulationSignal {
  readonly label: string;
  /** 0..1, as the scorecard reports a signal's score. */
  readonly score: number;
  /** Tier 0..3. Zero contributes nothing to the aggregate. */
  readonly allocation: number;
}

export interface SimulatedAttribution {
  readonly label: string;
  readonly scorePercent: number | null;
  readonly allocation: number | null;
  readonly attributionPercent: number | null;
}

export interface Simulation {
  readonly aggregateScorePercent: number | null;
  readonly gatePercent: number | null;
  /** The platform's own verdict. `>=` — an aggregate equal to the gate routes. */
  readonly wouldRoute: boolean;
  readonly attributions: readonly SimulatedAttribution[];
}

export type SimulationResult =
  | { readonly kind: 'simulation'; readonly simulation: Simulation }
  /**
   * The platform declined to compute one. Carried rather than replaced by a
   * score: a what-if that invents an answer when refused is worse than one
   * that admits it has none.
   */
  | { readonly kind: 'refused'; readonly reason: string };
