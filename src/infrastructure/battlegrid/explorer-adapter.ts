import type {
  CompetitorFunnel,
  EvaluationDetail,
  Field,
  FieldAgent,
  FieldResult,
  FieldSort,
  FieldStats,
  FieldWindow,
  Leaderboard,
  LeaderboardMetric,
  LeaderboardResult,
  OpenPositions,
  OwnAgentStanding,
  OwnStanding,
  PublicEvaluation,
  PublicResult,
  PublicTrade,
  PublicWindow,
  TradeExtreme,
  VendorStanding,
  ExplorerPort,
} from '@/ports/explorer.js';
import type { BattleGridPort } from '@/ports/battlegrid.js';
import { unreadable } from './unreadable.js';
import { mapEvaluationScorecard } from './scorecard-mapper.js';

/**
 * The public explorer, read side — mapped against the shapes observed live
 * 2026-08-03.
 *
 * One platform behaviour this file encodes rather than trips over: the
 * entry list is sometimes shorter than the field it reports, and `limit`
 * does not change that. `ALL_TIME`/`NET_PNL` answered 5 rows against
 * `totalAgents: 37` at limits 3, 10, 37 and 100 — four runs in a row —
 * then answered all 37 to the same parameters twenty minutes later.
 * Intermittent, not deterministic, which is exactly why `shown` is carried
 * as its own number and nothing here reconciles the two: there is no
 * reliable moment at which the list may be assumed complete.
 */
const TOOLS = {
  field: 'get_agent_explorer',
  leaderboard: 'get_leaderboard',
  competitorPerformance: 'get_public_agent_signal_performance',
  competitorTrades: 'get_public_agent_realized_trades',
  competitorEvaluations: 'get_public_agent_signal_logs',
  competitorOpen: 'get_public_agent_unrealized_pnl',
  competitorEvaluationDetail: 'get_public_agent_signal_log_detail',
} as const;

const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);

/**
 * A number, or null — and null for anything that is not one.
 *
 * `winRate: null` on a vendor with no trades is the case this exists for.
 * Coercing it to 0 would report "none of their trades won" about agents
 * that have not traded.
 */
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function mapExtreme(raw: unknown): TradeExtreme | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const t = raw as Record<string, unknown>;
  const netPnl = num(t['netPnl']);
  const coinTicker = str(t['coinTicker']);
  // A best trade with neither a figure nor a ticker is not a best trade.
  if (netPnl === null && coinTicker === null) return null;
  return { netPnl, coinTicker };
}

function mapAgent(raw: unknown): FieldAgent | null {
  const a = (raw ?? {}) as Record<string, unknown>;
  const agentId = str(a['agentId']);
  // Unidentifiable rows are dropped rather than rendered as a nameless
  // competitor — the reader cannot go and look one up.
  if (agentId === null) return null;
  return {
    agentId,
    rank: num(a['rank']),
    agentName: str(a['agentName']) ?? agentId,
    modelDisplayName: str(a['modelDisplayName']),
    ownerDisplayName: str(a['ownerDisplayName']),
    tenureDays: num(a['tenureDays']),
    // The platform's own billing and sentence, unparaphrased.
    subtitle: str(a['subtitle']),
    objective: str(a['objective']),
    totalNetPnl: num(a['totalNetPnl']),
    winRatePercent: num(a['winRatePercent']),
    tradeCount: num(a['tradeCount']),
    roiPercent: num(a['roiPercent']),
    bestTrade: mapExtreme(a['bestTrade']),
    worstTrade: mapExtreme(a['worstTrade']),
    activeTradeCount: num(a['activeTradeCount']),
    strategyName: str(a['strategyName']),
  };
}

function mapStats(raw: unknown): FieldStats {
  const s = (raw ?? {}) as Record<string, unknown>;
  return {
    totalAgents: num(s['totalAgents']),
    totalVolumeUsd: num(s['totalVolumeUsd']),
    avgTradeSizeUsd: num(s['avgTradeSizeUsd']),
    winRatePercent: num(s['winRatePercent']),
    winCount: num(s['winCount']),
    lossCount: num(s['lossCount']),
    totalNetPnl: num(s['totalNetPnl']),
    avgNetPnl: num(s['avgNetPnl']),
  };
}

