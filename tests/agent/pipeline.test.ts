import { describe, expect, it } from 'vitest';
import { McpAgentAdapter } from '@/infrastructure/battlegrid/agent-adapter.js';
import { ReadPipelineQuery } from '@/application/use-cases/read-pipeline.query.js';
import type { BattleGridPort, ToolCallRequest } from '@/ports/battlegrid.js';
import { FakeAgentsPort } from '../support/agent-fakes.js';

/** Live rows of 2026-08-03, verbatim in shape. */
const LIVE_BLOCK = {
  id: '5a54a838-879d-46af-bdfd-c0617b235bbf',
  agentId: 'a-1',
  userId: 'u-1',
  coinTicker: null,
  gateStage: 'ACCOUNT',
  reasonCode: 'INSUFFICIENT_EQUITY',
  reasonDetail: { equityUsd: 2.179006, thresholdUsd: 10 },
  sourceThoughtLogId: '85317cd0-d6c5-4ef0-92ea-cdb985049957',
  createdAt: '2026-06-26T11:51:18.218Z',
};

const LIVE_EVAL = {
  id: '816c9129-b9ac-40aa-9e3e-f813bdcba93e',
  coinTicker: 'ETH',
  assessmentConfidence: 0.52,
  assessmentDirection: 'UP',
  aggregateScore: 0.993,
  dominantBias: 'BEARISH',
  hasConflictingSignals: true,
  triggeredSignalCount: 12,
  primarySignalCount: 11,
  evaluatedAt: '2026-06-21T13:52:07.202Z',
  atrPct: 0.5063,
  evaluationGateStatus: 'ROUTED',
  evaluationGateReason: null,
  effectiveMinAggregateScore: 0.45,
  effectiveMinRequiredCount: 2,
  terminalStatus: 'SKIPPED',
  signalSource: 'MARKET_GRID',
};

const LIVE_DECISION = {
  id: '8796d4a1-2eb2-4d17-b6f0-39d9d3c3d1bf',
  signalLogId: '816c9129-b9ac-40aa-9e3e-f813bdcba93e',
  coinTicker: 'ETH',
  decision: 'SKIP',
  direction: 'LONG',
  conviction: 0.2,
  entryPrice: null,
  stopLoss: null,
  takeProfit: null,
  reasoning: 'Despite the pre-validated LONG setup, the weight of evidence is overwhelmingly bearish.',
  status: 'SKIPPED',
  // The list row carries the checklist already — `get_entry_decision`
  // returns these same keys and is never called.
  signalChecklist: [
    {
      signalId: 'rsi_overbought',
      label: 'RSI(14) Overbought',
      verdict: 'CONFIRM',
      interpretation: 'RSI deep in overbought territory, now pulling back from peak',
    },
    {
      signalId: 'ema_alignment',
      label: 'EMA Alignment',
      verdict: 'WARN',
      interpretation: 'Higher timeframe trend still points up',
    },
    { signalId: 'cvd_divergence', label: 'CVD Divergence', verdict: 'REJECT', interpretation: null },
    // No signalId — unattributable evidence, dropped rather than blanked.
    { label: 'mystery', verdict: 'CONFIRM', interpretation: 'from nowhere' },
  ],
  signalModulesUsed: ['momentum', 'trend'],
  timeHorizon: '1h',
  positionSizePct: null,
  positionSizePreset: null,
  atrPct: 0.5063,
  expiresAt: '2026-06-21T13:53:33.397Z',
  executedAt: null,
  executedOrderId: null,
  stopLossOrderId: null,
  takeProfitOrderId: null,
  createdAt: '2026-06-21T13:52:30.000Z',
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
    discoverTools: async () => [],
    callTool: async (request) => {
      calls.push(request);
      return {
        content: respond(request),
        classification: {
          mutating: false,
          destructive: false,
          requiredScope: 'mcp:read',
          basis: 'annotations',
        },
        auditEntryId: 'a1',
      };
    },
  };
  return { adapter: new McpAgentAdapter(battlegrid), calls };
}

const who = { userId: 'u1', accessToken: 'at' };

