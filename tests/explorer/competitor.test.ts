import { describe, expect, it } from 'vitest';
import { McpExplorerAdapter } from '@/infrastructure/battlegrid/explorer-adapter.js';
import type { BattleGridPort, ToolCallRequest } from '@/ports/battlegrid.js';

/**
 * One competitor's public record, mapped against the live shapes of
 * 2026-08-03 (`Market Predator`, rank 1, 51 trades, +$50.06).
 */

/** Live `get_public_agent_signal_performance`, verbatim in shape. */
const LIVE_PERF = {
  totalEvaluations: 245,
  totalEntryDecisions: 102,
  enterCount: 73,
  skipCount: 29,
  pendingCount: 0,
  skippedCount: 0,
  executedCount: 51,
  failedCount: 9,
  expiredCount: 13,
  cancelledCount: 0,
  blockedCount: 0,
  avgAggregateScore: 0.626930612244898,
  avgAggregateScorePercent: 63,
  avgConviction: 0.48980392156862745,
  avgConvictionPercent: 49,
  fillRatePct: 76,
  avgRiskRewardRatio: 2.2647397260273974,
  topCoinsByEvaluation: [
    { coinTicker: 'ENA', count: 21 },
    { coinTicker: 'FARTCOIN', count: 19 },
    { count: 3 },
  ],
  outcomeCount: 51,
  winCount: 23,
  lossCount: 28,
  winRate: 0.45098039215686275,
  winRatePercent: 45.1,
  avgNetPnl: 0.9816281960784313,
  totalNetPnl: 50.063038,
  avgDurationSeconds: 33937.98039215686,
};

const LIVE_TRADES = {
  trades: [
    {
      outcomeId: 'ee856719-2ab8-4ef8-ae55-60c164fa8c72',
      positionId: 'ee856719-2ab8-4ef8-ae55-60c164fa8c72',
      coinTicker: 'ETH',
      direction: 'SHORT',
      entryFillPrice: 1565.7,
      exitFillPrice: 1584,
      entryFillQuantity: 0.0176,
      netPnl: -0.402459,
      isWin: false,
      movePercent: 1.1688062847288723,
      roePercent: -14.604961765576824,
      closeReason: 'MARKET_CLOSE',
      leverage: 10,
      conviction: 0.62,
      openedAt: '2026-06-30T15:28:58.295Z',
      closedAt: '2026-07-01T03:17:38.949Z',
      durationSeconds: 42520,
      signalLogId: '96b4f817-dabe-4a1d-aea3-59f2c9bbdd1d',
    },
    // A trade that broke even: isWin false, netPnl 0. The flag is the
    // platform's verdict and must not be re-derived from the figure.
    { outcomeId: 't-2', coinTicker: 'BTC', netPnl: 0, isWin: false },
    { coinTicker: 'no id', netPnl: 5 },
  ],
  total: 51,
  page: 1,
  limit: 20,
};

const LIVE_LOGS = {
  entries: [
    {
      id: 'fc0978d5-baeb-4375-8d5f-0e0529b4a967',
      agentId: 'b731d127',
      coinTicker: 'BTC',
      assessmentDirection: 'DOWN',
      aggregateScore: 0.647,
      aggregateScorePercent: 65,
      dominantBias: 'BEARISH',
      hasConflictingSignals: true,
      triggeredSignalCount: 14,
      primarySignalCount: 6,
      evaluatedAt: '2026-07-01T03:30:15.167Z',
      atrPct: 0.739,
      evaluationGateStatus: 'ROUTED',
      evaluationGateReason: null,
      effectiveMinAggregateScore: 0.5,
      effectiveMinAggregateScorePercent: 50,
      terminalStatus: 'EXPIRED',
      signalSource: 'CONVERSATIONAL',
    },
  ],
  total: 245,
};

