import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { McpExplorerAdapter } from '@/infrastructure/battlegrid/explorer-adapter.js';
import type { BattleGridPort, ToolCallRequest } from '@/ports/battlegrid.js';

/**
 * One evaluation's detail, mapped against the live shapes of 2026-08-03
 * (`Market Predator`'s ETH evaluation: 72 signals consulted, 12 fired).
 */

const LIVE_DETAIL = {
  log: {
    id: '96b4f817',
    coinTicker: 'ETH',
    aggregateScorePercent: 57,
    dominantBias: 'MIXED',
    hasConflictingSignals: true,
    terminalStatus: 'PASS',
    evaluatedAt: '2026-06-30T15:27:25.845Z',
    scorecard: {
      coinTicker: 'ETH',
      evaluatedAt: '2026-06-30T15:27:25.845Z',
      timeframesUsed: ['1h'],
      allEvaluatedSignals: [
        {
          id: 'macd_bull_divergence',
          module: 'MACD',
          triggered: true,
          score: 1,
          scorePercent: 100,
          bias: 'BULLISH',
          direction: 'LONG',
          details: 'MACD bull divergence: price lower but histogram rising',
          indicatorValues: { macd_histogram: -4.45112127, price: 1562.7 },
          isPrimary: false,
          required: false,
          effectiveAllocation: 1,
        },
        {
          id: 'rsi_oversold',
          module: 'RSI',
          triggered: false,
          score: 0,
          scorePercent: 0,
          bias: 'BULLISH',
          direction: 'LONG',
          details: 'RSI(14) at 38.1 — not oversold (threshold 30)',
          indicatorValues: { rsi14: 38.0982344 },
          isPrimary: false,
          required: false,
          effectiveAllocation: 1,
        },
        // No id — unattributable, dropped.
        { module: 'RSI', triggered: false, details: 'from nowhere' },
      ],
    },
    attributions: [
      {
        signalId: 'macd_bull_divergence',
        name: 'Bull Divergence',
        score: 1,
        scorePercent: 100,
        effectiveAllocation: 1,
        attributionPercent: 13,
      },
      { name: 'nameless', attributionPercent: 4 },
    ],
    pipeline: {
      evaluationGateStatus: 'ROUTED',
      evaluationGateReason: null,
      attempt: {
        result: 'LLM_APPROVED',
        reasonCodes: [],
        // Owner-private, nulled by the platform, never read by the adapter.
        ownerView: null,
        llmPartialReasoning: null,
      },
      decision: {
        decision: 'ENTER',
        direction: 'SHORT',
        convictionPercent: 62,
        entryPrice: 1562.7,
        stopLoss: 1582.44015785,
        takeProfit: 1503.47952646,
        riskRewardRatio: 3,
      },
      execution: {
        status: 'CLOSED',
        failureReason: null,
        expiryReason: null,
        executionMessage: null,
      },
      outcome: { tradeOutcome: 'LOSS', netPnl: -0.402459 },
      liveOverlay: null,
    },
  },
};

