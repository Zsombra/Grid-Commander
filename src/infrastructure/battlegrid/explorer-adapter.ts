import type {
  Field,
  FieldAgent,
  FieldResult,
  FieldSort,
  FieldStats,
  FieldWindow,
  Leaderboard,
  LeaderboardMetric,
  LeaderboardResult,
  OwnAgentStanding,
  OwnStanding,
  TradeExtreme,
  VendorStanding,
  ExplorerPort,
} from '@/ports/explorer.js';
import type { BattleGridPort } from '@/ports/battlegrid.js';
import { unreadable } from './unreadable.js';

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
}
