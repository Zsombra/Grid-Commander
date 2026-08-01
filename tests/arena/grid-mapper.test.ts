import { describe, expect, it } from 'vitest';
import { ToolRefusedError } from '@/infrastructure/battlegrid/mcp-adapter.js';
import { McpMarketGridAdapter } from '@/infrastructure/battlegrid/market-grid-adapter.js';
import type { BattleGridPort, ToolCallRequest } from '@/ports/battlegrid.js';

/** Shaped from the live `list_market_grid_sessions` entry of 2026-08-01. */
const LIVE_SESSION = {
  sessionId: '7f3a9c2e-1b4d-4e8f-9a6c-2d5e8f1a3b7c',
  presetId: 'p-crypto-wars',
  displayName: 'CRYPTO WARS · 1H',
  timeRangeKey: '1H',
  coinPoolPreview: [
    { coinId: 'c-btc', ticker: 'BTC' },
    { coinId: 'c-eth', ticker: 'ETH' },
    { coinId: 'c-hype', ticker: 'HYPE' },
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
  return { adapter: new McpMarketGridAdapter(battlegrid), calls };
}

const who = { userId: 'u1', accessToken: 'at' };

describe('mapping the live session list', () => {
  it('keeps id, name and the previewed tickers', async () => {
    const { adapter, calls } = adapterOver(() => ({ sessions: [LIVE_SESSION] }));
    const result = await adapter.listSessions(who);
    expect(result.kind).toBe('sessions');
    if (result.kind !== 'sessions') return;
    expect(result.sessions[0]).toEqual({
      id: LIVE_SESSION.sessionId,
      name: 'CRYPTO WARS · 1H',
      coinTickers: ['BTC', 'ETH', 'HYPE'],
    });
    expect(calls[0]?.tool).toBe('list_market_grid_sessions');
  });

  it('a row with no sessionId makes the whole read unreadable, not a shorter list', async () => {
    const { adapter } = adapterOver(() => ({
      sessions: [LIVE_SESSION, { displayName: 'ghost session' }],
    }));
    const result = await adapter.listSessions(who);
    expect(result.kind).toBe('unreadable');
    if (result.kind !== 'unreadable') return;
    expect(result.reason).toContain('sessionId');
    expect(result.cause).toBe('unreachable');
  });

  it('a payload with no sessions array is unreadable', async () => {
    const { adapter } = adapterOver(() => ({ items: [] }));
    const result = await adapter.listSessions(who);
    expect(result.kind).toBe('unreadable');
  });

  it('a nameless session falls back to its id rather than rendering blank', async () => {
    const { adapter } = adapterOver(() => ({
      sessions: [{ sessionId: 's-1', coinPoolPreview: 'not-an-array' }],
    }));
    const result = await adapter.listSessions(who);
    if (result.kind !== 'sessions') throw new Error(result.kind);
    expect(result.sessions[0]).toEqual({ id: 's-1', name: 's-1', coinTickers: [] });
  });
});

describe('mapping a session detail', () => {
  it('keeps schedule, status and player count', async () => {
    const { adapter, calls } = adapterOver(() => ({
      id: 's-1',
      displayName: 'CRYPTO WARS · 1H',
      status: 'PENDING',
      lockAt: '2026-08-01T18:00:00Z',
      settleAt: '2026-08-01T19:00:00Z',
      playerCount: 3,
    }));
    const detail = await adapter.sessionDetail({ ...who, sessionId: 's-1' });
    expect(detail).toEqual({
      id: 's-1',
      name: 'CRYPTO WARS · 1H',
      status: 'PENDING',
      lockAt: '2026-08-01T18:00:00Z',
      settleAt: '2026-08-01T19:00:00Z',
      playerCount: 3,
    });
    expect(calls[0]?.args).toEqual({ sessionId: 's-1' });
  });

  it('refuses a detail with no status rather than inventing one', async () => {
    const { adapter } = adapterOver(() => ({ id: 's-1' }));
    await expect(adapter.sessionDetail({ ...who, sessionId: 's-1' })).rejects.toThrow('status');
  });
});

describe('the played fact', () => {
  it('comes from the submission check alone', async () => {
    const { adapter, calls } = adapterOver(() => ({ hasSubmitted: true }));
    expect(await adapter.hasSubmitted({ ...who, sessionId: 's-1' })).toBe(true);
    // The one tool allowed to answer this — `get_market_grid_player_grid`
    // answers a 500 for "not played" and must never be consulted.
    expect(calls.map((c) => c.tool)).toEqual(['check_market_grid_submission']);
  });

  it('anything but an explicit true is false', async () => {
    const { adapter } = adapterOver(() => ({}));
    expect(await adapter.hasSubmitted({ ...who, sessionId: 's-1' })).toBe(false);
  });
});

describe('results as a state machine', () => {
  it('the pre-settle CONFLICT is the not-settled state, not an error', async () => {
    const { adapter } = adapterOver(() => {
      throw new ToolRefusedError(
        'get_market_grid_results',
        JSON.stringify({ code: 'CONFLICT', message: 'Results are published after the session settles' }),
      );
    });
    expect(await adapter.results({ ...who, sessionId: 's-1' })).toEqual({ kind: 'not-settled' });
  });

  it('any other refusal stays an error', async () => {
    const { adapter } = adapterOver(() => {
      throw new ToolRefusedError('get_market_grid_results', JSON.stringify({ code: 'NOT_FOUND' }));
    });
    await expect(adapter.results({ ...who, sessionId: 's-1' })).rejects.toThrow(ToolRefusedError);
  });

  it('a settled payload passes through opaque — it has never been observed', async () => {
    const { adapter } = adapterOver(() => ({ standings: [{ rank: 1 }] }));
    expect(await adapter.results({ ...who, sessionId: 's-1' })).toEqual({
      kind: 'settled',
      payload: { standings: [{ rank: 1 }] },
    });
  });
});
