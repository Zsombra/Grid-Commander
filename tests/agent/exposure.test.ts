import { describe, expect, it } from 'vitest';
import { McpPositionsAdapter } from '@/infrastructure/battlegrid/positions-adapter.js';
import { ReadExposureQuery } from '@/application/use-cases/read-exposure.query.js';
import type { BattleGridPort, ToolCallRequest } from '@/ports/battlegrid.js';
import { anEntryDecision, FakeAgentsPort } from '../support/agent-fakes.js';
import { aPosition, aRestingOrder, FakePositionsPort, anExposure } from '../support/position-fakes.js';
import { FakeClock } from '../support/fakes.js';

/**
 * What an agent is holding, and what it could not get to the exchange.
 *
 * The payload below is the live `list_user_active_positions` row of
 * 2026-08-06 — `THE .0` holding HYPE LONG, opened 17:10, still open while this
 * was written. **It is the first time this shape had ever been observed.** The
 * tools answered empty on every account the product had been probed against,
 * which is why an agent could hold leveraged money with nothing rendering it.
 *
 * Two facts in the payload shaped the code:
 *
 * 1. `effectiveStopLoss: 55.954` against the opening decision's
 *    `stopLoss: 55.67456526`. Trailing moved it, and every surface showed the
 *    decided one.
 * 2. `unpricedPositionCount` — the platform distinguishing a position it could
 *    not price from one worth nothing, which is this product's own
 *    *unreadable is not empty* rule arriving as a field.
 */

const who = { userId: 'u1', accessToken: 'at' };

/** When the live read was priced: `generatedAtMs` on the payload below. */
const PRICED_MS = 1786038921702; // 2026-08-06T17:55:21.702Z
const MINUTE = 60_000;

/**
 * A clock reading a fixed distance from the moment the platform priced.
 *
 * Every age in this file is measured against it rather than against the wall
 * clock, which is the whole reason `ReadExposureQuery` takes a `Clock` at all:
 * `Date.now()` inside the read would make "4 minutes ago" a different sentence
 * on every run.
 */
const readAt = (offsetMs: number) => new FakeClock(new Date(PRICED_MS + offsetMs));

/** The live envelope, trimmed to the keys the mapper reads. */
const LIVE = {
  totals: {
    openPositionCount: 1,
    activeAgentCount: 1,
    pricedPositionCount: 1,
    unpricedPositionCount: 0,
    marginedUsd: 2.474252,
    currentNotionalUsd: 12.35872,
    unrealizedPnlUsd: -0.012539999999998911,
    roePct: -0.5068198388845967,
    pricingStatus: 'LIVE',
    generatedAtMs: 1786038921702,
    refreshIntervalMs: 10000,
  },
  positions: [
    {
      positionId: '2a7457a8-488e-4ff3-b0c0-f68eea11b3b6',
      decisionId: '4f1096e9-cb21-4695-ad4f-0befd0b5f704',
      signalLogId: 'da98f325-0271-4e5f-80fd-bc25cb5d153f',
      agentId: 'a1',
      agentName: 'THE .0',
      coinTicker: 'HYPE',
      direction: 'LONG',
      entryFillPrice: 56.233,
      markPrice: 56.176,
      entryNotionalUsd: 12.37126,
      currentNotionalUsd: 12.35872,
      marginedUsd: 2.474252,
      unrealizedPnlUsd: -0.012539999999998911,
      roePct: -0.5068198388845967,
      effectiveLeverage: 5,
      effectiveStopLoss: 55.954,
      effectiveTakeProfit: 57.34986948,
      liquidationPrice: null,
      conviction: 0.65,
      timeHorizon: '1h',
      openedAt: '2026-08-06T17:10:18.262Z',
      status: 'OPEN',
      pricingStatus: 'LIVE',
    },
  ],
};