/** The only snapshot shape ever observed: an envelope with nothing in it. */
const LIVE_SNAPSHOT = {
  snapshot: {
    unrealizedPnl: 0,
    openPositionCount: 0,
    positions: [],
    fetchedAt: '2026-08-03T09:36:43.724Z',
  },
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

const who = { userId: 'u-1', accessToken: 't', agentId: 'b731d127' };

describe('a competitor’s funnel', () => {
  it('keeps the two skip counters apart', async () => {
    const { adapter } = adapterOver(() => LIVE_PERF);
    const r = await adapter.readCompetitorPerformance(who);
    if (r.kind !== 'value') throw new Error(r.kind);
    // Decisions that were SKIP.
    expect(r.value.skipDecisions).toBe(29);
    // Pipelines whose terminal status was SKIPPED. A different question.
    expect(r.value.skippedTerminal).toBe(0);
  });

  it('reads the funnel as the platform counts it', async () => {
    const { adapter } = adapterOver(() => LIVE_PERF);
    const r = await adapter.readCompetitorPerformance(who);
    if (r.kind !== 'value') throw new Error(r.kind);
    expect(r.value.totalEvaluations).toBe(245);
    expect(r.value.totalDecisions).toBe(102);
    // 73 entered = 51 executed + 9 failed + 13 expired.
    expect(r.value.enterDecisions).toBe(73);
    expect(
      (r.value.executed ?? 0) + (r.value.failed ?? 0) + (r.value.expired ?? 0),
    ).toBe(r.value.enterDecisions);
    // Precision is the platform's, not rounded to match the field list's 45.
    expect(r.value.winRatePercent).toBe(45.1);
  });

  it('drops a top coin it cannot name', async () => {
    const { adapter } = adapterOver(() => LIVE_PERF);
    const r = await adapter.readCompetitorPerformance(who);
    if (r.kind !== 'value') throw new Error(r.kind);
    expect(r.value.topCoins.map((c) => c.coinTicker)).toEqual(['ENA', 'FARTCOIN']);
  });

  it('reports no record rather than a funnel of nulls', async () => {
    const { adapter } = adapterOver(() => ({}));
    const r = await adapter.readCompetitorPerformance(who);
    expect(r.kind).toBe('none');
  });

  it('is unreadable when the platform fails', async () => {
    const { adapter } = adapterOver(() => {
      throw new Error('down');
    });
    expect((await adapter.readCompetitorPerformance(who)).kind).toBe('unreadable');
  });
});

describe('a competitor’s trades', () => {
  it('keeps the platform’s own win flag rather than deriving one', async () => {
    const { adapter } = adapterOver(() => LIVE_TRADES);
    const r = await adapter.readCompetitorTrades(who);
    if (r.kind !== 'value') throw new Error(r.kind);
    const breakEven = r.value.find((t) => t.id === 't-2');
    // netPnl 0 with isWin false. Deriving `netPnl > 0` would agree here by
    // luck; deriving `netPnl >= 0` would not. The platform decides.
    expect(breakEven?.netPnl).toBe(0);
    expect(breakEven?.isWin).toBe(false);
  });

  it('carries the link back to the reasoning, and the total', async () => {
    const { adapter } = adapterOver(() => LIVE_TRADES);
    const r = await adapter.readCompetitorTrades(who);
    if (r.kind !== 'value') throw new Error(r.kind);
    expect(r.value[0]?.signalLogId).toBe('96b4f817-dabe-4a1d-aea3-59f2c9bbdd1d');
    expect(r.value[0]?.roePercent).toBeCloseTo(-14.6, 1);
    // Three rows in, one unidentifiable.
    expect(r.value).toHaveLength(2);
    expect(r.total).toBe(51);
  });

  it('says none rather than unreadable for an agent that closed nothing', async () => {
    const { adapter } = adapterOver(() => ({ trades: [], total: 0 }));
    expect((await adapter.readCompetitorTrades(who)).kind).toBe('none');
  });

  it('sends the agent id and the platform’s own window', async () => {
    const { adapter, calls } = adapterOver(() => LIVE_TRADES);
    await adapter.readCompetitorTrades({ ...who, timeframe: '7D', limit: 5 });
    expect(calls[0]?.tool).toBe('get_public_agent_realized_trades');
    expect(calls[0]?.args).toEqual({ agentId: 'b731d127', timeframe: '7D', limit: 5 });
  });
});

describe('a competitor’s evaluations', () => {
  it('reads the score against the threshold in force at the time', async () => {
    const { adapter } = adapterOver(() => LIVE_LOGS);
    const r = await adapter.readCompetitorEvaluations(who);
    if (r.kind !== 'value') throw new Error(r.kind);
    const e = r.value[0];
    expect(e?.aggregateScorePercent).toBe(65);
    // Not the agent's setting today — the bar this run was measured on.
    expect(e?.minAggregateScorePercent).toBe(50);
    expect(e?.hasConflictingSignals).toBe(true);
    expect(e?.terminalStatus).toBe('EXPIRED');
    expect(e?.signalSource).toBe('CONVERSATIONAL');
    expect(r.total).toBe(245);
  });
});

describe('a competitor’s open positions', () => {
  it('reads the envelope and does not interpret the rows', async () => {
    const { adapter } = adapterOver(() => LIVE_SNAPSHOT);
    const r = await adapter.readCompetitorOpenPositions(who);
    if (r.kind !== 'value') throw new Error(r.kind);
    expect(r.value.openPositionCount).toBe(0);
    expect(r.value.unrealizedPnl).toBe(0);
    // Carried through untouched: no live position has ever been observed,
    // so the row shape is not modelled. See
    // `open-position-rows-are-unobserved`.
    expect(r.value.positionsUnmodelled).toEqual([]);
  });

  it('says none when the platform sends no snapshot', async () => {
    const { adapter } = adapterOver(() => ({ snapshot: null }));
    expect((await adapter.readCompetitorOpenPositions(who)).kind).toBe('none');
  });

  it('is called for a rival, not only for one of ours', async () => {
    const { adapter, calls } = adapterOver(() => LIVE_SNAPSHOT);
    await adapter.readCompetitorOpenPositions(who);
    // The tool's argument description claims "one of your agent UUIDs";
    // its summary says any public agent, and calling it live on a rival
    // settled that on 2026-08-03. Nothing here filters by ownership.
    expect(calls[0]?.args).toEqual({ agentId: 'b731d127' });
  });
});
