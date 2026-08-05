import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ReadStrategyQuery } from '@/application/use-cases/read-strategy.query.js';
import type { StrategyQuota } from '@/domain/strategy/strategy.js';
import { requiredSignals, weightedSignals } from '@/domain/strategy/strategy.js';
import { aStrategy, FakeStrategiesPort } from '../support/strategy-fakes.js';
import { McpStrategyAdapter } from '@/infrastructure/battlegrid/strategy-adapter.js';
import { McpBattleGridAdapter } from '@/infrastructure/battlegrid/mcp-adapter.js';
import { DeclaredScopes } from '@/domain/connection/held-scopes.js';
import { FakeAuditStore, FakeClock, FakeConfirmationStore } from '../support/fakes.js';

/**
 * A strategy, read whole.
 *
 * The product had never fetched one. `list_strategies` returns `sectionCount`
 * — a number — and `get_strategy` was among the 74 tools the surface map found
 * unused, so a roster row was everything Grid-Commander knew. That is why the
 * editor edited a tagline: there was no data behind a bigger form.
 *
 * The payload below is the live shape of BattleGrid's "London", trimmed in
 * volume but not in structure: 4 sections of `{ kind, sectionKey }`, signal
 * rules of `{ signalId, allocation, required, params }`, prose in
 * `marketReadText`, and three thresholds.
 */

const config = {
  clientId: '',
  mcpUrl: 'https://mcp.battlegrid.trade/mcp',
  authorizeUrl: 'https://mcp.battlegrid.trade/authorize',
  tokenUrl: 'https://mcp.battlegrid.trade/token',
  revokeUrl: 'https://mcp.battlegrid.trade/revoke',
  redirectUri: '',
};

const LONDON = {
  id: 'c19b59f5-c69c-4ac3-9944-9bbc127fa991',
  ownerUserId: null,
  scope: 'SYSTEM',
  systemKey: 'LONDON',
  name: 'London',
  description: 'Cautious — HTF trend is law, never fight the regime.',
  tagline: 'Weather the storm',
  visibility: 'UNLISTED',
  timeframe: '1h',
  cadence: 'INTRADAY',
  regimeAutoDerive: true,
  regimeTimeframe: null,
  marketReadText: 'LONDON — WEATHER THE STORM READ.\n\nThe HTF trend is law.',
  sections: [
    { kind: 'platform', sectionKey: 'includeMovingAverages' },
    { kind: 'platform', sectionKey: 'includeHigherTimeframe' },
    { kind: 'platform', sectionKey: 'includeVolatility' },
    { kind: 'platform', sectionKey: 'includeRegimeContext' },
  ],
  signalRules: [
    { signalId: 'rsi_oversold', allocation: 1, required: false, params: { threshold: 30 } },
    { signalId: 'htf_trend_align', allocation: 3, required: true, params: {} },
    { signalId: 'inert_signal', allocation: 0, required: false, params: {} },
  ],
  minAggregateScore: 0.5,
  minRequiredCount: 0,
  minAtrPct: 0.5,
  forkedFromStrategyId: null,
  revision: 2,
  isActive: true,
  boundAgentCount: 0,
  openPositionCount: 0,
};

/**
 * A server modelling the platform's two disjoint modes.
 *
 * `get_strategy` defaults to *active visible*; `includeInactive: true` replaces
 * that with *owned PRIVATE including inactive*. They do not overlap — verified
 * against the live platform in all four cells — so a fake that answers both the
 * same way would prove nothing about the retry this adapter needs.
 */
function twoModeServer(opts: {
  /** Answered when `includeInactive` is absent. */
  active?: unknown;
  /** Answered when `includeInactive: true`. */
  inactive?: unknown;
  calls?: Array<Record<string, unknown>> | undefined;
}) {
  return (async (_u: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? '{}')) as {
      method?: string;
      params?: { arguments?: Record<string, unknown> };
    };
    if (body.method === 'tools/list') {
      return json({
        tools: [
          { name: 'get_strategy', description: 'Get one strategy', annotations: { readOnlyHint: true } },
        ],
      });
    }
    const args = body.params?.arguments ?? {};
    opts.calls?.push(args);
    const wanted = args['includeInactive'] === true ? opts.inactive : opts.active;
    if (wanted === undefined) {
      // Exactly how the platform refuses: isError, with a JSON body carrying a
      // code. Not a transport failure and not an empty payload.
      const detail = JSON.stringify({ code: 'NOT_FOUND', message: 'Strategy not found. not found' });
      return json({ content: [{ type: 'text', text: detail }], isError: true });
    }
    const payload = { strategy: wanted };
    return json({
      content: [{ type: 'text', text: JSON.stringify(payload) }],
      structuredContent: payload,
    });
  }) as typeof globalThis.fetch;
}