function mapVendor(raw: unknown): VendorStanding | null {
  const v = (raw ?? {}) as Record<string, unknown>;
  const provider = str(v['provider']);
  if (provider === null) return null;
  return {
    provider,
    agentCount: num(v['agentCount']),
    tradeCount: num(v['tradeCount']),
    winRatePercent: num(v['winRatePercent']),
    totalNetPnl: num(v['totalNetPnl']),
    avgNetPnl: num(v['avgNetPnl']),
  };
}

function mapOwnAgent(raw: unknown): OwnAgentStanding | null {
  const a = (raw ?? {}) as Record<string, unknown>;
  const agentId = str(a['agentId']);
  if (agentId === null) return null;
  return {
    agentId,
    agentName: str(a['agentName']) ?? agentId,
    rank: num(a['rank']),
    totalNetPnl: num(a['totalNetPnl']),
  };
}

function mapOwnStanding(raw: unknown): OwnStanding | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const c = raw as Record<string, unknown>;
  const rank = num(c['rank']);
  const value = num(c['value']);
  const percentile = num(c['percentile']);
  // The envelope always carries a userId; a standing with no rank, value or
  // percentile in it is the platform saying it did not place this account.
  if (rank === null && value === null && percentile === null) return null;
  return { rank, value, percentile };
}

const list = (v: unknown): readonly unknown[] => (Array.isArray(v) ? v : []);

export class McpExplorerAdapter implements ExplorerPort {
  constructor(private readonly battlegrid: BattleGridPort) {}

  async readField(params: {
    userId: string;
    accessToken: string;
    timeframe: FieldWindow;
    sortBy: FieldSort;
    limit?: number | undefined;
  }): Promise<FieldResult> {
    try {
      const result = await this.battlegrid.callTool({
        userId: params.userId,
        accessToken: params.accessToken,
        tool: TOOLS.field,
        args: {
          timeframe: params.timeframe,
          sortBy: params.sortBy,
          ...(params.limit === undefined ? {} : { limit: params.limit }),
        },
      });
      const p = result.content as Record<string, unknown>;
      const agents = list(p['entries'])
        .map(mapAgent)
        .filter((a): a is FieldAgent => a !== null);
      const aggregations = (p['aggregations'] ?? {}) as Record<string, unknown>;
      const currentUser = (p['currentUser'] ?? {}) as Record<string, unknown>;
      const field: Field = {
        stats: mapStats(p['stats']),
        agents,
        // What was rendered, counted after mapping — not what was asked for.
        shown: agents.length,
        vendors: list(aggregations['modelVendors'])
          .map(mapVendor)
          .filter((v): v is VendorStanding => v !== null),
        ownAgents: list(currentUser['agents'])
          .map(mapOwnAgent)
          .filter((a): a is OwnAgentStanding => a !== null),
        generatedAt: str(p['generatedAt']),
      };
      return { kind: 'field', field };
    } catch (err) {
      // Unreadable is its own state: a field rendered empty would say this
      // account competes against nobody.
      return unreadable(err);
    }
  }

  async readLeaderboard(params: {
    userId: string;
    accessToken: string;
    metric: LeaderboardMetric;
    timeframe: FieldWindow;
    limit?: number | undefined;
  }): Promise<LeaderboardResult> {
    try {
      const result = await this.battlegrid.callTool({
        userId: params.userId,
        accessToken: params.accessToken,
        tool: TOOLS.leaderboard,
        args: {
          metric: params.metric,
          timeframe: params.timeframe,
          ...(params.limit === undefined ? {} : { limit: params.limit }),
        },
      });
      const p = result.content as Record<string, unknown>;
      const leaderboard: Leaderboard = {
        metric: params.metric,
        entries: list(p['leaderboard'])
          .map((raw) => {
            const e = (raw ?? {}) as Record<string, unknown>;
            const displayName = str(e['displayName']);
            if (displayName === null) return null;
            return { rank: num(e['rank']), displayName, value: num(e['value']) };
          })
          .filter((e): e is { rank: number | null; displayName: string; value: number | null } => e !== null),
        own: mapOwnStanding(p['currentUser']),
        generatedAt: str(p['generatedAt']),
      };
      return { kind: 'leaderboard', leaderboard };
    } catch (err) {
      return unreadable(err);
    }
  }