describe('mapping the pipeline stages', () => {
  it('a gate block keeps its code AND the numbers behind it', async () => {
    const { adapter, calls } = adapterOver(() => ({ entries: [LIVE_BLOCK], total: 4 }));
    const result = await adapter.readGateBlocks({ ...who, agentId: 'a-1', limit: 10 });
    expect(result.kind).toBe('entries');
    if (result.kind !== 'entries') return;
    expect(result.total).toBe(4);
    expect(result.entries[0]).toEqual({
      id: LIVE_BLOCK.id,
      // Account-stage blocks are about the account, not a market.
      coinTicker: null,
      gateStage: 'ACCOUNT',
      reasonCode: 'INSUFFICIENT_EQUITY',
      reasonDetail: { equityUsd: 2.179006, thresholdUsd: 10 },
      at: LIVE_BLOCK.createdAt,
    });
    expect(calls[0]?.tool).toBe('list_gate_blocks');
    expect(calls[0]?.args).toMatchObject({ agentId: 'a-1', limit: 10 });
  });

  it('an evaluation keeps the threshold that was in force, not today’s', async () => {
    const { adapter } = adapterOver(() => ({ entries: [LIVE_EVAL] }));
    const result = await adapter.readSignalLogs({ ...who, agentId: 'a-1' });
    if (result.kind !== 'entries') throw new Error(result.kind);
    const e = result.entries[0];
    expect(e?.aggregateScore).toBe(0.993);
    expect(e?.minAggregateScore).toBe(0.45);
    expect(e?.minRequiredCount).toBe(2);
    expect(e?.dominantBias).toBe('BEARISH');
    expect(e?.hasConflictingSignals).toBe(true);
    expect(e?.terminalStatus).toBe('SKIPPED');
    expect(e?.gateStatus).toBe('ROUTED');
    expect(e?.at).toBe(LIVE_EVAL.evaluatedAt);
  });

  it('a decision keeps the agent’s reasoning whole', async () => {
    const { adapter } = adapterOver(() => ({ entries: [LIVE_DECISION] }));
    const result = await adapter.readEntryDecisions({ ...who, agentId: 'a-1' });
    if (result.kind !== 'entries') throw new Error(result.kind);
    const d = result.entries[0];
    expect(d?.decision).toBe('SKIP');
    expect(d?.conviction).toBe(0.2);
    expect(d?.reasoning).toBe(LIVE_DECISION.reasoning);
    // Absent levels stay absent — a skip has no entry price, and 0 would be one.
    expect(d?.entryPrice).toBeNull();
  });

  it('a decision carries the evidence it was drawn from', async () => {
    const { adapter } = adapterOver(() => ({ entries: [LIVE_DECISION] }));
    const result = await adapter.readEntryDecisions({ ...who, agentId: 'a-1' });
    if (result.kind !== 'entries') throw new Error(result.kind);
    const d = result.entries[0];
    // Four rows in, three out — the one with no signalId cannot be
    // attributed to a signal anyone could look up, so it is dropped.
    expect(d?.checklist).toHaveLength(3);
    expect(d?.checklist[0]?.signalId).toBe('rsi_overbought');
    expect(d?.checklist[0]?.label).toBe('RSI(14) Overbought');
    // Three verdicts stay three. Collapsing WARN into either edge would
    // report certainty the agent did not have.
    expect(d?.checklist.map((s) => s.verdict)).toEqual(['CONFIRM', 'WARN', 'REJECT']);
    // An interpretation the platform omitted stays null, not ''.
    expect(d?.checklist[2]?.interpretation).toBeNull();
    expect(d?.timeHorizon).toBe('1h');
    expect(d?.atrPct).toBe(0.5063);
  });

  it('a decision with no checklist is a decision, not a failure', async () => {
    const bare = { ...LIVE_DECISION, signalChecklist: undefined };
    const { adapter } = adapterOver(() => ({ entries: [bare] }));
    const result = await adapter.readEntryDecisions({ ...who, agentId: 'a-1' });
    if (result.kind !== 'entries') throw new Error(result.kind);
    expect(result.entries[0]?.checklist).toEqual([]);
    expect(result.entries[0]?.reasoning).toBe(LIVE_DECISION.reasoning);
  });

  it('an executed decision keeps the ids of the orders it placed', async () => {
    const executed = {
      ...LIVE_DECISION,
      decision: 'ENTER',
      status: 'EXECUTED',
      positionSizePct: 30,
      positionSizePreset: 'SMALL',
      executedOrderId: '475192822193',
      stopLossOrderId: '475192822195',
      takeProfitOrderId: '475192822194',
    };
    const { adapter } = adapterOver(() => ({ entries: [executed] }));
    const result = await adapter.readEntryDecisions({ ...who, agentId: 'a-1' });
    if (result.kind !== 'entries') throw new Error(result.kind);
    const d = result.entries[0];
    expect(d?.executedOrderId).toBe('475192822193');
    expect(d?.stopLossOrderId).toBe('475192822195');
    expect(d?.takeProfitOrderId).toBe('475192822194');
    expect(d?.positionSizePct).toBe(30);
    expect(d?.positionSizePreset).toBe('SMALL');
  });

  it('every stage tells empty from unreadable from malformed', async () => {
    const empty = adapterOver(() => ({ entries: [], total: 0 }));
    expect((await empty.adapter.readGateBlocks({ ...who, agentId: 'a' })).kind).toBe('none');
    const junk = adapterOver(() => ({ total: 2 }));
    expect((await junk.adapter.readSignalLogs({ ...who, agentId: 'a' })).kind).toBe('unreadable');
  });

  it('a row with no id refuses the read rather than rendering a nameless line', async () => {
    const { adapter } = adapterOver(() => ({ entries: [{ reasonCode: 'X' }] }));
    await expect(adapter.readGateBlocks({ ...who, agentId: 'a' })).rejects.toThrow();
  });
});

describe('the pipeline query', () => {
  it('keeps the three stages apart so one failure hides nothing', async () => {
    const agents = new FakeAgentsPort([]);
    agents.gateBlocks = { kind: 'unreadable', reason: 'BattleGrid timed out', cause: 'unreachable' };
    agents.signalLogs = {
      kind: 'entries',
      entries: [
        {
          id: 'e1',
          coinTicker: 'ETH',
          aggregateScore: 0.9,
          minAggregateScore: 0.45,
          minRequiredCount: 2,
          triggeredSignalCount: 12,
          dominantBias: 'BEARISH',
          assessmentDirection: 'UP',
          hasConflictingSignals: true,
          gateStatus: 'ROUTED',
          gateReason: null,
          terminalStatus: 'SKIPPED',
          at: null,
        },
      ],
      total: 1,
    };
    agents.entryDecisions = { kind: 'none' };

    const result = await new ReadPipelineQuery(agents).execute({ ...who, agentId: 'a-1' });
    // One stage down, the other two still answer for themselves.
    expect(result.blocks.kind).toBe('unreadable');
    expect(result.evaluations.kind).toBe('entries');
    expect(result.decisions.kind).toBe('none');
  });
});
