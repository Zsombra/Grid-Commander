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

  /**
   * How much one public agent evaluated, how much it acted on, and how
   * that turned out. The funnel is the answer to "what do the ones doing
   * well do differently".
   */
  readCompetitorPerformance(params: {
    userId: string;
    accessToken: string;
    agentId: string;
  }): Promise<PublicResult<CompetitorFunnel>>;

  readCompetitorTrades(params: {
    userId: string;
    accessToken: string;
    agentId: string;
    timeframe?: PublicWindow | undefined;
    limit?: number | undefined;
  }): Promise<PublicResult<PublicTrade[]>>;

  readCompetitorEvaluations(params: {
    userId: string;
    accessToken: string;
    agentId: string;
    limit?: number | undefined;
  }): Promise<PublicResult<PublicEvaluation[]>>;

  /**
   * What a public agent is holding right now.
   *
   * Public despite its own argument description. The tool's summary says
   * "any ACTIVE agent … the same data an anonymous visitor sees" while its
   * `agentId` description says "one of **your** intelligence agent UUIDs".
   * Called both ways on 2026-08-03: it answers a snapshot for a rival
   * exactly as for one of ours, so the summary is right and the argument
   * text is stale.
   */
  readCompetitorOpenPositions(params: {
    userId: string;
    accessToken: string;
    agentId: string;
  }): Promise<PublicResult<OpenPositions>>;
}

/** The windows the per-agent public reads accept — not the field's four. */
export const PUBLIC_WINDOWS = ['1D', '7D', '30D', 'LIFETIME'] as const;
export type PublicWindow = (typeof PUBLIC_WINDOWS)[number];

/**
 * One public read's outcome.
 *
 * Generic and per-read because a competitor whose trades will not load
 * still has a funnel worth showing, and `none` is a finding — an agent
 * that has closed nothing is a different thing from one whose record could
 * not be fetched.
 */
export type PublicResult<T> =
  | { readonly kind: 'value'; readonly value: T; readonly total: number | null }
  | { readonly kind: 'none' }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

/**
 * What an agent looked at, what it decided, and how it ended.
 *
 * `skipDecisions` and `skippedTerminal` are two counters the platform
 * names similarly and means differently — decisions that were SKIP (29 on
 * the rank-1 agent) versus pipelines whose terminal status was SKIPPED (0
 * on the same agent). They are never summed and never substituted.
 */
export interface CompetitorFunnel {
  readonly totalEvaluations: number | null;
  readonly totalDecisions: number | null;
  readonly enterDecisions: number | null;
  readonly skipDecisions: number | null;
  readonly skippedTerminal: number | null;
  readonly executed: number | null;
  readonly failed: number | null;
  readonly expired: number | null;
  readonly cancelled: number | null;
  readonly blocked: number | null;
  readonly pending: number | null;
  readonly fillRatePercent: number | null;
  readonly avgAggregateScorePercent: number | null;
  readonly avgConvictionPercent: number | null;
  readonly avgRiskRewardRatio: number | null;
  /** Realized: the record those decisions produced. */
  readonly outcomeCount: number | null;
  readonly winCount: number | null;
  readonly lossCount: number | null;
  readonly winRatePercent: number | null;
  readonly avgNetPnl: number | null;
  readonly totalNetPnl: number | null;
  readonly avgDurationSeconds: number | null;
  /** What it watches most, by evaluation count. */
  readonly topCoins: readonly { readonly coinTicker: string; readonly count: number | null }[];
}

export interface PublicTrade {
  readonly id: string;
  readonly coinTicker: string | null;
  readonly direction: string | null;
  readonly entryFillPrice: number | null;
  readonly exitFillPrice: number | null;
  readonly netPnl: number | null;
  /** The platform's own verdict on the trade, not derived from netPnl. */
  readonly isWin: boolean | null;
  readonly movePercent: number | null;
  readonly roePercent: number | null;
  readonly closeReason: string | null;
  readonly leverage: number | null;
  readonly conviction: number | null;
  readonly openedAt: string | null;
  readonly closedAt: string | null;
  readonly durationSeconds: number | null;
  /** Links a trade back to the evaluation that produced it. */
  readonly signalLogId: string | null;
}

export interface PublicEvaluation {
  readonly id: string;
  readonly coinTicker: string | null;
  readonly aggregateScorePercent: number | null;
  /** The threshold in force when it ran, as with our own pipeline read. */
  readonly minAggregateScorePercent: number | null;
  readonly dominantBias: string | null;
  readonly assessmentDirection: string | null;
  readonly hasConflictingSignals: boolean;
  readonly triggeredSignalCount: number | null;
  readonly gateStatus: string | null;
  readonly terminalStatus: string | null;
  readonly signalSource: string | null;
  readonly at: string | null;
}


/**
 * What a public agent is holding, as far as it has ever been observed.
 *
 * The envelope is real and mapped. The per-position rows are **not
 * modelled**: on 2026-08-03 no agent anywhere in the field held an open
 * position, so `positions` has only ever been seen empty. The declaration
 * promises size, entry price, leverage, price move and return on equity —
 * but not the key names, and inventing those is what produced three of the
 * dead write paths in this project's history.
 *
 * `positionsUnmodelled` therefore carries the raw rows through untouched,
 * so the surface can say how many exist and admit it cannot read inside
 * them yet. See `open-position-rows-are-unobserved`.
 */
export interface OpenPositions {
  readonly unrealizedPnl: number | null;
  readonly openPositionCount: number | null;
  /** Length is trustworthy; contents are not interpreted here. */
  readonly positionsUnmodelled: readonly unknown[];
  readonly fetchedAt: string | null;
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
