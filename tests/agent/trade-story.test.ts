import { describe, expect, it } from 'vitest';
import { McpAgentAdapter } from '@/infrastructure/battlegrid/agent-adapter.js';
import { ReadTradeStoryQuery } from '@/application/use-cases/read-trade-story.query.js';
import type { BattleGridPort, ToolCallRequest } from '@/ports/battlegrid.js';
import { aTradeChart, anAuditEvent, FakeAgentsPort } from '../support/agent-fakes.js';

/**
 * The trade story's two halves, from the wire in.
 *
 * The fixtures are the live payloads of 2026-08-08 — six READY charts and a
 * ten-event audit trail on `THE .0`'s settled trades, recorded in
 * `trading-telemetry-is-unread`. Where a test asserts a price, it asserts
 * the exact string the platform sent: the audit trail's prices are decimal
 * strings, and any float excursion would show up as a reformat here.
 */

/** The live READY payload, cut to two candles. */
const READY = {
  result: {
    status: 'READY',
    chart: {
      signalLogId: 'dbd15ad8-1111-2222-3333-444444444444',
      positionId: '9c1ab13a-5555-6666-7777-888888888888',
      coinTicker: 'WIF',
      timeframe: '5m',
      source: 'dwellir-hyperliquid-index',
      windowStart: '2026-08-07T22:45:00.000Z',
      windowEnd: '2026-08-08T05:35:00.000Z',
      windowStartTimeSeconds: 1786142700,
      windowEndTimeSeconds: 1786167300,
      candles: [
        {
          openTime: '2026-08-07T22:45:00.000Z',
          timeSeconds: 1786142700,
          open: 0.1371,
          high: 0.13714,
          low: 0.1371,
          close: 0.13711,
          volume: 991,
        },
        {
          openTime: '2026-08-07T22:50:00.000Z',
          timeSeconds: 1786143000,
          open: 0.13711,
          high: 0.13792,
          low: 0.13701,
          close: 0.13788,
          volume: 1240,
        },
      ],
      levels: [
        { role: 'STOP_LOSS', label: 'Stop Loss', price: 0.1368296 },
        { role: 'TAKE_PROFIT', label: 'Take Profit', price: 0.1409912 },
      ],
      markers: [
        { role: 'ENTRY', timeSeconds: 1786144500, price: 0.13783108 },
        { role: 'EXIT', timeSeconds: 1786165500, price: 0.14099 },
      ],
      snapshotCapturedAt: '2026-08-08T05:41:24.459Z',
    },
  },
};

