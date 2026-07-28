import type { Strategy, StrategyQuota } from '@/domain/strategy/strategy.js';

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
    confirmationToken: string;
  }): Promise<Readonly<Record<string, unknown>>>;

  forkStrategy(params: {
    userId: string;
    accessToken: string;
    strategyId: string;
    sourceRevision: number;
  }): Promise<Strategy>;

  setActive(params: {
    userId: string;
    accessToken: string;
    strategyId: string;
    active: boolean;
    confirmationToken?: string | undefined;
  }): Promise<LifecycleResult>;

  readVocabulary(params: { userId: string; accessToken: string }): Promise<VocabularyResult>;
}

export type StrategyListResult =
  | {
      readonly kind: 'strategies';
      readonly strategies: readonly Strategy[];
      readonly quota: StrategyQuota | null;
    }
  | { readonly kind: 'unreadable'; readonly reason: string };

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
  | { readonly kind: 'repair-required'; readonly reason: string };

export interface VocabularyCategory {
  readonly category: string;
  readonly label: string;
  readonly purpose: string;
  readonly metricCount: number;
}

export type VocabularyResult =
  | { readonly kind: 'vocabulary'; readonly categories: readonly VocabularyCategory[] }
  | { readonly kind: 'unreadable'; readonly reason: string };