/** The live EXPIRED shape: an execution that ended, and no outcome. */
const LIVE_EXPIRED = {
  log: {
    ...LIVE_DETAIL.log,
    terminalStatus: 'EXPIRED',
    pipeline: {
      ...LIVE_DETAIL.log.pipeline,
      execution: {
        status: 'EXPIRED',
        failureReason: null,
        expiryReason: 'INDICATOR_FLIP',
        // JSON inside a string, exactly as the platform sends it.
        executionMessage:
          '{"kind":"INDICATOR_STATE","indicator":"emaCross","expected":"bearish","actual":"bullish"}',
      },
      outcome: null,
    },
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

const who = { userId: 'u-1', accessToken: 't', agentId: 'b731d127', logId: '96b4f817' };

describe('one evaluation, in full', () => {
  it('keeps the signals that did not fire', async () => {
    const { adapter } = adapterOver(() => LIVE_DETAIL);
    const r = await adapter.readCompetitorEvaluationDetail(who);
    if (r.kind !== 'value') throw new Error(r.kind);
    // Three rows in, one unattributable, two mapped — and only one fired.
    expect(r.value.signals).toHaveLength(2);
    expect(r.value.signals.filter((s) => s.triggered)).toHaveLength(1);
    const dismissed = r.value.signals.find((s) => !s.triggered);
    // The whole point of the surface: what it looked at and let go.
    expect(dismissed?.signalId).toBe('rsi_oversold');
    expect(dismissed?.details).toBe('RSI(14) at 38.1 — not oversold (threshold 30)');
    expect(dismissed?.indicatorValues).toEqual({ rsi14: 38.0982344 });
  });

  it('reads the attribution behind the score', async () => {
    const { adapter } = adapterOver(() => LIVE_DETAIL);
    const r = await adapter.readCompetitorEvaluationDetail(who);
    if (r.kind !== 'value') throw new Error(r.kind);
    // One attribution has no signalId and cannot be tied to a signal.
    expect(r.value.attributions).toHaveLength(1);
    expect(r.value.attributions[0]?.attributionPercent).toBe(13);
    expect(r.value.attributions[0]?.name).toBe('Bull Divergence');
  });

  it('reads the chain from gate to outcome', async () => {
    const { adapter } = adapterOver(() => LIVE_DETAIL);
    const r = await adapter.readCompetitorEvaluationDetail(who);
    if (r.kind !== 'value') throw new Error(r.kind);
    const c = r.value.chain;
    expect(c.gateStatus).toBe('ROUTED');
    expect(c.attemptResult).toBe('LLM_APPROVED');
    expect(c.decision).toBe('ENTER');
    expect(c.convictionPercent).toBe(62);
    expect(c.executionStatus).toBe('CLOSED');
    expect(c.tradeOutcome).toBe('LOSS');
    expect(c.netPnl).toBeCloseTo(-0.4, 2);
  });

  it('leaves a stage the platform did not record absent', async () => {
    const { adapter } = adapterOver(() => LIVE_EXPIRED);
    const r = await adapter.readCompetitorEvaluationDetail(who);
    if (r.kind !== 'value') throw new Error(r.kind);
    // An expired entry has an execution and no outcome. Null, not 0.
    expect(r.value.chain.executionStatus).toBe('EXPIRED');
    expect(r.value.chain.expiryReason).toBe('INDICATOR_FLIP');
    expect(r.value.chain.tradeOutcome).toBeNull();
    expect(r.value.chain.netPnl).toBeNull();
  });

  it('carries the execution message verbatim rather than parsing it', async () => {
    const { adapter } = adapterOver(() => LIVE_EXPIRED);
    const r = await adapter.readCompetitorEvaluationDetail(who);
    if (r.kind !== 'value') throw new Error(r.kind);
    // JSON in a string. Parsing it would model a shape seen once; the
    // clean enum above already says what happened.
    expect(r.value.chain.executionMessage).toBe(
      '{"kind":"INDICATOR_STATE","indicator":"emaCross","expected":"bearish","actual":"bullish"}',
    );
  });

  it('says none — not unreadable — when nothing is published', async () => {
    const { adapter } = adapterOver(() => ({ log: null }));
    // Every FAILED evaluation observed on 2026-08-03 answered this way,
    // and the list offers those rows regardless.
    expect((await adapter.readCompetitorEvaluationDetail(who)).kind).toBe('none');
  });

  it('is unreadable when the platform fails', async () => {
    const { adapter } = adapterOver(() => {
      throw new Error('down');
    });
    expect((await adapter.readCompetitorEvaluationDetail(who)).kind).toBe('unreadable');
  });

  it('sends both ids and nothing else', async () => {
    const { adapter, calls } = adapterOver(() => LIVE_DETAIL);
    await adapter.readCompetitorEvaluationDetail(who);
    expect(calls[0]?.tool).toBe('get_public_agent_signal_log_detail');
    expect(calls[0]?.args).toEqual({ agentId: 'b731d127', logId: '96b4f817' });
  });

  it('never reads the owner-private fields', () => {
    // A field the adapter does not name cannot leak into a surface by
    // accident, so this is asserted against the source rather than a call.
    // Comments are stripped first: the adapter *documents* why it leaves
    // these alone, and that explanation must not itself trip the check.
    const code = readFileSync('src/infrastructure/battlegrid/explorer-adapter.ts', 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    expect(code).not.toMatch(/ownerView/);
    expect(code).not.toMatch(/llmPartialReasoning/);
  });
});
