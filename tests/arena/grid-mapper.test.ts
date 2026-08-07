import { describe, expect, it } from 'vitest';
import { ToolRefusedError } from '@/infrastructure/battlegrid/mcp-adapter.js';
import { McpMarketGridAdapter } from '@/infrastructure/battlegrid/market-grid-adapter.js';
import type { BattleGridPort, ToolCallRequest } from '@/ports/battlegrid.js';

/**
 * Shaped from the live `list_market_grid_sessions` entry of 2026-08-01, with
 * the economics the 2026-08-06 re-probe recorded on all 50 rows. The fields
 * the platform also sends and this product does not map — `crowdUpPercent`,
 * `crowdDownPercent` (only ever null), `coinPicks.top` (never an entry),
 * `payoutStructure` (only ever an empty array), `hostAvatarUrl` (nothing
 * renders avatars) — are present here as the live probe saw them, so the
 * assertions below also prove they stay unread.
 */
const LIVE_SESSION = {
  sessionId: '7f3a9c2e-1b4d-4e8f-9a6c-2d5e8f1a3b7c',
  presetId: 'p-crypto-wars',
  displayName: 'CRYPTO WARS · 1H',
  timeRangeKey: '1H',
  entryFee: 10,
  totalPrizePool: 40,
  minimumPlayers: 4,
  playersNeeded: 1,
  // The schedule, on the list row — the four fields the arena used to spend a
  // detail call per session on. The keys are the platform's; the values are one
  // plausible session and not a claim about the arena's contents, which on
  // 2026-08-06 was 2 PENDING and 48 CANCELLED with `playerCount: 0` on every
  // row.
  status: 'PENDING',
  lockAt: '2026-08-01T18:00:00Z',
  settleAt: '2026-08-01T19:00:00Z',
  playerCount: 3,
  // The list-only half of the overlap: the host (never yet named), the money
  // split, and the pick roster with its corrected envelope — `rosterSize` is
  // populated on every row even while `top` has never had an entry.
  hostDisplayName: null,
  hostAvatarUrl: null,
  itmPercent: 30,
  calculatedItmCount: 2,
  alpha: 3,
  distributionCurveId: 'curve-1',
  feeBreakdown: {
    winnersAmount: 7.5,
    platformAmount: 1.5,
    jackpotAmount: 0.5,
    warBondAmount: 0.5,
    hostAmount: 0,
  },
  payoutStructure: [],
  crowdUpPercent: null,
  crowdDownPercent: null,
  coinPicks: {
    hasPicks: false,
    top: [],
    rosterSize: 36,
    others: 36,
    topLeanUp: 0,
    topLeanDown: 0,
    topLeanEven: 0,
  },
  coinPoolPreview: [
    { coinId: 'c-btc', ticker: 'BTC' },
    { coinId: 'c-eth', ticker: 'ETH' },
    { coinId: 'c-hype', ticker: 'HYPE' },
  ],
};

