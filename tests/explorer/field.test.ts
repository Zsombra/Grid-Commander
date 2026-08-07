import { describe, expect, it } from 'vitest';
import { McpExplorerAdapter } from '@/infrastructure/battlegrid/explorer-adapter.js';
import { ReadFieldQuery } from '@/application/use-cases/read-field.query.js';
import type { BattleGridPort, ToolCallRequest } from '@/ports/battlegrid.js';
import type { ExplorerPort, FieldResult, LeaderboardResult } from '@/ports/explorer.js';

/**
 * The explorer, mapped against the live shapes of 2026-08-03.
 *
 * The properties under test are the three ways this surface could lie:
 * a partial list presented as the field, an unmeasured rate rendered as
 * zero, and a rank shown without the sample behind it.
 */

/** Live `get_agent_explorer` payload of 2026-08-03, trimmed but verbatim in shape. */
const LIVE_FIELD = {
  filter: { timeframe: 'ALL_TIME', sortBy: 'NET_PNL' },
  stats: {
    totalAgents: 37,
    activeAgentCount: 0,
    totalVolumeUsd: 86871.74809228591,
    avgTradeSizeUsd: 112.38259779079678,
    winRate: 0.30838709677419357,
    winRatePercent: 31,
    winCount: 239,
    lossCount: 534,
    totalNetPnl: -162.07240934,
    avgNetPnl: -0.2096667649935317,
  },
  aggregations: {
    modelVendors: [
      {
        provider: 'Anthropic',
        agentCount: 18,
        tradeCount: 351,
        winRatePercent: 32,
        totalNetPnl: -59.98,
        avgNetPnl: -0.171,
      },
      // Never traded: the platform sends null, not 0.
      {
        provider: 'xAI',
        agentCount: 2,
        tradeCount: 0,
        winRatePercent: null,
        totalNetPnl: 0,
        avgNetPnl: undefined,
      },
      // No provider — unattributable, dropped.
      { agentCount: 1, tradeCount: 5 },
    ],
  },
  // Five rows against a field of 37. Not a truncation this client asked for.
  entries: [
    {
      rank: 1,
      agentId: 'b731d127-3aa4-4fde-baf9-1fc82eef3224',
      agentName: 'Market Predator',
      scope: 'PRIVATE',
      modelDisplayName: 'Claude Opus 4.6',
      ownerDisplayName: 'el_chapo',
      tradingMode: 'FULL_EXECUTION',
      tenureDays: 137,
      subtitle: 'AGGRESSIVE · 1H · UP TO 10X',
      objective: 'Enters only when signal score ≥ 50% with 0+ required signals.',
      totalNetPnl: 50.063038,
      winRatePercent: 45,
      tradeCount: 51,
      roiPercent: 0.5484516092463451,
      bestTrade: { netPnl: 15.882259, coinTicker: 'ZEC' },
      worstTrade: { netPnl: -11.196086, coinTicker: 'HYPE' },
      activeTradeCount: 0,
      strategyName: 'Momentum Rider',
    },
    { rank: 2, agentId: 'a-2', agentName: 'Cholado', winRatePercent: 63, tradeCount: 8, totalNetPnl: -4.43 },
    { rank: 3, agentName: 'no id at all', winRatePercent: 100, tradeCount: 1 },
  ],
  currentUser: {
    userId: 'bb334a1e-2ac2-4956-8dea-7c7cf01097b9',
    agents: [
      { agentId: 'dc8776cd', agentName: 'Fade Master II', rank: 14, totalNetPnl: -4.46688081 },
      { agentId: '7b02ae32', agentName: 'Apex', rank: 18, totalNetPnl: -9.636564 },
    ],
  },
  generatedAt: '2026-08-03T07:06:28.526Z',
};

const LIVE_LEADERBOARD = {
  filter: { metric: 'PROFIT', timeframe: 'ALL_TIME' },
  leaderboard: [
    { rank: 1, userId: 'u-1', displayName: 'PrawnCocktail', value: 371.7 },
    { rank: 2, userId: 'u-2', displayName: 'Joke', value: 348.71 },
    { rank: 3, userId: 'u-3', value: 280.98 },
  ],
  currentUser: { userId: 'me', rank: 7, value: 37.51, percentile: 97 },
  generatedAt: '2026-08-03T07:02:44.088Z',
};