  async readCompetitorPerformance(params: {
    userId: string;
    accessToken: string;
    agentId: string;
  }): Promise<PublicResult<CompetitorFunnel>> {
    return this.publicRead(params, TOOLS.competitorPerformance, {}, (p) => {
      // An agent the platform has never evaluated answers zeros rather than
      // a body; nothing to show is `none`, not a funnel of nulls.
      if (num(p['totalEvaluations']) === null) return null;
      const funnel: CompetitorFunnel = {
        totalEvaluations: num(p['totalEvaluations']),
        totalDecisions: num(p['totalEntryDecisions']),
        enterDecisions: num(p['enterCount']),
        // Two counters, two fields. `skipCount` is decisions that were
        // SKIP; `skippedCount` is pipelines whose terminal status was
        // SKIPPED. On the rank-1 agent these read 29 and 0.
        skipDecisions: num(p['skipCount']),
        skippedTerminal: num(p['skippedCount']),
        executed: num(p['executedCount']),
        failed: num(p['failedCount']),
        expired: num(p['expiredCount']),
        cancelled: num(p['cancelledCount']),
        blocked: num(p['blockedCount']),
        pending: num(p['pendingCount']),
        fillRatePercent: num(p['fillRatePct']),
        avgAggregateScorePercent: num(p['avgAggregateScorePercent']),
        avgConvictionPercent: num(p['avgConvictionPercent']),
        avgRiskRewardRatio: num(p['avgRiskRewardRatio']),
        outcomeCount: num(p['outcomeCount']),
        winCount: num(p['winCount']),
        lossCount: num(p['lossCount']),
        winRatePercent: num(p['winRatePercent']),
        avgNetPnl: num(p['avgNetPnl']),
        totalNetPnl: num(p['totalNetPnl']),
        avgDurationSeconds: num(p['avgDurationSeconds']),
        topCoins: list(p['topCoinsByEvaluation'])
          .map((raw) => {
            const c = (raw ?? {}) as Record<string, unknown>;
            const coinTicker = str(c['coinTicker']);
            return coinTicker === null ? null : { coinTicker, count: num(c['count']) };
          })
          .filter((c): c is { coinTicker: string; count: number | null } => c !== null),
      };
      return { value: funnel, total: null };
    });
  }

  async readCompetitorTrades(params: {
    userId: string;
    accessToken: string;
    agentId: string;
    timeframe?: PublicWindow | undefined;
    limit?: number | undefined;
  }): Promise<PublicResult<PublicTrade[]>> {
    return this.publicRead(
      params,
      TOOLS.competitorTrades,
      {
        ...(params.timeframe === undefined ? {} : { timeframe: params.timeframe }),
        ...(params.limit === undefined ? {} : { limit: params.limit }),
      },
      (p) => {
        const rows = list(p['trades']);
        if (rows.length === 0) return null;
        const trades = rows
          .map((raw): PublicTrade | null => {
            const t = (raw ?? {}) as Record<string, unknown>;
            const id = str(t['outcomeId']) ?? str(t['positionId']);
            if (id === null) return null;
            return {
              id,
              coinTicker: str(t['coinTicker']),
              direction: str(t['direction']),
              entryFillPrice: num(t['entryFillPrice']),
              exitFillPrice: num(t['exitFillPrice']),
              netPnl: num(t['netPnl']),
              // The platform's own verdict. Deriving it from netPnl would
              // call a zero-P&L trade a loss.
              isWin: typeof t['isWin'] === 'boolean' ? t['isWin'] : null,
              movePercent: num(t['movePercent']),
              roePercent: num(t['roePercent']),
              closeReason: str(t['closeReason']),
              leverage: num(t['leverage']),
              conviction: num(t['conviction']),
              openedAt: str(t['openedAt']),
              closedAt: str(t['closedAt']),
              durationSeconds: num(t['durationSeconds']),
              signalLogId: str(t['signalLogId']),
            };
          })
          .filter((t): t is PublicTrade => t !== null);
        return { value: trades, total: num(p['total']) };
      },
    );
  }