/** Shaped from the live `list_game_presets` entry of 2026-08-06. */
const LIVE_PRESET = {
  id: 'p-crypto-wars',
  displayName: 'CRYPTO WARS',
  gameType: 'MARKET_GRID',
  timeRangeKey: '1H',
  gridRows: 3,
  gridCols: 3,
  gridSize: 9,
  entryFee: 10,
  changeMultiplier: 100,
  captainMultiplier: 2,
  captainWrongPenaltyMultiplier: 2,
  wrongPenaltyMultiplier: 1,
  jackpotEnabled: true,
  perfectGameAllCorrectRequired: true,
  minimumPlayers: 4,
  maxPlayers: 100,
  cancelBelowThreshold: true,
  // Real, populated, and deliberately unmapped — nothing renders them.
  feeConfig: { platformFeePercent: 10, winnersPoolPercent: 70 },
  distributionCurveId: 'curve-1',
  badgeImageUrl: 'https://example.invalid/badge.png',
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
  it('keeps id, name, the previewed tickers, what entering costs — and the schedule', async () => {
    const { adapter, calls } = adapterOver(() => ({ sessions: [LIVE_SESSION] }));
    const result = await adapter.listSessions(who);
    expect(result.kind).toBe('sessions');
    if (result.kind !== 'sessions') return;
    expect(result.sessions[0]).toEqual({
      id: LIVE_SESSION.sessionId,
      name: 'CRYPTO WARS · 1H',
      coinTickers: ['BTC', 'ETH', 'HYPE'],
      entryFee: 10,
      prizePool: 40,
      minimumPlayers: 4,
      playersNeeded: 1,
      timeRangeKey: '1H',
      // The four the arena used to spend a call per session on. `toEqual`
      // rather than `toMatchObject` on purpose: this is the assertion that
      // fails the day a field the platform sends stops arriving here, which is
      // the mistake `list_entry_decisions` (35 keys, 11 mapped) taught twice.
      status: 'PENDING',
      lockAt: '2026-08-01T18:00:00Z',
      settleAt: '2026-08-01T19:00:00Z',
      playerCount: 3,
      // The list-only fields the session page renders. The host has never been
      // named, so the mapper's answer is null, not ''. The money split is the
      // platform's figures verbatim — same numbers, no arithmetic.
      hostDisplayName: null,
      itmPercent: 30,
      calculatedItmCount: 2,
      alpha: 3,
      distributionCurveId: 'curve-1',
      feeBreakdown: {
        winnersAmount: 7.5,
        platformAmount: 1.5,
        jackpotAmount: 0.5,
        warBondAmount: 0.5,
        hostAmount: 0,
      },
      // The envelope only: `top[]` and the crowd percentages appear nowhere in
      // this expected object, which is the `toEqual` proving they stay unread.
      pickRosterSize: 36,
      hasPicks: false,
    });
    expect(calls[0]?.tool).toBe('list_market_grid_sessions');
  });

  it('leaves an absent fee unknown rather than free', async () => {
    // The one number on this surface where a zero fallback would be a lie
    // with a price on it.
    const { adapter } = adapterOver(() => ({
      sessions: [{ ...LIVE_SESSION, entryFee: undefined, totalPrizePool: 'lots' }],
    }));
    const result = await adapter.listSessions(who);
    if (result.kind !== 'sessions') throw new Error(result.kind);
    expect(result.sessions[0]?.entryFee).toBeNull();
    expect(result.sessions[0]?.prizePool).toBeNull();
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
    expect(result.sessions[0]).toEqual({
      id: 's-1',
      name: 's-1',
      coinTickers: [],
      entryFee: null,
      prizePool: null,
      minimumPlayers: null,
      playersNeeded: null,
      timeRangeKey: null,
      // A row with no schedule is a row whose schedule is unknown. Nothing is
      // substituted — `status: null` renders as "status not stated", and a
      // session in an unknown state is never told a reader it will settle.
      status: null,
      lockAt: null,
      settleAt: null,
      playerCount: null,
      // Same rule for the list-only half: absent is unknown. `hasPicks: null`
      // is not "nobody has picked" — that would be a claim from a row that
      // made none.
      hostDisplayName: null,
      itmPercent: null,
      calculatedItmCount: null,
      alpha: null,
      distributionCurveId: null,
      feeBreakdown: null,
      pickRosterSize: null,
      hasPicks: null,
    });
  });
});