/** Three live audit rows: placement, entry fill, break-even reprice. */
const AUDIT = {
  positionId: '9c1ab13a-5555-6666-7777-888888888888',
  events: [
    {
      leg: 'TP',
      orderId: 'cb93aecb-0d83-4c89-9c30-cd959c577f58',
      createdAt: '2026-08-07T23:17:07.305Z',
      heldMs: null,
      vsEntryPct: 2.29,
      kind: 'TP_PLACED',
      price: '0.14099120',
    },
    {
      leg: 'ENTRY',
      orderId: 'e60a8169-e0ab-4ba2-9371-bb06b5fca361',
      createdAt: '2026-08-07T23:17:11.326Z',
      heldMs: 5806,
      vsEntryPct: null,
      kind: 'ENTRY_FILLED',
      price: '0.13783108333333335',
    },
    {
      leg: 'SL',
      orderId: '70c38afa-7bce-440c-abd6-009db2412fa6',
      createdAt: '2026-08-08T04:11:43.331Z',
      heldMs: 17674218,
      vsEntryPct: 0.14,
      kind: 'SL_REPLACED',
      fromPrice: '0.13682960',
      toPrice: '0.13802000',
      triggerDeltaPct: 0.87,
      improved: true,
      repriceSource: 'BREAK_EVEN',
      replacementOrderId: '371fa73d-9759-4fc2-be57-49b0565a09fe',
    },
  ],
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

describe('the chart read', () => {
  it('maps a READY chart whole, from the live payload', async () => {
    const { adapter, calls } = adapterOver(() => READY);
    const result = await adapter.readTradeChart({ ...who, agentId: 'a1', logId: 'l1' });
    if (result.kind !== 'chart') throw new Error(`expected chart, got ${result.kind}`);

    expect(calls[0]?.tool).toBe('get_trade_chart');
    expect(calls[0]?.args).toEqual({ agentId: 'a1', logId: 'l1' });

    const c = result.chart;
    expect(c.positionId).toBe('9c1ab13a-5555-6666-7777-888888888888');
    expect(c.coinTicker).toBe('WIF');
    expect(c.timeframe).toBe('5m');
    expect(c.candles).toHaveLength(2);
    expect(c.candles[0]).toEqual({
      openTime: '2026-08-07T22:45:00.000Z',
      timeSeconds: 1786142700,
      open: 0.1371,
      high: 0.13714,
      low: 0.1371,
      close: 0.13711,
      volume: 991,
    });
    // The platform's display label arrives beside its role. Both carried.
    expect(c.levels.map((l) => `${l.role}/${String(l.label)}/${String(l.price)}`)).toEqual([
      'STOP_LOSS/Stop Loss/0.1368296',
      'TAKE_PROFIT/Take Profit/0.1409912',
    ]);
    expect(c.markers.map((m) => m.role)).toEqual(['ENTRY', 'EXIT']);
    expect(c.snapshotCapturedAt).toBe('2026-08-08T05:41:24.459Z');
  });

  it('reads UNAVAILABLE as an evaluation that never became a trade', async () => {
    const { adapter } = adapterOver(() => ({ result: { status: 'UNAVAILABLE' } }));
    const result = await adapter.readTradeChart({ ...who, agentId: 'a1', logId: 'l1' });
    expect(result.kind).toBe('no-trade');
  });

  it('reads NOT_FOUND as an evaluation that is not this agent’s', async () => {
    const { adapter } = adapterOver(() => ({ result: { status: 'NOT_FOUND' } }));
    const result = await adapter.readTradeChart({ ...who, agentId: 'a1', logId: 'l1' });
    expect(result.kind).toBe('not-found');
  });

  it('reports a status it does not know, naming the word', async () => {
    const { adapter } = adapterOver(() => ({ result: { status: 'PENDING_SOMEHOW' } }));
    const result = await adapter.readTradeChart({ ...who, agentId: 'a1', logId: 'l1' });
    if (result.kind !== 'unreadable') throw new Error(`expected unreadable, got ${result.kind}`);
    expect(result.reason).toContain('PENDING_SOMEHOW');
  });

  it('reports READY-with-no-chart as an answer that was not one', async () => {
    const { adapter } = adapterOver(() => ({ result: { status: 'READY' } }));
    const result = await adapter.readTradeChart({ ...who, agentId: 'a1', logId: 'l1' });
    expect(result.kind).toBe('unreadable');
  });

  it('reports a failed call as unreadable, never as not-found', async () => {
    const { adapter } = adapterOver(() => {
      throw new Error('BattleGrid did not respond');
    });
    const result = await adapter.readTradeChart({ ...who, agentId: 'a1', logId: 'l1' });
    if (result.kind !== 'unreadable') throw new Error(`expected unreadable, got ${result.kind}`);
    expect(result.reason).toContain('did not respond');
  });
});

describe('the audit-trail read', () => {
  it('maps the live events with prices as the exact strings sent', async () => {
    const { adapter, calls } = adapterOver(() => AUDIT);
    const result = await adapter.readPositionAudit({ ...who, agentId: 'a1', positionId: 'p1' });
    if (result.kind !== 'events') throw new Error(`expected events, got ${result.kind}`);

    expect(calls[0]?.tool).toBe('get_position_audit_history');
    expect(calls[0]?.args).toEqual({ agentId: 'a1', positionId: 'p1' });
    expect(result.events).toHaveLength(3);

    const [placed, entry, reprice] = result.events;
    // String equality is the point: '0.14099120' reformatted through a float
    // would come back '0.1409912' and this line would say so.
    expect(placed?.price).toBe('0.14099120');
    expect(placed?.heldMs).toBeNull();

    // The entry event is the baseline — its vsEntryPct is null, not zero.
    expect(entry?.kind).toBe('ENTRY_FILLED');
    expect(entry?.vsEntryPct).toBeNull();
    expect(entry?.price).toBe('0.13783108333333335');

    expect(reprice?.fromPrice).toBe('0.13682960');
    expect(reprice?.toPrice).toBe('0.13802000');
    expect(reprice?.triggerDeltaPct).toBe(0.87);
    expect(reprice?.improved).toBe(true);
    expect(reprice?.repriceSource).toBe('BREAK_EVEN');
    expect(reprice?.replacementOrderId).toBe('371fa73d-9759-4fc2-be57-49b0565a09fe');
  });

  it('carries an event kind it does not recognise', async () => {
    const { adapter } = adapterOver(() => ({
      events: [{ kind: 'MARGIN_TOPPED_UP', leg: 'SL', createdAt: '2026-08-08T00:00:00Z' }],
    }));
    const result = await adapter.readPositionAudit({ ...who, agentId: 'a1', positionId: 'p1' });
    if (result.kind !== 'events') throw new Error(`expected events, got ${result.kind}`);
    expect(result.events[0]?.kind).toBe('MARGIN_TOPPED_UP');
  });

  it('reads an empty trail as none, and a missing one as unreadable', async () => {
    const { adapter } = adapterOver(() => ({ events: [] }));
    expect(
      (await adapter.readPositionAudit({ ...who, agentId: 'a1', positionId: 'p1' })).kind,
    ).toBe('none');

    const { adapter: broken } = adapterOver(() => ({ positionId: 'p1' }));
    expect(
      (await broken.readPositionAudit({ ...who, agentId: 'a1', positionId: 'p1' })).kind,
    ).toBe('unreadable');
  });
});

describe('the story query', () => {
  const who2 = { userId: 'u1', accessToken: 'at', agentId: 'a1', logId: 'l1' };

  it('joins the trail through the chart’s positionId', async () => {
    const agents = new FakeAgentsPort();
    agents.tradeChart = { kind: 'chart', chart: aTradeChart({ positionId: 'p-77' }) };
    agents.positionAudit = { kind: 'events', events: [anAuditEvent()] };

    const story = await new ReadTradeStoryQuery(agents).execute(who2);
    if (story.kind !== 'story') throw new Error(`expected story, got ${story.kind}`);
    expect(agents.auditedPositions).toEqual(['p-77']);
    expect(story.audit?.kind).toBe('events');
  });

  it('a chart naming no position yields a trail with no address, unasked', async () => {
    const agents = new FakeAgentsPort();
    agents.tradeChart = { kind: 'chart', chart: aTradeChart({ positionId: null }) };

    const story = await new ReadTradeStoryQuery(agents).execute(who2);
    if (story.kind !== 'story') throw new Error(`expected story, got ${story.kind}`);
    // Null, not 'none': nothing was asked, so nothing can be called empty.
    expect(story.audit).toBeNull();
    expect(agents.auditedPositions).toEqual([]);
  });

  it('an unreadable trail does not take the chart down', async () => {
    const agents = new FakeAgentsPort();
    agents.tradeChart = { kind: 'chart', chart: aTradeChart() };
    agents.positionAudit = {
      kind: 'unreadable',
      reason: 'BattleGrid did not respond',
      cause: 'unreachable',
    };

    const story = await new ReadTradeStoryQuery(agents).execute(who2);
    if (story.kind !== 'story') throw new Error(`expected story, got ${story.kind}`);
    expect(story.chart.coinTicker).toBe('WIF');
    expect(story.audit?.kind).toBe('unreadable');
  });

  it('passes the platform’s three non-answers through unblurred', async () => {
    for (const kind of ['no-trade', 'not-found'] as const) {
      const agents = new FakeAgentsPort();
      agents.tradeChart = { kind };
      expect((await new ReadTradeStoryQuery(agents).execute(who2)).kind).toBe(kind);
      expect(agents.auditedPositions).toEqual([]);
    }
    const agents = new FakeAgentsPort();
    agents.tradeChart = { kind: 'unreadable', reason: 'x', cause: 'unreachable' };
    expect((await new ReadTradeStoryQuery(agents).execute(who2)).kind).toBe('unreadable');
  });
});