  async readCompetitorEvaluations(params: {
    userId: string;
    accessToken: string;
    agentId: string;
    limit?: number | undefined;
  }): Promise<PublicResult<PublicEvaluation[]>> {
    return this.publicRead(
      params,
      TOOLS.competitorEvaluations,
      { ...(params.limit === undefined ? {} : { limit: params.limit }) },
      (p) => {
        const rows = list(p['entries']);
        if (rows.length === 0) return null;
        const evaluations = rows
          .map((raw): PublicEvaluation | null => {
            const e = (raw ?? {}) as Record<string, unknown>;
            const id = str(e['id']);
            if (id === null) return null;
            return {
              id,
              coinTicker: str(e['coinTicker']),
              aggregateScorePercent: num(e['aggregateScorePercent']),
              // The bar it was actually measured against, as with our own
              // pipeline read — not the agent's setting today.
              minAggregateScorePercent: num(e['effectiveMinAggregateScorePercent']),
              dominantBias: str(e['dominantBias']),
              assessmentDirection: str(e['assessmentDirection']),
              hasConflictingSignals: e['hasConflictingSignals'] === true,
              triggeredSignalCount: num(e['triggeredSignalCount']),
              gateStatus: str(e['evaluationGateStatus']),
              terminalStatus: str(e['terminalStatus']),
              signalSource: str(e['signalSource']),
              at: str(e['evaluatedAt']) ?? str(e['createdAt']),
            };
          })
          .filter((e): e is PublicEvaluation => e !== null);
        return { value: evaluations, total: num(p['total']) };
      },
    );
  }

  async readCompetitorOpenPositions(params: {
    userId: string;
    accessToken: string;
    agentId: string;
  }): Promise<PublicResult<OpenPositions>> {
    return this.publicRead(params, TOOLS.competitorOpen, {}, (p) => {
      const snapshot = p['snapshot'];
      // Documented as null when the agent has nothing open.
      if (typeof snapshot !== 'object' || snapshot === null) return null;
      const s = snapshot as Record<string, unknown>;
      return {
        value: {
          unrealizedPnl: num(s['unrealizedPnl']),
          openPositionCount: num(s['openPositionCount']),
          // Carried, never interpreted — see the port's note and
          // `open-position-rows-are-unobserved`.
          positionsUnmodelled: list(s['positions']),
          fetchedAt: str(s['fetchedAt']),
        },
        total: null,
      };
    });
  }

  async readCompetitorEvaluationDetail(params: {
    userId: string;
    accessToken: string;
    agentId: string;
    logId: string;
  }): Promise<PublicResult<EvaluationDetail>> {
    return this.publicRead(params, TOOLS.competitorEvaluationDetail, { logId: params.logId }, (p) => {
      // Shared with the owner-side read: BattleGrid returns the same `log`
      // shape to both, nulling only the owner-only telemetry. `owned:
      // false` means the cost is not reached for at all.
      const detail = mapEvaluationScorecard(p, { owned: false });
      // The platform's documented "no public log with that id is visible
      // to you", and its answer for every FAILED evaluation observed.
      // Nothing published is not the same as nothing readable.
      if (detail === null) return null;
      // `EvaluationDetail` is the scorecard without `cost`, and `owned:
      // false` above means the mapper never reached for it. Narrowing here
      // is a type-level statement, not a runtime strip.
      return { value: detail, total: null };
    });
  }

  /**
   * The shape every per-agent public read shares.
   *
   * One place that turns a throw into `unreadable` and a mapper's `null`
   * into `none`, so no individual read can accidentally report an empty
   * record as a failure or a failure as an empty record.
   */
  private async publicRead<T>(
    params: { userId: string; accessToken: string; agentId: string },
    tool: string,
    args: Record<string, unknown>,
    map: (payload: Record<string, unknown>) => { value: T; total: number | null } | null,
  ): Promise<PublicResult<T>> {
    try {
      const result = await this.battlegrid.callTool({
        userId: params.userId,
        accessToken: params.accessToken,
        tool,
        args: { agentId: params.agentId, ...args },
      });
      const mapped = map(result.content as Record<string, unknown>);
      if (mapped === null) return { kind: 'none' };
      return { kind: 'value', value: mapped.value, total: mapped.total };
    } catch (err) {
      return unreadable(err);
    }
  }
}