describe('mapping the rulebook', () => {
  it('keeps the grid, the price and what a call is worth', async () => {
    const { adapter, calls } = adapterOver(() => ({ presets: [LIVE_PRESET] }));
    const result = await adapter.gameRules(who);
    if (result.kind !== 'rules') throw new Error(result.kind);
    expect(result.presets[0]).toEqual({
      id: 'p-crypto-wars',
      name: 'CRYPTO WARS',
      gameType: 'MARKET_GRID',
      timeRangeKey: '1H',
      gridRows: 3,
      gridCols: 3,
      coinsPerGame: 9,
      entryFee: 10,
      changeMultiplier: 100,
      captainMultiplier: 2,
      captainWrongPenaltyMultiplier: 2,
      wrongPenaltyMultiplier: 1,
      jackpotEnabled: true,
      perfectGameNeedsEveryCall: true,
      minimumPlayers: 4,
      maxPlayers: 100,
      cancelsBelowMinimum: true,
    });
    expect(calls[0]?.tool).toBe('list_game_presets');
    expect(calls[0]?.args).toEqual({});
  });

  it('never reads an absent flag as a denial', async () => {
    // A preset that says nothing about a jackpot has not said there is none,
    // so the surface renders neither claim — `false` here means "not stated"
    // and the page shows nothing rather than "no jackpot".
    const { adapter } = adapterOver(() => ({
      presets: [{ id: 'p-2', gameType: 'COIN_GRID' }],
    }));
    const result = await adapter.gameRules(who);
    if (result.kind !== 'rules') throw new Error(result.kind);
    expect(result.presets[0]).toMatchObject({
      id: 'p-2',
      name: 'p-2',
      jackpotEnabled: false,
      perfectGameNeedsEveryCall: false,
      cancelsBelowMinimum: false,
      entryFee: null,
      coinsPerGame: null,
    });
  });

  it('a rule with no identity makes the whole rulebook unreadable, not a shorter one', async () => {
    // Three presets is small enough that "some of the rules" is never the
    // useful answer: a rulebook missing the preset a session was dealt from
    // still reads as complete.
    const { adapter } = adapterOver(() => ({ presets: [LIVE_PRESET, { displayName: 'ghost' }] }));
    const result = await adapter.gameRules(who);
    if (result.kind !== 'unreadable') throw new Error(result.kind);
    expect(result.reason).toContain('id');
  });

  it('a payload with no presets array is unreadable', async () => {
    const { adapter } = adapterOver(() => ({ items: [] }));
    expect((await adapter.gameRules(who)).kind).toBe('unreadable');
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
      kind: 'detail',
      detail: {
        id: 's-1',
        name: 'CRYPTO WARS · 1H',
        status: 'PENDING',
        lockAt: '2026-08-01T18:00:00Z',
        settleAt: '2026-08-01T19:00:00Z',
        playerCount: 3,
      },
    });
    expect(calls[0]?.args).toEqual({ sessionId: 's-1' });
  });

  it('refuses a detail with no status rather than inventing one', async () => {
    /**
     * It used to reject. It now answers `unreadable` with the same complaint —
     * a read in a per-session fan-out that throws takes the whole arena down,
     * which is what `all-controllers-probe` caught it doing on a rate limit.
     * Refusing to invent a status is unchanged; only the shape of the refusal
     * moved.
     */
    const { adapter } = adapterOver(() => ({ id: 's-1' }));
    const result = await adapter.sessionDetail({ ...who, sessionId: 's-1' });
    if (result.kind !== 'unreadable') throw new Error(result.kind);
    expect(result.reason).toContain('status');
  });
});

describe('the played fact', () => {
  it('comes from the submission check alone', async () => {
    const { adapter, calls } = adapterOver(() => ({ hasSubmitted: true }));
    expect(await adapter.hasSubmitted({ ...who, sessionId: 's-1' })).toEqual({
      kind: 'submission',
      entered: true,
    });
    // The one tool allowed to answer this — `get_market_grid_player_grid`
    // answers a 500 for "not played" and must never be consulted.
    expect(calls.map((c) => c.tool)).toEqual(['check_market_grid_submission']);
  });

  it('anything but an explicit true is false — but a failed read is neither', async () => {
    const { adapter } = adapterOver(() => ({}));
    expect(await adapter.hasSubmitted({ ...who, sessionId: 's-1' })).toEqual({
      kind: 'submission',
      entered: false,
    });

    // The distinction the three states exist for: a check that did not answer
    // must not become "has not entered", which is a claim.
    const { adapter: broken } = adapterOver(() => {
      throw new Error('BattleGrid did not answer');
    });
    const result = await broken.hasSubmitted({ ...who, sessionId: 's-1' });
    expect(result.kind).toBe('unreadable');
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

  it('any other refusal is unreadable — and emphatically not not-settled', async () => {
    /**
     * It used to throw, which was survivable only while nothing called it. A
     * session page calls it now, and a throw at a route is a 500 — the outcome
     * `one-bad-session-must-not-take-the-arena-down` made unrepresentable for
     * the two reads beside this one.
     *
     * The half that matters more is the second assertion: reporting a failed
     * read as "not settled yet" tells a player to come back later for results
     * that may already be published.
     */
    const { adapter } = adapterOver(() => {
      throw new ToolRefusedError('get_market_grid_results', JSON.stringify({ code: 'NOT_FOUND' }));
    });
    const result = await adapter.results({ ...who, sessionId: 's-1' });
    expect(result.kind).toBe('unreadable');
    expect(result.kind).not.toBe('not-settled');
  });

  it('a settled payload passes through opaque — it has never been observed', async () => {
    const { adapter } = adapterOver(() => ({ standings: [{ rank: 1 }] }));
    expect(await adapter.results({ ...who, sessionId: 's-1' })).toEqual({
      kind: 'settled',
      payloadUnmodelled: { standings: [{ rank: 1 }] },
    });
  });
});
