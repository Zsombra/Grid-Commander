import type { SignalReading } from '@/domain/recording/capture.js';
import type { FailureCause } from './failure.js';

/**
 * What the platform says the market is doing, independent of any agent.
 *
 * Its own port rather than a method on `AgentsPort`, because none of this is
 * about an agent: `get_top_ranked_coins` answers the same list for every
 * account. The first caller is the coin-qualification screen, which needs
 * *something* to screen when an agent is deployed nowhere. The signal
 * recorder reads here for the same reason — the unweighted preview is the
 * signal layer itself, nobody's agent overlaid.
 */
export interface MarketPort {
  /**
   * What every signal says for one coin at one interval, right now.
   *
   * Deliberately unweighted — no `agentId` is ever sent. The neutral reading
   * is the record; any agent's weighting is recomputable later from the raw
   * scores and allocations this returns, and the platform's own
   * `simulate_aggregate_score` exists to do exactly that.
   *
   * The result carries the platform's whole answer beside the mapped
   * readings, because the recorder stores it — a field the mapper does not
   * carry today must still reach the record.
   */
  coinSignalPreview(params: {
    userId: string;
    accessToken: string;
    ticker: string;
    interval: string;
  }): Promise<CoinSignalPreviewResult>;

  /**
   * The server version the platform names for itself, or null when it does
   * not say. Null is a recordable answer — "generation unknown" — and never
   * a reason for a caller to fail.
   */
  platformVersion(params: { accessToken: string }): Promise<string | null>;
  /**
   * Coins the platform ranks highest by one discovery metric.
   *
   * `metric` and `interval` decide what "interesting" means, and both are the
   * caller's to state — the platform has no default worth inheriting silently.
   */
  topRankedCoins(params: {
    userId: string;
    accessToken: string;
    metric: string;
    interval: string;
    limit?: number | undefined;
  }): Promise<RankedCoinsResult>;

  /**
   * The metrics and intervals the ranking tool declares it accepts, read from
   * the live schema rather than compiled in.
   *
   * The same shape as `RadarPort.deploymentTimeframes`, for the same reason:
   * BattleGrid has replaced itself under this product four times, and a list of
   * enum values written into source is a list that goes stale without anything
   * failing. Either list empty means the declaration could not answer, and the
   * caller stops rather than sending a value it invented.
   */
  rankingVocabulary(params: {
    userId: string;
    accessToken: string;
  }): Promise<RankingVocabulary>;
}

export interface RankingVocabulary {
  readonly metrics: readonly string[];
  readonly intervals: readonly string[];
}

/** One coin on the ranked list, with its place and the figure that put it there. */
export interface RankedCoin {
  readonly ticker: string;
  readonly rank: number | null;
  /**
   * What the ranking metric measured — signed change for `abs_change`, RSI
   * activity for `rsi_activity`, the volume ratio for `volume`. Meaningless
   * without the metric that produced it, so it never travels alone.
   */
  readonly latestMetricValue: number | null;
}

export type RankedCoinsResult =
  | { readonly kind: 'coins'; readonly coins: readonly RankedCoin[] }
  /** The platform ranked nothing. Distinct from a ranking that failed. */
  | { readonly kind: 'none' }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

/** One coin's signal layer at one moment, with the price it was read at. */
export interface CoinSignalPreview {
  readonly coinTicker: string;
  readonly currentPrice: number;
  readonly priceChangePercent: number;
  readonly dominantBias: string;
  readonly aggregateScorePercent: number;
  readonly hasConflictingSignals: boolean;
  readonly readings: readonly SignalReading[];
  /** The platform's answer as received, post-envelope, pre-mapper. */
  readonly raw: Readonly<Record<string, unknown>>;
}

export type CoinSignalPreviewResult =
  | { readonly kind: 'preview'; readonly preview: CoinSignalPreview }
  | {
      readonly kind: 'unreadable';
      readonly reason: string;
      readonly cause: FailureCause;
      /**
       * The answer that arrived but could not be read, when there was one.
       * Carried so the recorder can keep it — a malformed answer is still
       * history, and it is exactly the kind a later mapper fix can recover.
       */
      readonly raw?: Readonly<Record<string, unknown>> | undefined;
    };
