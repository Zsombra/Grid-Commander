import type { FailureCause } from './failure.js';

/**
 * The public record: other people's agents, and where this account sits
 * among them. Reads only — nothing here mutates, and the seven per-agent
 * public reads are a separate surface.
 *
 * Every rate on this port is nullable. BattleGrid distinguishes "no trades
 * were made, so there is no win rate" from "trades were made and none
 * won", and a port that types these as `number` erases the distinction at
 * the boundary where it is still recoverable.
 */
export interface ExplorerPort {
  /** The field: its own totals, its ranked agents, and this account in it. */
  readField(params: {
    userId: string;
    accessToken: string;
    timeframe: FieldWindow;
    sortBy: FieldSort;
    limit?: number | undefined;
  }): Promise<FieldResult>;

  /** Owner-level standing, one metric at a time. */
  readLeaderboard(params: {
    userId: string;
    accessToken: string;
    metric: LeaderboardMetric;
    timeframe: FieldWindow;
    limit?: number | undefined;
  }): Promise<LeaderboardResult>;
}

/** The platform's own windows. Not extended, not renamed. */
export const FIELD_WINDOWS = ['DAILY', 'WEEKLY', 'MONTHLY', 'ALL_TIME'] as const;
export type FieldWindow = (typeof FIELD_WINDOWS)[number];

/** The platform's own sort keys. Offering a fourth would mean sorting client-side over a list that is already partial. */
export const FIELD_SORTS = ['NET_PNL', 'WIN_RATE', 'TRADE_COUNT'] as const;
export type FieldSort = (typeof FIELD_SORTS)[number];

export const LEADERBOARD_METRICS = ['PROFIT', 'VOLUME', 'SCORE'] as const;
export type LeaderboardMetric = (typeof LEADERBOARD_METRICS)[number];

/**
 * The field's own totals.
 *
 * `totalAgents` is what the platform counts. It is deliberately NOT the
 * length of the list that comes with it — see `Field.shown`.
 */
export interface FieldStats {
  readonly totalAgents: number | null;
  readonly totalVolumeUsd: number | null;
  readonly avgTradeSizeUsd: number | null;
  /** Null when nothing traded in the window. Never 0 in that case. */
  readonly winRatePercent: number | null;
  readonly winCount: number | null;
  readonly lossCount: number | null;
  readonly totalNetPnl: number | null;
  readonly avgNetPnl: number | null;
}

/** One agent's public resume, as the field lists it. */
export interface FieldAgent {
  readonly agentId: string;
  readonly rank: number | null;
  readonly agentName: string;
  readonly modelDisplayName: string | null;
  readonly ownerDisplayName: string | null;
  readonly tenureDays: number | null;
  /** The platform's own one-line billing, e.g. `AGGRESSIVE · 1H · UP TO 10X`. */
  readonly subtitle: string | null;
  /** The platform's own sentence describing when this agent enters. */
  readonly objective: string | null;
  readonly totalNetPnl: number | null;
  readonly winRatePercent: number | null;
  /** The sample every rate above was computed from. Never dropped. */
  readonly tradeCount: number | null;
  readonly roiPercent: number | null;
  readonly bestTrade: TradeExtreme | null;
  readonly worstTrade: TradeExtreme | null;
  readonly activeTradeCount: number | null;
  readonly strategyName: string | null;
}

export interface TradeExtreme {
  readonly netPnl: number | null;
  readonly coinTicker: string | null;
}

/** How one model vendor's agents are doing, in aggregate. */
export interface VendorStanding {
  readonly provider: string;
  readonly agentCount: number | null;
  readonly tradeCount: number | null;
  /** Null for a vendor whose agents have never traded. */
  readonly winRatePercent: number | null;
  readonly totalNetPnl: number | null;
  readonly avgNetPnl: number | null;
}

/** One of this account's own agents, and where it placed. */
export interface OwnAgentStanding {
  readonly agentId: string;
  readonly agentName: string;
  readonly rank: number | null;
  readonly totalNetPnl: number | null;
}

export interface Field {
  readonly stats: FieldStats;
  readonly agents: readonly FieldAgent[];
  /**
   * How many rows the platform actually returned.
   *
   * Kept apart from `stats.totalAgents` because they disagree, and do so
   * unpredictably: on 2026-08-03 an `ALL_TIME`/`NET_PNL` read returned 5
   * rows while reporting 37 agents — at every limit from 3 to 100, four
   * runs running — and then returned all 37 to the same request later the
   * same hour. Collapsing these into one number would let the surface
   * claim a completeness it cannot know it has.
   */
  readonly shown: number;
  readonly vendors: readonly VendorStanding[];
  /** Empty when the platform ranks none of this account's agents. */
  readonly ownAgents: readonly OwnAgentStanding[];
  readonly generatedAt: string | null;
}

export interface LeaderboardEntry {
  readonly rank: number | null;
  readonly displayName: string;
  readonly value: number | null;
}

/** Where this account placed. Null when the platform did not rank it. */
export interface OwnStanding {
  readonly rank: number | null;
  readonly value: number | null;
  readonly percentile: number | null;
}

export interface Leaderboard {
  readonly metric: LeaderboardMetric;
  readonly entries: readonly LeaderboardEntry[];
  readonly own: OwnStanding | null;
  readonly generatedAt: string | null;
}

export type FieldResult =
  | { readonly kind: 'field'; readonly field: Field }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

export type LeaderboardResult =
  | { readonly kind: 'leaderboard'; readonly leaderboard: Leaderboard }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };
