import { describe, expect, it } from 'vitest';
import { McpAgentAdapter } from '@/infrastructure/battlegrid/agent-adapter.js';
import type { BattleGridPort, ToolCallRequest } from '@/ports/battlegrid.js';

/**
 * The user's own evaluation, in full — mapped against the live shapes of
 * 2026-08-03 (this account's agent "Flow State": 64 signals consulted, 13
 * fired, one decision costing 4.8 cents).
 *
 * The property this file exists for: what the product shows about an agent
 * the user owns is at least what it shows about a stranger's, plus the
 * cost, which no public read carries.
 */

const LIVE_OWN = {
  log: {
    id: '816c9129',
    coinTicker: 'ENA',
    aggregateScorePercent: 40,
    dominantBias: 'BEARISH',
    hasConflictingSignals: true,
    terminalStatus: 'SKIPPED',
    evaluatedAt: '2026-08-03T05:00:00.000Z',
    scorecard: {
      timeframesUsed: ['1h'],
      allEvaluatedSignals: [
        {
          id: 'rsi_overbought',
          module: 'RSI',
          triggered: true,
          scorePercent: 100,
          bias: 'BEARISH',
          direction: 'SHORT',
          details: 'RSI(14) at 76.2 — overbought',
          indicatorValues: { rsi14: 76.2 },
          isPrimary: true,
          required: false,
          effectiveAllocation: 1,
        },
        {
          id: 'rsi_oversold',
          module: 'RSI',
          triggered: false,
          scorePercent: 0,
          bias: 'BULLISH',
          direction: 'LONG',
          details: 'RSI(14) at 76.2 — not oversold',
          indicatorValues: { rsi14: 76.2 },
          isPrimary: false,
          required: false,
          effectiveAllocation: 1,
        },
      ],
    },
    attributions: [
      { signalId: 'rsi_overbought', name: 'Overbought', scorePercent: 100, attributionPercent: 22 },
    ],
    pipeline: {
      evaluationGateStatus: 'ROUTED',
      attempt: {
        result: 'LLM_DECLINED',
        reasonCodes: [],
        // Owner-only, and populated here — nulled on every public read.
        ownerView: {
          provider: 'Anthropic',
          modelId: 'anthropic/claude-opus-4.6',
          modelDisplayName: 'Claude Opus 4.6',
          billingType: 'PLATFORM',
          costUsd: 0.047775,
          durationMs: 20711,
          errorMessage: null,
        },
        llmPartialReasoning: null,
      },
      decision: { decision: 'SKIP', direction: 'SHORT', convictionPercent: 20 },
      execution: null,
      outcome: null,
    },
  },
};

/** The live `get_signal_performance` payload for that same agent. */
const LIVE_FUNNEL = {
  totalEvaluations: 1,
  totalEntryDecisions: 1,
  enterCount: 0,
  skipCount: 1,
  pendingCount: 0,
  skippedCount: 0,
  executedCount: 0,
  failedCount: 0,
  expiredCount: 0,
  cancelledCount: 0,
  blockedCount: 0,
  avgAggregateScorePercent: 40,
  avgConvictionPercent: 20,
  // The platform reports no fill rate for an agent that filled nothing.
  fillRatePct: null,
  avgRiskRewardRatio: null,
  topCoinsByEvaluation: [{ coinTicker: 'ENA', count: 1 }, { count: 3 }],
  outcomeCount: 0,
  winCount: 0,
  lossCount: 0,
  winRatePercent: null,
  avgNetPnl: null,
  totalNetPnl: 0,
  avgDurationSeconds: null,
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
  return { adapter: new McpAgentAdapter(battlegrid), calls };
}

const who = { userId: 'owner', accessToken: 't', agentId: 'a-1' };