function adapterOver(respond: (req: ToolCallRequest) => unknown) {
  const calls: ToolCallRequest[] = [];
  const battlegrid: BattleGridPort = {
    buildAuthorizationUrl: () => '',
    exchangeCode: async () => {
      throw new Error('unused');
    },
    refresh: async () => {
      throw new Error('unused');
    },
    revoke: async () => {},
    callTool: async (req: ToolCallRequest) => {
      calls.push(req);
      return { content: respond(req) as Record<string, unknown> };
    },
  } as unknown as BattleGridPort;
  return { adapter: new McpExplorerAdapter(battlegrid), calls };
}

const who = { userId: 'u-1', accessToken: 't' };
const ask = { ...who, timeframe: 'ALL_TIME', sortBy: 'NET_PNL' } as const;

describe('the field, as the platform reports it', () => {
  it('keeps what was shown apart from what the field holds', async () => {
    const { adapter } = adapterOver(() => LIVE_FIELD);
    const result = await adapter.readField(ask);
    if (result.kind !== 'field') throw new Error(result.kind);
    // Three rows in, one unidentifiable, two mapped.
    expect(result.field.shown).toBe(2);
    expect(result.field.stats.totalAgents).toBe(37);
    // The two must never be reconciled into one number.
    expect(result.field.shown).not.toBe(result.field.stats.totalAgents);
  });

  it('leaves an unmeasured win rate unmeasured', async () => {
    const { adapter } = adapterOver(() => LIVE_FIELD);
    const result = await adapter.readField(ask);
    if (result.kind !== 'field') throw new Error(result.kind);
    const xai = result.field.vendors.find((v) => v.provider === 'xAI');
    // Zero here would say none of their trades won, about agents that have
    // not traded.
    expect(xai?.winRatePercent).toBeNull();
    expect(xai?.tradeCount).toBe(0);
    // And an absent average stays absent rather than becoming 0.
    expect(xai?.avgNetPnl).toBeNull();
  });

  it('drops a vendor and an agent it cannot attribute', async () => {
    const { adapter } = adapterOver(() => LIVE_FIELD);
    const result = await adapter.readField(ask);
    if (result.kind !== 'field') throw new Error(result.kind);
    expect(result.field.vendors.map((v) => v.provider)).toEqual(['Anthropic', 'xAI']);
    expect(result.field.agents.every((a) => a.agentId)).toBe(true);
  });

  it('carries each rate with the sample it came from', async () => {
    const { adapter } = adapterOver(() => LIVE_FIELD);
    const result = await adapter.readField(ask);
    if (result.kind !== 'field') throw new Error(result.kind);
    const top = result.field.agents[0];
    expect(top?.winRatePercent).toBe(45);
    expect(top?.tradeCount).toBe(51);
    // And the platform's own words, unparaphrased.
    expect(top?.subtitle).toBe('AGGRESSIVE · 1H · UP TO 10X');
    expect(top?.bestTrade).toEqual({ netPnl: 15.882259, coinTicker: 'ZEC' });
  });

  it('names this account’s own agents and their ranks', async () => {
    const { adapter } = adapterOver(() => LIVE_FIELD);
    const result = await adapter.readField(ask);
    if (result.kind !== 'field') throw new Error(result.kind);
    expect(result.field.ownAgents.map((a) => a.agentName)).toEqual(['Fade Master II', 'Apex']);
    expect(result.field.ownAgents[0]?.rank).toBe(14);
  });

  it('sends only the platform’s own enums', async () => {
    const { adapter, calls } = adapterOver(() => LIVE_FIELD);
    await adapter.readField({ ...who, timeframe: 'WEEKLY', sortBy: 'WIN_RATE', limit: 25 });
    expect(calls[0]?.tool).toBe('get_agent_explorer');
    expect(calls[0]?.args).toEqual({ timeframe: 'WEEKLY', sortBy: 'WIN_RATE', limit: 25 });
  });

  it('is unreadable, not empty, when the platform fails', async () => {
    const { adapter } = adapterOver(() => {
      throw new Error('BattleGrid timed out');
    });
    const result = await adapter.readField(ask);
    // An empty field would say this account competes against nobody.
    expect(result.kind).toBe('unreadable');
  });
});

