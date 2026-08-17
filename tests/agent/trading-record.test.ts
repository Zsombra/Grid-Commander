import { describe, expect, it } from 'vitest';
import { McpAgentAdapter } from '@/infrastructure/battlegrid/agent-adapter.js';
import {
  ReadTradingRecordQuery,
  summarize,
} from '@/application/use-cases/read-trading-record.query.js';
import type { BattleGridPort, ToolCallRequest } from '@/ports/battlegrid.js';
import { aTradeOutcome, FakeAgentsPort } from '../support/agent-fakes.js';

/** Exactly one row of the live `list_trade_outcomes` payload (2026-08-02). */
const LIVE_ROW = {
  id: '2f1c1f4e-3a2b-4c5d-8e9f-0a1b2c3d4e5f',
  decisionId: 'd-1',
  agentId: 'a-1',
  userId: 'u-1',
  coinTicker: 'MOODENG',
  closeReason: 'STOP_LOSS',
  closedBy: 'SYSTEM',
  direction: 'LONG',
  entryFillPrice: 0.041374,
  entryFillQuantity: 294,
  entryFee: 0.013987,
  exitFillPrice: 0.041072,
  exitFillQuantity: 294,
  exitFee: 0.017508,
  realizedPnl: -0.088788,
  totalFees: 0.031495,
  netPnl: -0.120283,
  slippageEntry: 0,
  slippageExit: 0.00028052,
  effectiveLeverage: 3,
  signalLogId: 'c21c5ccd-ca90-4ffb-82b4-895a9ae21a92',
  conviction: 0.55,
  openedAt: '2026-06-21T13:57:42.036Z',
  closedAt: '2026-06-21T17:40:55.965Z',
  durationSeconds: 13393,
  createdAt: '2026-06-21T17:40:55.965Z',
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

describe('mapping a closed trade', () => {
  it('keeps every money figure the platform sent', async () => {
    const { adapter, calls } = adapterOver(() => ({ outcomes: [LIVE_ROW], total: 42 }));
    const result = await adapter.readTradeOutcomes({ ...who, agentId: 'a-1', page: 2 });
    expect(result.kind).toBe('outcomes');
    if (result.kind !== 'outcomes') return;
    expect(result.total).toBe(42);
    const [trade] = result.outcomes;
    expect(trade).toEqual({
      id: LIVE_ROW.id,
      coinTicker: 'MOODENG',
      direction: 'LONG',
      closeReason: 'STOP_LOSS',
      closedBy: 'SYSTEM',
      entryFillPrice: 0.041374,
      exitFillPrice: 0.041072,
      realizedPnl: -0.088788,
      totalFees: 0.031495,
      netPnl: -0.120283,
      // Zero slippage is a measured zero, not a missing value.
      slippageEntry: 0,
      slippageExit: 0.00028052,
      effectiveLeverage: 3,
      conviction: 0.55,
      openedAt: LIVE_ROW.openedAt,
      closedAt: LIVE_ROW.closedAt,
      durationSeconds: 13393,
      decisionId: 'd-1',
      signalLogId: LIVE_ROW.signalLogId,
    });
    expect(calls[0]?.tool).toBe('list_trade_outcomes');
    expect(calls[0]?.args).toMatchObject({ agentId: 'a-1', page: 2 });
  });

  it('a missing figure stays null — never a zero that understates a loss', async () => {
    const { adapter } = adapterOver(() => ({
      outcomes: [{ id: 't1', coinTicker: 'PUMP', direction: 'SHORT' }],
    }));
    const result = await adapter.readTradeOutcomes({ ...who, agentId: 'a-1' });
    if (result.kind !== 'outcomes') throw new Error(result.kind);
    const [trade] = result.outcomes;
    expect(trade?.totalFees).toBeNull();
    expect(trade?.netPnl).toBeNull();
    expect(trade?.closeReason).toBeNull();
  });

  it('a row with no id or no market refuses the whole read', async () => {
    for (const bad of [{ coinTicker: 'PUMP' }, { id: 't1' }]) {
      const { adapter } = adapterOver(() => ({ outcomes: [bad] }));
      await expect(adapter.readTradeOutcomes({ ...who, agentId: 'a-1' })).rejects.toThrow();
    }
  });

  it('an empty page is "none", and a payload with no outcomes array is unreadable', async () => {
    const empty = adapterOver(() => ({ outcomes: [], total: 0 }));
    expect((await empty.adapter.readTradeOutcomes({ ...who, agentId: 'a-1' })).kind).toBe('none');
    const junk = adapterOver(() => ({ total: 3 }));
    expect((await junk.adapter.readTradeOutcomes({ ...who, agentId: 'a-1' })).kind).toBe('unreadable');
  });
});

describe('the derived summary', () => {
  it('counts wins, losses and flats, and totals net and fees', () => {
    const s = summarize([
      aTradeOutcome({ id: '1', netPnl: -0.12, totalFees: 0.03, durationSeconds: 100 }),
      aTradeOutcome({ id: '2', netPnl: 0.5, totalFees: 0.02, durationSeconds: 300, closeReason: 'TAKE_PROFIT' }),
      aTradeOutcome({ id: '3', netPnl: 0, totalFees: 0.01, durationSeconds: 200 }),
    ]);
    expect(s.closed).toBe(3);
    expect(s.wins).toBe(1);
    expect(s.losses).toBe(1);
    expect(s.flat).toBe(1);
    expect(s.netPnl).toBeCloseTo(0.38, 6);
    expect(s.feesPaid).toBeCloseTo(0.06, 6);
    expect(s.averageDurationSeconds).toBe(200);
    expect(s.closeReasons).toEqual([
      { reason: 'STOP_LOSS', count: 2 },
      { reason: 'TAKE_PROFIT', count: 1 },
    ]);
  });

  it('an unstated net is neither a win nor a loss nor flat', () => {
    const s = summarize([aTradeOutcome({ netPnl: null, totalFees: null })]);
    expect(s.wins).toBe(0);
    expect(s.losses).toBe(0);
    expect(s.flat).toBe(0);
    // Nothing to add up is zero to add up, not an invented loss.
    expect(s.netPnl).toBe(0);
  });

  it('an unstated close reason is counted as unstated, not dropped', () => {
    const s = summarize([aTradeOutcome({ closeReason: null })]);
    expect(s.closeReasons).toEqual([{ reason: 'unstated', count: 1 }]);
  });

  it('no stated duration leaves the average unknown rather than zero', () => {
    expect(summarize([aTradeOutcome({ durationSeconds: null })]).averageDurationSeconds).toBeNull();
  });
});

describe('the trading record query', () => {
  it('answers the page with its derived summary', async () => {
    const agents = new FakeAgentsPort([]);
    agents.tradeOutcomes = {
      kind: 'outcomes',
      outcomes: [aTradeOutcome({ id: '1' }), aTradeOutcome({ id: '2', netPnl: 1 })],
      total: 7,
    };
    const result = await new ReadTradingRecordQuery(agents).execute({ ...who, agentId: 'a-1', page: 3 });
    expect(result.kind).toBe('record');
    if (result.kind !== 'record') return;
    expect(result.summary.closed).toBe(2);
    expect(result.total).toBe(7);
    expect(result.page).toBe(3);
  });

  it('an agent that never traded is "none", not a summary of zeros', async () => {
    const agents = new FakeAgentsPort([]);
    agents.tradeOutcomes = { kind: 'none' };
    expect((await new ReadTradingRecordQuery(agents).execute({ ...who, agentId: 'a-1' })).kind).toBe(
      'none',
    );
  });

  it('an unreadable record stays unreadable', async () => {
    const agents = new FakeAgentsPort([]);
    agents.tradeOutcomes = { kind: 'unreadable', reason: 'BattleGrid timed out', cause: 'unreachable' };
    const result = await new ReadTradingRecordQuery(agents).execute({ ...who, agentId: 'a-1' });
    expect(result.kind).toBe('unreadable');
  });
});
