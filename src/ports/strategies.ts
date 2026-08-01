import type { SectionTemplate, Strategy, StrategyDetail, StrategyQuota } from '@/domain/strategy/strategy.js';
import type { Confirmation } from '@/domain/capability/confirmation.js';
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

  readVocabulary(params: { userId: string; accessToken: string }): Promise<VocabularyResult>;

  /**
   * All section templates the platform's vocabulary advertises.
   *
   * A single call returns the full list regardless of which category is passed.
   * The adapter handles that detail — the use case sees one call.
   */
  listVocabularyTemplates(params: { userId: string; accessToken: string }): Promise<VocabularyTemplatesResult>;

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
  | { readonly kind: 'strategy'; readonly detail: StrategyDetail }
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

export type VocabularyTemplatesResult =
  | { readonly kind: 'templates'; readonly templates: readonly SectionTemplate[] }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

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
    }
  | { readonly kind: 'strategy-missing' }
  | { readonly kind: 'strategy-unreadable' }
  | { readonly kind: 'vocabulary-unreadable' };

export type { SectionTemplate };