describe('the leaderboard', () => {
  it('reads this account’s own standing', async () => {
    const { adapter } = adapterOver(() => LIVE_LEADERBOARD);
    const result = await adapter.readLeaderboard({
      ...who,
      metric: 'PROFIT',
      timeframe: 'ALL_TIME',
    });
    if (result.kind !== 'leaderboard') throw new Error(result.kind);
    expect(result.leaderboard.own).toEqual({
      rank: 7,
      value: 37.51,
      percentile: 97,
      userId: 'me',
    });
    // A row with no display name cannot be shown as a competitor.
    expect(result.leaderboard.entries.map((e) => e.displayName)).toEqual([
      'PrawnCocktail',
      'Joke',
    ]);
  });

  it('carries the platform’s id on both sides of the match', async () => {
    /**
     * The id exists for one purpose — marking which row is this account's —
     * and it is useless on one side alone. Asserted together for that reason:
     * a mapper that carried it on the rows and dropped it from the standing
     * would leave the surface unable to match, and would look correct in a
     * test that checked either half.
     */
    const { adapter } = adapterOver(() => LIVE_LEADERBOARD);
    const result = await adapter.readLeaderboard({
      ...who,
      metric: 'PROFIT',
      timeframe: 'ALL_TIME',
    });
    if (result.kind !== 'leaderboard') throw new Error(result.kind);
    expect(result.leaderboard.entries.map((e) => e.userId)).toEqual(['u-1', 'u-2']);
    expect(result.leaderboard.own?.userId).toBe('me');
  });

  it('keeps a row the platform declined to identify', async () => {
    // The id decides whether a row is *marked*, not whether it is shown.
    // Losing a ranked player to protect a marking is the worse trade.
    const { adapter } = adapterOver(() => ({
      ...LIVE_LEADERBOARD,
      leaderboard: [{ rank: 4, displayName: 'Anonymous', value: 9.5 }],
    }));
    const result = await adapter.readLeaderboard({
      ...who,
      metric: 'PROFIT',
      timeframe: 'ALL_TIME',
    });
    if (result.kind !== 'leaderboard') throw new Error(result.kind);
    expect(result.leaderboard.entries).toEqual([
      { rank: 4, displayName: 'Anonymous', value: 9.5, userId: null },
    ]);
  });

  it('reports no standing rather than a rank of zero', async () => {
    const { adapter } = adapterOver(() => ({
      ...LIVE_LEADERBOARD,
      // The platform answering with the envelope but placing nobody.
      currentUser: { userId: 'me' },
    }));
    const result = await adapter.readLeaderboard({
      ...who,
      metric: 'PROFIT',
      timeframe: 'ALL_TIME',
    });
    if (result.kind !== 'leaderboard') throw new Error(result.kind);
    expect(result.leaderboard.own).toBeNull();
  });
});

describe('the two reads fail apart', () => {
  const fakeExplorer = (field: FieldResult, leaderboard: LeaderboardResult): ExplorerPort => ({
    readField: async () => field,
    readLeaderboard: async () => leaderboard,
    // Unused by this query; the port is one interface and the compiler
    // rightly insists the stub be a whole one.
    readCompetitorPerformance: async () => ({ kind: 'none' }),
    readCompetitorTrades: async () => ({ kind: 'none' }),
    readCompetitorEvaluations: async () => ({ kind: 'none' }),
    readCompetitorOpenPositions: async () => ({ kind: 'none' }),
    readCompetitorEvaluationDetail: async () => ({ kind: 'none' }),
  });

  it('an unreadable leaderboard does not blank the field', async () => {
    const field: FieldResult = {
      kind: 'field',
      field: {
        stats: {
          totalAgents: 37,
          totalVolumeUsd: null,
          avgTradeSizeUsd: null,
          winRatePercent: 31,
          winCount: null,
          lossCount: null,
          totalNetPnl: -162,
          avgNetPnl: null,
        },
        agents: [],
        shown: 0,
        vendors: [],
        ownAgents: [],
        generatedAt: null,
      },
    };
    const query = new ReadFieldQuery(
      fakeExplorer(field, { kind: 'unreadable', reason: 'nope', cause: 'unreachable' }),
    );
    const view = await query.execute({ ...who, timeframe: 'ALL_TIME', sortBy: 'NET_PNL' });
    expect(view.field.kind).toBe('field');
    expect(view.leaderboard.kind).toBe('unreadable');
  });
});