const json = (result: unknown) =>
  new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

function adapterFor(fetch: typeof globalThis.fetch) {
  const clock = new FakeClock();
  const battlegrid = new McpBattleGridAdapter({
    config,
    audit: new FakeAuditStore(clock),
    confirmations: new FakeConfirmationStore(clock),
    heldScopes: new DeclaredScopes(['mcp:read']),
    remedy: 'repair-the-key',
    fetch,
  });
  return new McpStrategyAdapter(battlegrid);
}

/** An active, visible strategy — the default mode. */
const wire = (strategy: unknown, calls?: Array<Record<string, unknown>>) =>
  adapterFor(twoModeServer(strategy === undefined ? { calls } : { active: strategy, calls }));

const who = { userId: 'owner', accessToken: 'at', strategyId: LONDON.id };

describe('a strategy arrives whole', () => {
  it('carries what it reads', async () => {
    const result = await wire(LONDON).readStrategy(who);
    expect(result.kind).toBe('strategy');
    if (result.kind !== 'strategy') return;
    expect(result.detail.sections.map((s) => s.sectionKey)).toEqual([
      'includeMovingAverages',
      'includeHigherTimeframe',
      'includeVolatility',
      'includeRegimeContext',
    ]);
  });

  it('carries how it reasons', async () => {
    const result = await wire(LONDON).readStrategy(who);
    expect(result.kind === 'strategy' && result.detail.marketReadText).toContain(
      'The HTF trend is law',
    );
  });

  it('carries when it acts', async () => {
    const result = await wire(LONDON).readStrategy(who);
    expect(result.kind === 'strategy' && result.detail.thresholds).toEqual({
      minAggregateScore: 0.5,
      minRequiredCount: 0,
      minAtrPct: 0.5,
    });
  });

  it('carries what it weighs, in the order given', async () => {
    const result = await wire(LONDON).readStrategy(who);
    if (result.kind !== 'strategy') throw new Error('expected a strategy');
    expect(result.detail.signalRules.map((r) => r.signalId)).toEqual([
      'rsi_oversold',
      'htf_trend_align',
      'inert_signal',
    ]);
    expect(result.detail.signalRules[0]?.params).toEqual({ threshold: 30 });
  });

  it('keeps the summary agreeing with the roster', async () => {
    // One mapper for both. Two would be how the detail page and the roster start
    // disagreeing about a strategy's name or its blast radius.
    const result = await wire(LONDON).readStrategy(who);
    if (result.kind !== 'strategy') throw new Error('expected a strategy');
    expect(result.detail.summary.name).toBe('London');
    expect(result.detail.summary.scope).toBe('SYSTEM');
    expect(result.detail.summary.revision).toBe(2);
    expect(result.detail.summary.boundAgentCount).toBe(0);
  });

  it('distinguishes an unset threshold from a zero one', async () => {
    // `minRequiredCount: 0` means no minimum; absent means the platform did not
    // say. Rendering both as 0 would invent a fact about when the agent trades.
    const result = await wire({ ...LONDON, minAtrPct: undefined }).readStrategy(who);
    if (result.kind !== 'strategy') throw new Error('expected a strategy');
    expect(result.detail.thresholds.minRequiredCount).toBe(0);
    expect(result.detail.thresholds.minAtrPct).toBeNull();
  });

  it('drops a rule with no signal id rather than naming it "unknown"', async () => {
    // The id is what the rule *is*. A row reading "(unknown): weight 3" tells a
    // user something is being weighted without telling them what.
    const result = await wire({
      ...LONDON,
      signalRules: [...LONDON.signalRules, { allocation: 3, required: true, params: {} }],
    }).readStrategy(who);
    if (result.kind !== 'strategy') throw new Error('expected a strategy');
    expect(result.detail.signalRules).toHaveLength(3);
  });
});

describe('what the domain computes about it', () => {
  it('separates required signals from the rest', async () => {
    const result = await wire(LONDON).readStrategy(who);
    if (result.kind !== 'strategy') throw new Error('expected a strategy');
    expect(requiredSignals(result.detail).map((r) => r.signalId)).toEqual(['htf_trend_align']);
  });

  it('separates signals carrying weight from inert ones', async () => {
    // A rule with zero allocation is present and does nothing. Counting it
    // beside the ones that decide something overstates what is in use.
    const result = await wire(LONDON).readStrategy(who);
    if (result.kind !== 'strategy') throw new Error('expected a strategy');
    expect(weightedSignals(result.detail).map((r) => r.signalId)).toEqual([
      'rsi_oversold',
      'htf_trend_align',
    ]);
  });
});