function adapterOver(respond: (req: ToolCallRequest) => unknown) {
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
      const content = respond(request);
      if (content instanceof Error) throw content;
      return {
        content,
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
  return new McpPositionsAdapter(battlegrid);
}

describe('mapping what is open', () => {
  it('carries the platform’s own valuation without recomputing it', async () => {
    const result = await adapterOver(() => LIVE).readActivePositions(who);
    if (result.kind !== 'exposure') throw new Error(result.kind);
    const p = result.exposure.positions[0];

    // Full precision, unrounded. Rounding belongs to the surface; a mapper
    // that rounded would make a cent of difference unrecoverable.
    expect(p?.unrealizedPnlUsd).toBe(-0.012539999999998911);
    expect(p?.roePct).toBe(-0.5068198388845967);
    expect(p?.markPrice).toBe(56.176);
    expect(p?.marginedUsd).toBe(2.474252);
    expect(result.exposure.totals.generatedAtMs).toBe(1786038921702);
  });

  it('carries the management statuses verbatim, and their absence as null', async () => {
    // The LIVE payload predates v17.2.0, so it is the absent case: the
    // platform saying nothing maps to null, never to a default state.
    const before = await adapterOver(() => LIVE).readActivePositions(who);
    if (before.kind !== 'exposure') throw new Error(before.kind);
    expect(before.exposure.positions[0]?.breakEvenStatus).toBeNull();
    expect(before.exposure.positions[0]?.trailingStatus).toBeNull();

    // The v17 shape, mirroring the live read of 2026-08-11 — and a word this
    // product has never seen travels as itself, no enum in the way.
    const after = await adapterOver(() => ({
      ...LIVE,
      positions: [
        { ...LIVE.positions[0], breakEvenStatus: 'ACTIVE', trailingStatus: 'SOME_NEW_WORD' },
      ],
    })).readActivePositions(who);
    if (after.kind !== 'exposure') throw new Error(after.kind);
    expect(after.exposure.positions[0]?.breakEvenStatus).toBe('ACTIVE');
    expect(after.exposure.positions[0]?.trailingStatus).toBe('SOME_NEW_WORD');
  });

  it('keeps the effective stop, which is not the one the decision recorded', async () => {
    // The decision behind this position recorded `stopLoss: 55.67456526`.
    const result = await adapterOver(() => LIVE).readActivePositions(who);
    if (result.kind !== 'exposure') throw new Error(result.kind);
    expect(result.exposure.positions[0]?.effectiveStopLoss).toBe(55.954);
    expect(result.exposure.positions[0]?.effectiveStopLoss).not.toBe(55.67456526);
  });

  it('leaves an unpriced position unknown rather than flat', async () => {
    /**
     * `unpricedPositionCount` exists because the platform can hold a position
     * it cannot value. Defaulting to zero would render it as breaking even,
     * which is a claim about money.
     */
    const unpriced = {
      ...LIVE,
      totals: { ...LIVE.totals, unpricedPositionCount: 1 },
      positions: [{ ...LIVE.positions[0], markPrice: null, unrealizedPnlUsd: null, roePct: null }],
    };
    const result = await adapterOver(() => unpriced).readActivePositions(who);
    if (result.kind !== 'exposure') throw new Error(result.kind);
    expect(result.exposure.positions[0]?.unrealizedPnlUsd).toBeNull();
    expect(result.exposure.positions[0]?.markPrice).toBeNull();
    expect(result.exposure.totals.unpricedPositionCount).toBe(1);
  });

  it('separates nothing open from nothing readable', async () => {
    expect((await adapterOver(() => ({ positions: [] })).readActivePositions(who)).kind).toBe('none');
    // No `positions` key at all is a read that did not answer. On this surface
    // above all others, that must not render as "no money at stake".
    expect((await adapterOver(() => ({})).readActivePositions(who)).kind).toBe('unreadable');
    expect(
      (await adapterOver(() => new Error('BattleGrid did not answer')).readActivePositions(who)).kind,
    ).toBe('unreadable');
  });

  it('refuses a position it cannot attribute to an agent', async () => {
    const orphan = { ...LIVE, positions: [{ ...LIVE.positions[0], agentId: null }] };
    const result = await adapterOver(() => orphan).readActivePositions(who);
    // Rendered under the wrong agent, a position is worse than an absent one.
    expect(result.kind).toBe('unreadable');
  });
});

describe('one agent’s share of what is at stake', () => {
  function query(exposure = anExposure(), funnel: FakeAgentsPort['ownFunnel'] = { kind: 'none' }) {
    const positions = new FakePositionsPort();
    positions.result = { kind: 'exposure', exposure };
    const agents = new FakeAgentsPort([]);
    agents.ownFunnel = funnel;
    return new ReadExposureQuery(positions, agents, readAt(4 * MINUTE));
  }

  it('shows this agent’s positions and the account’s totals', async () => {
    const out = await query().execute({ ...who, agentId: 'a1' });
    if (out.exposure.kind !== 'holding') throw new Error(out.exposure.kind);
    expect(out.exposure.positions).toHaveLength(1);
    expect(out.exposure.positions[0]?.position.coinTicker).toBe('HYPE');
    expect(out.exposure.totals.openPositionCount).toBe(1);
  });

  it('calls an agent with none of the open positions flat', async () => {
    const out = await query().execute({ ...who, agentId: 'someone-else' });
    expect(out.exposure.kind).toBe('flat');
  });

  it('never reports an unreadable position read as holding nothing', async () => {
    const positions = new FakePositionsPort();
    positions.result = { kind: 'unreadable', reason: 'no answer', cause: 'unreachable' };
    const out = await new ReadExposureQuery(positions, new FakeAgentsPort([]), readAt(0)).execute({
      ...who,
      agentId: 'a1',
    });
    expect(out.exposure.kind).toBe('unreadable');
  });

  it('reads the two halves independently', async () => {
    // An unreadable funnel must not blank a position that answered — the
    // pipeline page's rule, one surface out.
    const out = await query(anExposure(), {
      kind: 'unreadable',
      reason: 'no answer',
      cause: 'unreachable',
    }).execute({ ...who, agentId: 'a1' });
    expect(out.exposure.kind).toBe('holding');
    expect(out.fills).toBeNull();
  });
});

describe('how old these figures are', () => {
  /**
   * The gap `a-priced-position-goes-stale-while-you-read-it` filed. The stamp
   * was already carried and already rendered, and a page four minutes old read
   * exactly like one a second old — on a 5× position the platform asks a client
   * to re-read every ten seconds (`refreshIntervalMs: 10000` on this payload).
   * The age is the part of that a surface can actually say.
   */
  const priced = async (clock: FakeClock, exposure = anExposure()) => {
    const positions = new FakePositionsPort();
    positions.result = { kind: 'exposure', exposure };
    const out = await new ReadExposureQuery(positions, new FakeAgentsPort([]), clock).execute({
      ...who,
      agentId: 'a1',
    });
    if (out.exposure.kind !== 'holding') throw new Error(out.exposure.kind);
    return out.exposure.pricedAt;
  };

  it('measures the age against the clock it was given', async () => {
    expect(await priced(readAt(4 * MINUTE))).toEqual({
      kind: 'aged',
      atMs: PRICED_MS,
      ageMs: 4 * MINUTE,
    });
  });

  it('reports a read taken the instant it was priced as an age of zero', async () => {
    // Zero is a measurement: the read happened at the moment of pricing. Only a
    // missing stamp is silence, and the two must not share a representation.
    expect(await priced(readAt(0))).toMatchObject({ kind: 'aged', ageMs: 0 });
  });

  it('claims no age when the stamp is later than the clock reads', async () => {
    /**
     * Two machines keep two clocks and a second of skew is ordinary. Carried
     * forward as a number it would surface as "priced -1 minutes ago" — this
     * product's arithmetic presented as the platform's fact.
     */
    expect(await priced(readAt(-1))).toEqual({ kind: 'ahead-of-clock', atMs: PRICED_MS });
  });

  it('keeps a stamp the platform never sent apart from an age', async () => {
    const totals = { ...anExposure().totals, generatedAtMs: null };
    expect(await priced(readAt(4 * MINUTE), anExposure({ totals }))).toEqual({ kind: 'unstated' });
  });
});

describe('the stop the decision set, against the stop now', () => {
  /**
   * The join the whole feature is: `position.decisionId` to `decision.id`.
   *
   * Both halves were already read and already rendered — on two different
   * pages, with nothing saying they were the same stop. What the live pair
   * proves is that they are not: 55.67456526 decided, 55.954 in force,
   * trailing having walked it 28 cents up a $56 instrument.
   */
  function query(
    decisions: FakeAgentsPort['entryDecisions'],
    exposure = anExposure(),
  ): { query: ReadExposureQuery; agents: FakeAgentsPort } {
    const positions = new FakePositionsPort();
    positions.result = { kind: 'exposure', exposure };
    const agents = new FakeAgentsPort([]);
    agents.entryDecisions = decisions;
    return { query: new ReadExposureQuery(positions, agents, readAt(4 * MINUTE)), agents };
  }

  const held = async (
    decisions: FakeAgentsPort['entryDecisions'],
    exposure = anExposure(),
  ) => {
    const out = await query(decisions, exposure).query.execute({ ...who, agentId: 'a1' });
    if (out.exposure.kind !== 'holding') throw new Error(out.exposure.kind);
    const first = out.exposure.positions[0];
    if (!first) throw new Error('no position');
    return first;
  };

  const decided = (over: Parameters<typeof anEntryDecision>[0] = {}): FakeAgentsPort['entryDecisions'] => ({
    kind: 'entries',
    entries: [anEntryDecision(over)],
    total: 1,
  });

  it('carries both values and says the stop moved to protect more', async () => {
    const p = await held(decided());
    expect(p.asDecided?.stop).toEqual({
      kind: 'moved',
      decided: 55.67456526,
      effective: 55.954,
      // A LONG whose stop rose is a LONG with more of itself out of harm.
      protects: 'more',
    });
    // Untouched by trailing, and reported as such rather than as silence.
    expect(p.asDecided?.target).toEqual({ kind: 'as-decided', decided: 57.34986948 });
  });

  it('reads the identical move on a short as less protection', async () => {
    /**
     * The same two numbers, the other side of the market. A short is protected
     * by a stop that falls, so 55.67456526 → 55.954 exposes it further —
     * the reading that a surface subtracting for itself would get backwards
     * exactly half the time.
     */
    const p = await held(
      decided(),
      anExposure({ positions: [aPosition({ direction: 'SHORT' })] }),
    );
    expect(p.asDecided?.stop).toMatchObject({ kind: 'moved', protects: 'less' });
  });

  it('claims no direction for a side it cannot read', async () => {
    // `direction` is carried as BattleGrid sends it and never interpreted. A
    // vocabulary this product does not know still shows both numbers; what it
    // must not do is guess which way the money went.
    const p = await held(
      decided(),
      anExposure({ positions: [aPosition({ direction: 'NEUTRAL' })] }),
    );
    expect(p.asDecided?.stop).toMatchObject({ kind: 'moved', protects: null });
  });

  it('reports no drift where the stop is where the decision put it', async () => {
    const p = await held(decided({ stopLoss: 55.954 }));
    expect(p.asDecided?.stop).toEqual({ kind: 'as-decided', decided: 55.954 });
  });

  it('leaves the decided values unknown when no decision matched', async () => {
    /**
     * Unknown, never unmoved. The decision may simply be older than the window
     * read, and a position reported as undrifted on the strength of a missing
     * row would understate the protection question, not answer it.
     */
    const p = await held(decided({ id: 'some-other-decision' }));
    expect(p.asDecided).toBeNull();
    expect(p.position.effectiveStopLoss).toBe(55.954);
  });

  it('renders the position in full when the decision list could not be read', async () => {
    // The reads are independent. One of three failing costs the operator one
    // sentence, never the holding.
    const p = await held({ kind: 'unreadable', reason: 'no answer', cause: 'unreachable' });
    expect(p.asDecided).toBeNull();
    expect(p.position.unrealizedPnlUsd).toBe(-0.012539999999998911);
    expect(p.position.marginedUsd).toBe(2.474252);
  });

  it('asks for a window wide enough to hold the decision', async () => {
    /**
     * `list_entry_decisions` defaults to ten rows. `THE .0` decided sixty
     * entries, so the decision behind a position held overnight sits on page
     * two — the join would answer *unknown* for the very positions it was
     * built for. Fifty is the platform's maximum in one call.
     */
    const { query: q, agents } = query({ kind: 'none' });
    await q.execute({ ...who, agentId: 'a1' });
    expect(agents.entryDecisionLimits).toEqual([50]);
  });

  it('says nothing about a stop the decision never recorded', async () => {
    // A SKIP records no levels. There is nothing to set the current stop
    // against, and `incomparable` keeps that apart from agreement.
    const p = await held(decided({ stopLoss: null }));
    expect(p.asDecided?.stop).toEqual({ kind: 'incomparable', decided: null });
  });

  it('keeps a decided stop that the position no longer reports', async () => {
    // The alarming shape: a stop was decided and none is in force. Folded into
    // "as decided" it would render as a stop that never moved.
    const p = await held(decided(), anExposure({ positions: [aPosition({ effectiveStopLoss: null })] }));
    expect(p.asDecided?.stop).toEqual({ kind: 'incomparable', decided: 55.67456526 });
  });
});

describe('entries that never became an order', () => {
  function withFunnel(over: Record<string, number | null>) {
    const agents = new FakeAgentsPort([]);
    agents.ownFunnel = {
      kind: 'funnel',
      funnel: {
        totalEvaluations: 71,
        totalDecisions: 71,
        enterDecisions: 60,
        skipDecisions: 11,
        skippedTerminal: 0,
        executed: 27,
        failed: 28,
        expired: 5,
        cancelled: 0,
        blocked: 0,
        pending: 0,
        fillRatePercent: 63,
        avgAggregateScorePercent: 61,
        avgConvictionPercent: 48,
        avgRiskRewardRatio: 3.21,
        outcomeCount: 26,
        winCount: 9,
        lossCount: 17,
        winRatePercent: 34.6,
        avgNetPnl: null,
        totalNetPnl: -0.23582,
        avgDurationSeconds: null,
        topCoins: [],
        ...over,
      },
    };
    return new ReadExposureQuery(new FakePositionsPort(), agents, readAt(4 * MINUTE));
  }

  it('states the failures against the total decided', async () => {
    // THE .0's real split, live 2026-08-06.
    const out = await withFunnel({}).execute({ ...who, agentId: 'a1' });
    expect(out.fills).toMatchObject({ failed: 28, executed: 27, decided: 60 });
  });

  it('calls failing dominant when more failed than succeeded', async () => {
    /**
     * A comparison of the platform's own two counts, not a threshold this
     * product picked. 28 against 27 is the real case.
     */
    expect((await withFunnel({}).execute({ ...who, agentId: 'a1' })).fills?.dominant).toBe(true);
    expect(
      (await withFunnel({ failed: 3, executed: 40 }).execute({ ...who, agentId: 'a1' })).fills
        ?.dominant,
    ).toBe(false);
  });

  it('carries the platform’s fill rate without reconciling it to the counts', async () => {
    /**
     * BattleGrid reports 63% where 27 of 60 is 45%. The two are computed
     * differently and this product does not know how — presenting them as one
     * figure would invent an agreement that does not exist.
     */
    const out = await withFunnel({}).execute({ ...who, agentId: 'a1' });
    expect(out.fills?.platformFillRatePercent).toBe(63);
  });

  it('says nothing about fills for an agent that decided no entries', async () => {
    const out = await withFunnel({ enterDecisions: 0, failed: 0, executed: 0 }).execute({
      ...who,
      agentId: 'a1',
    });
    // "0 of 0 failed" is a finding about nothing.
    expect(out.fills).toBeNull();
  });
});

describe('the protection that actually rests', () => {
  function withResting(resting: FakePositionsPort['resting']) {
    const positions = new FakePositionsPort();
    positions.result = { kind: 'exposure', exposure: anExposure() };
    positions.resting = resting;
    const agents = new FakeAgentsPort([]);
    agents.ownFunnel = { kind: 'none' };
    return new ReadExposureQuery(positions, agents, readAt(4 * MINUTE));
  }

  it('joins the venue’s reduce-only legs to the position by coin', async () => {
    // The fixture position is HYPE. Two legs on HYPE, one entry order on
    // HYPE (not reduceOnly), one leg on another coin — only the two survive.
    const out = await withResting({
      kind: 'orders',
      orders: [
        aRestingOrder({ orderId: '1', symbol: 'HYPE', orderType: 'Stop Market' }),
        aRestingOrder({ orderId: '2', symbol: 'HYPE', orderType: 'Take Profit Market' }),
        aRestingOrder({ orderId: '3', symbol: 'HYPE', reduceOnly: false }),
        aRestingOrder({ orderId: '4', symbol: 'TRUMP' }),
      ],
    }).execute({ ...who, agentId: 'a1' });

    if (out.exposure.kind !== 'holding') throw new Error(out.exposure.kind);
    const resting = out.exposure.positions[0]?.resting;
    if (resting?.kind !== 'legs') throw new Error('expected legs');
    expect(resting.legs.map((l) => l.orderId)).toEqual(['1', '2']);
  });

  it('reports a coin with nothing resting as empty legs, not as unreadable', async () => {
    const out = await withResting({
      kind: 'orders',
      orders: [aRestingOrder({ symbol: 'TRUMP' })],
    }).execute({ ...who, agentId: 'a1' });
    if (out.exposure.kind !== 'holding') throw new Error(out.exposure.kind);
    expect(out.exposure.positions[0]?.resting).toEqual({ kind: 'legs', legs: [] });
  });

  it('keeps the holding when the venue will not answer', async () => {
    // The independence the whole page is built on, extended to the fourth read.
    const out = await withResting({
      kind: 'unreadable',
      reason: 'the exchange is unreachable',
      cause: 'unreachable',
    }).execute({ ...who, agentId: 'a1' });
    if (out.exposure.kind !== 'holding') throw new Error(out.exposure.kind);
    expect(out.exposure.positions).toHaveLength(1);
    expect(out.exposure.positions[0]?.resting.kind).toBe('unreadable');
  });
});

describe('a venue row without an identity is dropped, not invented', () => {
  const answers = (content: unknown): BattleGridPort =>
    ({
      callTool: async (_req: ToolCallRequest) => ({ content }),
    }) as unknown as BattleGridPort;

  it('drops the unidentifiable row and keeps the rest', async () => {
    const adapter = new McpPositionsAdapter(
      answers({
        orders: [
          { orderId: '513946107402', symbol: 'TRUMP', side: 'SELL', reduceOnly: true, price: '1.3257', triggerPrice: '1.4731', quantity: '10.1', timestamp: 1786382848069, orderType: 'Stop Market' },
          { symbol: 'ETH', side: 'SELL', reduceOnly: true },
          { orderId: '99', side: 'BUY', reduceOnly: true },
        ],
      }),
    );
    const result = await adapter.readRestingOrders(who);
    if (result.kind !== 'orders') throw new Error(result.kind);
    expect(result.orders.map((o) => o.orderId)).toEqual(['513946107402']);
    // The decimal strings arrive as numbers, parsed once at the boundary.
    expect(result.orders[0]).toMatchObject({ triggerPrice: 1.4731, quantity: 10.1, placedAtMs: 1786382848069 });
  });

  it('reads an answer with no orders key as unreadable, never as an empty venue', async () => {
    const result = await new McpPositionsAdapter(answers({})).readRestingOrders(who);
    expect(result.kind).toBe('unreadable');
  });

  it('reads an empty list as a venue holding nothing — a real answer', async () => {
    const result = await new McpPositionsAdapter(answers({ orders: [] })).readRestingOrders(who);
    expect(result).toEqual({ kind: 'orders', orders: [] });
  });
});