describe('the user’s own evaluation', () => {
  it('keeps the signals that did not fire', async () => {
    const { adapter } = adapterOver(() => LIVE_OWN);
    const r = await adapter.readOwnEvaluationDetail({ ...who, logId: 'l-1' });
    if (r.kind !== 'evaluation') throw new Error(r.kind);
    expect(r.evaluation.signals).toHaveLength(2);
    const dismissed = r.evaluation.signals.find((s) => !s.triggered);
    expect(dismissed?.details).toBe('RSI(14) at 76.2 — not oversold');
    // Same reading, opposite signal — the pair only makes sense with both.
    expect(dismissed?.indicatorValues).toEqual({ rsi14: 76.2 });
  });

  it('reads what the decision cost to think', async () => {
    const { adapter } = adapterOver(() => LIVE_OWN);
    const r = await adapter.readOwnEvaluationDetail({ ...who, logId: 'l-1' });
    if (r.kind !== 'evaluation') throw new Error(r.kind);
    // The one thing a competitor's page can never carry.
    expect(r.evaluation.cost?.costUsd).toBeCloseTo(0.047775, 6);
    expect(r.evaluation.cost?.durationMs).toBe(20711);
    expect(r.evaluation.cost?.modelDisplayName).toBe('Claude Opus 4.6');
    expect(r.evaluation.cost?.billingType).toBe('PLATFORM');
  });

  it('reports no cost rather than a cost of zero', async () => {
    const stripped = {
      log: {
        ...LIVE_OWN.log,
        pipeline: { ...LIVE_OWN.log.pipeline, attempt: { result: 'LLM_DECLINED', ownerView: null } },
      },
    };
    const { adapter } = adapterOver(() => stripped);
    const r = await adapter.readOwnEvaluationDetail({ ...who, logId: 'l-1' });
    if (r.kind !== 'evaluation') throw new Error(r.kind);
    // A price that was not published is not a price of nothing.
    expect(r.evaluation.cost).toBeNull();
  });

  it('reads the chain, omitting stages that did not happen', async () => {
    const { adapter } = adapterOver(() => LIVE_OWN);
    const r = await adapter.readOwnEvaluationDetail({ ...who, logId: 'l-1' });
    if (r.kind !== 'evaluation') throw new Error(r.kind);
    expect(r.evaluation.chain.attemptResult).toBe('LLM_DECLINED');
    expect(r.evaluation.chain.decision).toBe('SKIP');
    // A skip never executed, so there is no status and no outcome.
    expect(r.evaluation.chain.executionStatus).toBeNull();
    expect(r.evaluation.chain.tradeOutcome).toBeNull();
  });

  it('says none rather than unreadable when nothing is published', async () => {
    const { adapter } = adapterOver(() => ({ log: null }));
    expect((await adapter.readOwnEvaluationDetail({ ...who, logId: 'l-1' })).kind).toBe('none');
  });

  it('calls the owner-side tool with both ids', async () => {
    const { adapter, calls } = adapterOver(() => LIVE_OWN);
    await adapter.readOwnEvaluationDetail({ ...who, logId: 'l-1' });
    expect(calls[0]?.tool).toBe('get_signal_log');
    expect(calls[0]?.args).toEqual({ agentId: 'a-1', logId: 'l-1' });
  });
});

describe('the user’s own funnel', () => {
  it('keeps the two skip counters apart', async () => {
    const { adapter } = adapterOver(() => LIVE_FUNNEL);
    const r = await adapter.readOwnFunnel(who);
    if (r.kind !== 'funnel') throw new Error(r.kind);
    expect(r.funnel.skipDecisions).toBe(1);
    expect(r.funnel.skippedTerminal).toBe(0);
  });

  it('leaves an unmeasured rate unmeasured', async () => {
    const { adapter } = adapterOver(() => LIVE_FUNNEL);
    const r = await adapter.readOwnFunnel(who);
    if (r.kind !== 'funnel') throw new Error(r.kind);
    // An agent that filled nothing has no fill rate. Zero would say every
    // one of its orders failed.
    expect(r.funnel.fillRatePercent).toBeNull();
    expect(r.funnel.winRatePercent).toBeNull();
  });

  it('drops a top coin it cannot name', async () => {
    const { adapter } = adapterOver(() => LIVE_FUNNEL);
    const r = await adapter.readOwnFunnel(who);
    if (r.kind !== 'funnel') throw new Error(r.kind);
    expect(r.funnel.topCoins).toEqual([{ coinTicker: 'ENA', count: 1 }]);
  });

  it('says none rather than a funnel of zeros', async () => {
    const { adapter } = adapterOver(() => ({}));
    expect((await adapter.readOwnFunnel(who)).kind).toBe('none');
  });

  it('is unreadable when the platform fails', async () => {
    const { adapter } = adapterOver(() => {
      throw new Error('down');
    });
    expect((await adapter.readOwnFunnel(who)).kind).toBe('unreadable');
  });
});