describe('a strategy that is not there', () => {
  it('reports missing rather than unreadable', async () => {
    // The platform answered. There is simply nothing to show, and only one of
    // those two facts means the user should stop looking.
    const result = await wire(undefined).readStrategy(who);
    expect(result.kind).toBe('missing');
  });

  it('reports unreadable when the platform could not be asked', async () => {
    const clock = new FakeClock();
    const battlegrid = new McpBattleGridAdapter({
      config,
      audit: new FakeAuditStore(clock),
      confirmations: new FakeConfirmationStore(clock),
      heldScopes: new DeclaredScopes(['mcp:read']),
      remedy: 'repair-the-key',
      fetch: (() => Promise.reject(new TypeError('fetch failed'))) as typeof globalThis.fetch,
    });
    const result = await new McpStrategyAdapter(battlegrid).readStrategy(who);
    expect(result.kind).toBe('unreadable');
    expect(result.kind === 'unreadable' && result.cause).toBe('unreachable');
  });
});

describe('the platform has two disjoint modes, and both are reachable', () => {
  /**
   * The bug this replaced: `includeInactive: true` was sent unconditionally,
   * because the name reads like a widening. It is not — the description says
   * "only to load an owned PRIVATE strategy". Every SYSTEM strategy became
   * unreadable, and rendered as "could not reach BattleGrid" on a page where
   * BattleGrid had answered clearly. Found by looking at the page.
   */
  it('reads an active visible strategy without asking for inactive ones', async () => {
    const calls: Array<Record<string, unknown>> = [];
    const result = await wire(LONDON, calls).readStrategy(who);

    expect(result.kind).toBe('strategy');
    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({ strategyId: LONDON.id });
    expect(calls[0], 'sending this makes a SYSTEM strategy unreadable').not.toHaveProperty(
      'includeInactive',
    );
  });

  it('falls back to the inactive mode when the default has nothing', async () => {
    const archived = { ...LONDON, scope: 'PRIVATE', isActive: false };
    const calls: Array<Record<string, unknown>> = [];
    const port = adapterFor(twoModeServer({ inactive: archived, calls }));

    const result = await port.readStrategy(who);
    expect(result.kind).toBe('strategy');
    expect(result.kind === 'strategy' && result.detail.summary.isActive).toBe(false);
    expect(calls).toHaveLength(2);
    expect(calls[1]).toMatchObject({ includeInactive: true });
  });

  it('does not make a second call when the first one answered', async () => {
    // The common read stays one round trip. A second call on every strategy
    // would double the cost of the page for the case that does not need it.
    const calls: Array<Record<string, unknown>> = [];
    await wire(LONDON, calls).readStrategy(who);
    expect(calls).toHaveLength(1);
  });

  it('reports missing only when neither mode has it', async () => {
    const calls: Array<Record<string, unknown>> = [];
    const result = await adapterFor(twoModeServer({ calls })).readStrategy(who);
    expect(result.kind).toBe('missing');
    expect(calls).toHaveLength(2);
  });
});

describe('a refusal carries the platform\'s own code', () => {
  it('reads NOT_FOUND from the code rather than from the message', async () => {
    // Matching on prose is what this codebase keeps getting burned by. The
    // refusal is JSON and carries `code`; the adapter reads that.
    const { ToolRefusedError } = await import('@/infrastructure/battlegrid/mcp-adapter.js');
    const err = new ToolRefusedError(
      'get_strategy',
      JSON.stringify({ code: 'NOT_FOUND', message: 'Strategy x not found. not found' }),
    );
    expect(err.code).toBe('NOT_FOUND');
  });

  it('has no code when the refusal is not JSON', async () => {
    // MCP validation errors arrive as prose. Having no code is a fact, not a
    // failure, and inventing one would be the guessing this avoids.
    const { ToolRefusedError } = await import('@/infrastructure/battlegrid/mcp-adapter.js');
    expect(new ToolRefusedError('get_strategy', 'MCP error -32602: bad input').code).toBeNull();
  });

  it('does not turn a non-NOT_FOUND refusal into missing', async () => {
    // "Not there" and "not allowed" are different answers. Only one means the
    // user should stop looking.
    const denied = (async (_u: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { method?: string };
      if (body.method === 'tools/list') {
        return json({
          tools: [{ name: 'get_strategy', annotations: { readOnlyHint: true } }],
        });
      }
      const detail = JSON.stringify({ code: 'FORBIDDEN', message: 'Not yours' });
      return json({ content: [{ type: 'text', text: detail }], isError: true });
    }) as typeof globalThis.fetch;

    const result = await adapterFor(denied).readStrategy(who);
    expect(result.kind).toBe('unreadable');
  });
});

describe('what the route is allowed to do', () => {
  const detailOf = async (strategy: unknown) => {
    const port = wire(strategy);
    return new ReadStrategyQuery(port).execute(who);
  };

  it('decides the affordances in the use case, not the page', async () => {
    const result = await detailOf({ ...LONDON, scope: 'PRIVATE' });
    if (result.kind !== 'strategy') throw new Error('expected a strategy');
    expect(result.can).toEqual({ editable: true, fork: { kind: 'not-needed' }, restorable: false });
  });

  it('offers forking rather than editing on a platform strategy', async () => {
    const result = await detailOf(LONDON);
    if (result.kind !== 'strategy') throw new Error('expected a strategy');
    expect(result.can).toEqual({ editable: false, fork: { kind: 'offered' }, restorable: false });
  });

  it('offers restoring on an archived private strategy', async () => {
    const result = await detailOf({ ...LONDON, scope: 'PRIVATE', isActive: false });
    if (result.kind !== 'strategy') throw new Error('expected a strategy');
    expect(result.can).toEqual({ editable: false, fork: { kind: 'not-needed' }, restorable: true });
  });

  it('keeps the domain out of the route', () => {
    // Architecture policy: no file under app/ imports the domain. The boundary
    // guard caught this page doing exactly that, which is why `can` exists.
    const page = readFileSync('app/(app)/strategies/[id]/page.tsx', 'utf8');
    expect(page).not.toMatch(/@\/domain\//);
  });
});

/**
 * The same control, withheld the same way.
 *
 * The twelve impossible fork affordances were found on the roster, and gating
 * the roster alone would have left this page offering the identical action one
 * click away — with a test suite green, because nothing here would have looked.
 *
 * `get_strategy` does not report the quota; only `list_strategies` does. So this
 * page reads twice, and the second read is allowed to fail.
 */
describe('a copy that cannot be made is not offered on the strategy either', () => {
  const PLATFORM = aStrategy({ id: 'sys-1', name: 'Berlin', scope: 'SYSTEM' });

  const detailFrom = async (quota: StrategyQuota | null, readable = true) => {
    const port = new FakeStrategiesPort([PLATFORM]);
    port.quota = quota;
    port.readable = readable;
    port.detail = {
      summary: PLATFORM,
      sections: [],
      marketReadText: null,
      thresholds: { minAggregateScore: null, minRequiredCount: null, minAtrPct: null },
      signalRules: [],
      conditions: [],
      openPositionCount: 0,
      cadence: null,
      regimeAutoDerive: false,
      regimeTimeframe: null,
    };
    const result = await new ReadStrategyQuery(port).execute({
      userId: 'u1',
      accessToken: 'at',
      strategyId: PLATFORM.id,
    });
    if (result.kind !== 'strategy') throw new Error(`expected a strategy, got ${result.kind}`);
    return result.can;
  };

  it('withholds it at capacity, with the reason', async () => {
    const can = await detailFrom({ used: 25, limit: 25, remaining: 0 });
    expect(can.fork.kind).toBe('withheld');
    expect(can.fork.kind === 'withheld' ? can.fork.because : '').toMatch(/no room/i);
  });

  it('offers it while there is room', async () => {
    expect((await detailFrom({ used: 2, limit: 25, remaining: 23 })).fork).toEqual({
      kind: 'offered',
    });
  });

  it('still shows the strategy when the roster read fails', async () => {
    // The load-bearing half. A second read added to make a control honest must
    // not be able to take the page — or the control — away: an unreadable roster
    // is an unknown quota, and unknown offers.
    expect((await detailFrom(null, false)).fork).toEqual({ kind: 'offered' });
  });
});

describe('listing does not pay for the detail page', () => {
  it('leaves the roster reading the summary it already has', () => {
    // Widening `Strategy` would make seventeen rows carry 82 signal rules each.
    // `list_strategies` and `get_strategy` are two calls returning two amounts,
    // and the types say so.
    const list = readFileSync('src/presentation/components/strategy-list.tsx', 'utf8');
    expect(list).not.toMatch(/signalRules|marketReadText|StrategyDetail/);
  });
});
