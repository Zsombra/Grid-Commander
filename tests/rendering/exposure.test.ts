import { beforeEach, describe, expect, it, vi } from 'vitest';
import { anAgent, anEntryDecision, FakeAgentsPort } from '../support/agent-fakes.js';
import { FakeClock } from '../support/fakes.js';
import { aRestingOrder, anExposure, aPosition, FakePositionsPort } from '../support/position-fakes.js';
import { actingWith } from './support/fake-acting.js';
import { rendered } from './support/render.js';

/**
 * What the agent has at stake, on the page where the agent is read.
 *
 * The property: **money at risk right now is visible, and every figure on it
 * is the platform's.** Until this shipped, an agent could hold a leveraged
 * position with a stop that had moved since it opened, and no surface in the
 * product said so — `/trades` is closed trades, `/pipeline` is decisions
 * already made.
 */

let current: { app: unknown; user: unknown };

vi.mock('@/presentation/session.js', () => ({
  acting: async () => current,
  requestApp: async () => (current as { app: unknown }).app,
}));

const AGENT = anAgent(); // id 'a1'
const params = <T extends Record<string, string>>(p: T): Promise<T> => Promise.resolve(p);
const noSearch = Promise.resolve({});

/** `generatedAtMs` on the live exposure fixture: 2026-08-06T17:55:21.702Z. */
const PRICED_MS = 1786038921702;
const PRICED_ISO = '2026-08-06T17:55:21.702Z';
const MINUTE = 60_000;

/**
 * The moment the page is rendered, as a distance from the moment it was priced.
 *
 * Every sentence about staleness below is asserted against this rather than
 * against the wall clock. A rendered age that read `Date.now()` would assert a
 * different string on every run — the flaky-fixture shape this repo has already
 * paid for once — which is why the clock is a port and why the suite's
 * composition root now takes one.
 */
const renderedAt = (offsetMs: number) => new FakeClock(new Date(PRICED_MS + offsetMs));

async function page() {
  const Page = (await import('../../app/(app)/agents/[id]/page.js')).default;
  return rendered(await Page({ params: params({ id: AGENT.id }), searchParams: noSearch }));
}

function world(
  positions: FakePositionsPort['result'],
  funnel?: FakeAgentsPort['ownFunnel'],
  decisions?: FakeAgentsPort['entryDecisions'],
  clock: FakeClock = renderedAt(4 * MINUTE),
) {
  const agents = new FakeAgentsPort([AGENT]);
  if (funnel) agents.ownFunnel = funnel;
  if (decisions) agents.entryDecisions = decisions;
  const pos = new FakePositionsPort();
  pos.result = positions;
  current = actingWith({ agents, positions: pos, clock });
  return { agents, positions: pos };
}

/**
 * The page's text as a reader meets it, rather than as JSX assembled it.
 *
 * `rendered` joins every text node with a space, so a sentence built from
 * literals either side of an interpolation arrives with its seams showing.
 * Asserting on the seams would pin the markup; the sentences below are judged
 * on their words, which is what the reader is judging them on too.
 */
const asRead = (text: string): string => text.replace(/\s+/g, ' ');

/** The decision that opened the live HYPE position, as a readable stage. */
const decided = (
  over: Parameters<typeof anEntryDecision>[0] = {},
): FakeAgentsPort['entryDecisions'] => ({
  kind: 'entries',
  entries: [anEntryDecision(over)],
  total: 1,
});

beforeEach(() => {
  current = actingWith({ agents: new FakeAgentsPort([AGENT]) });
});

describe('a position that is open right now', () => {
  it('shows the market, the stake and the platform’s own valuation', async () => {
    world({ kind: 'exposure', exposure: anExposure() });
    const r = await page();
    expect(r.text).toContain('HYPE LONG');
    expect(r.text).toContain('5× leverage');
    expect(r.text).toContain('$12.36 at stake');
    expect(r.text).toContain('$2.47 margined');
    // The platform's figure, negative and shown as such.
    expect(r.text).toContain('Unrealized -$0.01');
  });

  it('shows the stop as the current one, not the one decided', async () => {
    /**
     * The decision behind this position recorded `stopLoss: 55.67456526`;
     * trailing moved it to 55.954. Every surface used to show the decided one,
     * understating the protection in force.
     */
    world({ kind: 'exposure', exposure: anExposure() });
    const r = await page();
    expect(r.text).toContain('Stop now 55.954');
    expect(r.text).toContain('position management moves them');
    expect(r.text).not.toContain('55.67456526');
  });

  it('says when it was priced rather than pretending to be live', async () => {
    world({ kind: 'exposure', exposure: anExposure() });
    const r = await page();
    expect(r.text).toContain('a snapshot, not a live ticker');
    expect(r.text).toContain(PRICED_ISO);
  });

  it('renders an unpriced position as unknown, never as flat', async () => {
    world({
      kind: 'exposure',
      exposure: anExposure({
        totals: { ...anExposure().totals, unpricedPositionCount: 1 },
        positions: [aPosition({ markPrice: null, unrealizedPnlUsd: null, roePct: null })],
      }),
    });
    const r = await page();
    expect(r.text).toContain('Unrealized result unknown');
    expect(r.text).toContain('could not price 1 of them');
    expect(r.text).not.toContain('Unrealized $0.00');
  });
});

describe('how stale it is, and what can be done about it', () => {
  /**
   * The sentence a reader who has been sitting on this page needs.
   *
   * `Priced 2026-08-06T17:55:21.702Z` was true a second after the page loaded
   * and equally true four minutes later, which is twenty-four of the platform's
   * own ten-second refresh intervals on a 5× leveraged position. The timestamp
   * is a fact about the past; only the age is a statement about *now*.
   */
  const said = async (offsetMs: number, exposure = anExposure()) => {
    world({ kind: 'exposure', exposure }, undefined, undefined, renderedAt(offsetMs));
    return page();
  };

  it('states the age beside the stamp, not instead of it', async () => {
    const r = await said(4 * MINUTE);
    expect(asRead(r.text)).toContain(`Priced 4 minutes ago, at ${PRICED_ISO}`);
    // The disclaimer is the floor this stands on and does not move.
    expect(r.text).toContain('a snapshot, not a live ticker');
  });

  it('reads a page opened at once as fresh rather than as zero minutes old', async () => {
    expect((await said(20_000)).text).toContain('Priced less than a minute ago');
  });

  it('counts in the units the wait is felt in', async () => {
    expect((await said(MINUTE)).text).toContain('Priced 1 minute ago');
    expect((await said(3 * 60 * MINUTE)).text).toContain('Priced 3 hours ago');
    expect((await said(50 * 60 * MINUTE)).text).toContain('Priced 2 days ago');
  });

  it('offers a re-read, and it is a link to this same page', async () => {
    /**
     * The whole affordance: an ordinary `<a>` back to `/agents/[id]`. A full
     * page load, a server render, a fresh read — no client component, and
     * nothing that could be read as the panel updating itself. Asserted
     * through `links` rather than the text, because a label that is not
     * reachable is not an affordance.
     */
    const r = await said(4 * MINUTE);
    expect(r.text).toContain('Read these figures again');
    expect(r.links).toContain(`/agents/${AGENT.id}`);
  });

  it('states the time and claims no age when the stamp is ahead of the clock', async () => {
    // A read served by a machine whose clock trails BattleGrid's. Ordinary
    // skew, and never rendered as "priced -1 minutes ago".
    const r = await said(-1_000);
    expect(asRead(r.text)).toContain(`Priced at ${PRICED_ISO}`);
    expect(asRead(r.text)).toContain('how long ago that was cannot be said');
    expect(r.text).not.toMatch(/Priced (less than|\d+ (minute|hour|day))/);
    expect(r.text).toContain('a snapshot, not a live ticker');
  });

  it('still calls itself a snapshot when the platform stated no priced time', async () => {
    /**
     * The line used to be dropped whole when `generatedAtMs` was null, which
     * took the snapshot disclaimer with it — on the one read least able to
     * justify being trusted as current.
     */
    const totals = { ...anExposure().totals, generatedAtMs: null };
    const r = await said(4 * MINUTE, anExposure({ totals }));
    expect(asRead(r.text)).toContain(
      'BattleGrid did not say when this was priced — a snapshot, not a live ticker.',
    );
    // And the way out is still offered: an unstated age is a reason to re-read,
    // not a reason to withhold the only thing the reader can do.
    expect(r.links).toContain(`/agents/${AGENT.id}`);
  });
});

describe('the stop that moved', () => {
  /**
   * The drift, on the surface where an operator decides whether to intervene.
   *
   * Both numbers were already in the product before this — `Stop now 55.954`
   * here, `At the decision … 55.67456526` on `/pipeline` — and no page said
   * they were the same stop. Until they are shown together, a trailing setting
   * an operator configured has never been observably done anything.
   */
  it('shows the decided stop beside the current one and says which way it moved', async () => {
    world({ kind: 'exposure', exposure: anExposure() }, undefined, decided());
    const r = await page();
    expect(r.text).toContain('Stop now 55.954');
    expect(r.text).toContain('The decision set the stop at 55.67456526');
    expect(r.text).toContain('it is now 55.954');
    // The reading, not just the pair. A LONG whose stop rose is better covered
    // than the decision asked for, and the opposite sentence would be the
    // opposite of the truth.
    expect(r.text).toContain('moved to protect more of this position');
  });

  it('reads the same move on a short as less protection', async () => {
    world(
      { kind: 'exposure', exposure: anExposure({ positions: [aPosition({ direction: 'SHORT' })] }) },
      undefined,
      decided(),
    );
    const r = await page();
    expect(r.text).toContain('moved to protect less of this position');
  });

  it('says nothing about drift when the stop is where the decision put it', async () => {
    world({ kind: 'exposure', exposure: anExposure() }, undefined, decided({ stopLoss: 55.954 }));
    const r = await page();
    expect(r.text).toContain('Stop now 55.954');
    expect(r.text).not.toContain('The decision set the stop');
    expect(r.text).not.toContain('could not be read');
  });

  it('calls the decided stop unknown when the decision could not be found', async () => {
    /**
     * A decision older than the window read is a decision this page has not
     * seen — not a stop that has stayed put. Never imply no drift.
     */
    world({ kind: 'exposure', exposure: anExposure() }, undefined, decided({ id: 'another' }));
    const r = await page();
    expect(r.text).toContain('Where the decision put this stop is unknown');
    expect(r.text).not.toContain('moved to protect');
  });

  it('renders the position in full when the decision list could not be read', async () => {
    // One of three reads failing costs the operator a sentence, never the
    // holding. This repo's oldest rule, on the surface that carries money.
    world({ kind: 'exposure', exposure: anExposure() }, undefined, {
      kind: 'unreadable',
      reason: 'BattleGrid did not answer',
      cause: 'unreachable',
    });
    const r = await page();
    expect(r.text).toContain('HYPE LONG');
    expect(r.text).toContain('Stop now 55.954');
    expect(r.text).toContain('Unrealized -$0.01');
    expect(r.text).toContain('Where the decision put this stop is unknown');
  });

  it('states a moved target without calling it protection', async () => {
    // Stop unmoved, target moved — so the only drift on the page is the
    // target's, and a stray protection claim has nowhere to hide.
    world(
      { kind: 'exposure', exposure: anExposure() },
      undefined,
      decided({ stopLoss: 55.954, takeProfit: 57.1 }),
    );
    const r = await page();
    expect(r.text).toContain('The decision set the target at 57.1');
    expect(r.text).toContain('it is now 57.34986948');
    // A target in a new place is a different exit, not more or less cover.
    // Asserted on the drift wording itself, not the whole page — the venue
    // section below legitimately speaks of protective orders, which is a
    // different claim about a different system.
    expect(r.text).not.toContain('moved to protect');
    expect(r.text).not.toMatch(/target[^.]*protect/i);
  });
});

describe('the two ways of holding nothing', () => {
  it('says it is holding nothing when the platform said so', async () => {
    world({ kind: 'none' });
    const r = await page();
    expect(r.text).toContain('holding nothing right now');
  });

  it('never renders a failed position read as holding nothing', async () => {
    world({ kind: 'unreadable', reason: 'BattleGrid did not answer', cause: 'unreachable' });
    const r = await page();
    expect(r.text).toContain('could not be read');
    expect(r.text).not.toContain('holding nothing right now');
  });
});

describe('a position read that failed says what it does not mean', () => {
  /**
   * The last panel in the product to print a reason and stop, and the one where
   * that costs the most: a blank where money should be is the place a reader is
   * likeliest to conclude something was closed out. Read against the rendered
   * page rather than the source, because the source has said the right words in
   * the wrong grammar before — "this does not mean this agent's limits gone"
   * shipped on two surfaces and nothing read it back.
   */
  it('names the positions, in a sentence that completes', async () => {
    world({ kind: 'unreadable', reason: 'BattleGrid did not answer', cause: 'unreachable' });
    const r = await page();
    expect(asRead(r.text)).toContain(
      'This does not mean this agent’s positions are gone — ' +
        'Grid-Commander could not reach BattleGrid to ask.',
    );
  });

  it('tells a refusal from an outage', async () => {
    // Opposite actions: a refused authority is fixed by reconnecting, an
    // unreachable platform by waiting. Neither is legible from the reason, and
    // offering both would be offering neither.
    world({ kind: 'unreadable', reason: 'BattleGrid declined the request', cause: 'refused' });
    const said = asRead((await page()).text);
    expect(said).toContain('This does not mean this agent’s positions are gone');
    expect(said).toContain('BattleGrid refused the authority Grid-Commander presented');
    expect(said).not.toContain('could not reach BattleGrid');
  });

  it('adds the reassurance beside the reason, not instead of it', async () => {
    // The reason is the only specific information on this branch — which HTTP
    // status, which refusal — and the sentence above generalises by design.
    world({ kind: 'unreadable', reason: 'HTTP 502 from BattleGrid', cause: 'unreachable' });
    const said = asRead((await page()).text);
    expect(said).toContain(
      'What this agent is holding could not be read: HTTP 502 from BattleGrid',
    );
  });
});

describe('entries that never became an order', () => {
  const FUNNEL = (over: Record<string, number | null> = {}): FakeAgentsPort['ownFunnel'] => ({
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
      avgAggregateScorePercent: null,
      avgConvictionPercent: null,
      avgRiskRewardRatio: null,
      outcomeCount: null,
      winCount: null,
      lossCount: null,
      winRatePercent: null,
      avgNetPnl: null,
      totalNetPnl: null,
      avgDurationSeconds: null,
      topCoins: [],
      ...over,
    },
  });

  it('states the count against the total, not as a statistic', async () => {
    world({ kind: 'none' }, FUNNEL());
    const r = await page();
    expect(r.text).toContain('28 of 60 entries never became an order');
    expect(r.text).toContain('More of what this agent decided failed than succeeded');
  });

  it('attributes the platform’s fill rate to the platform', async () => {
    // 63% against counts that give 27 of 60. Different computations, and this
    // product does not claim to know how theirs works.
    world({ kind: 'none' }, FUNNEL());
    const r = await page();
    expect(r.text).toContain("BattleGrid's own fill rate for this agent is 63%");
  });

  it('asserts no reason for an individual failure', async () => {
    world({ kind: 'none' }, FUNNEL());
    const r = await page();
    expect(r.text).toContain('does not say why an individual entry failed');
  });

  it('says nothing when every entry became an order', async () => {
    world({ kind: 'none' }, FUNNEL({ failed: 0, executed: 60 }));
    const r = await page();
    expect(r.text).not.toContain('never became an order');
  });
});

describe('the protection that actually rests, as a person reads it', () => {
  it('renders each resting leg with its type, trigger, size and venue order id', async () => {
    const { positions } = world({ kind: 'exposure', exposure: anExposure() });
    positions.resting = {
      kind: 'orders',
      orders: [
        aRestingOrder({ orderId: '513946107402', symbol: 'HYPE', orderType: 'Stop Market', triggerPrice: 55.9, quantity: 0.22 }),
        aRestingOrder({ orderId: '513871161240', symbol: 'HYPE', orderType: 'Take Profit Market', triggerPrice: 57.3, quantity: 0.22 }),
      ],
    };
    const r = await page();
    expect(r.text).toContain('Resting at the venue for HYPE, as of this read');
    expect(r.text).toContain('Stop Market');
    expect(r.text).toContain('triggers at 55.9');
    expect(r.text).toContain('venue order 513946107402');
    expect(r.text).toContain('Take Profit Market');
  });

  it('says plainly when nothing rests — the naked position is the headline', async () => {
    // The fake's default venue book is empty, which for a held position is
    // exactly the sharpest case: software claims a stop, the exchange holds none.
    world({ kind: 'exposure', exposure: anExposure() });
    const r = await page();
    expect(r.text).toContain('No protective order rests at the venue for HYPE');
    expect(r.text).toContain('exists only in BattleGrid’s software');
  });

  it('loses only the venue column when the exchange will not answer', async () => {
    const { positions } = world({ kind: 'exposure', exposure: anExposure() });
    positions.resting = { kind: 'unreadable', reason: 'the exchange is unreachable', cause: 'unreachable' };
    const r = await page();
    // The failure explains itself with the shared sentence…
    expect(r.text).toContain('Whether protection rests at the venue could not be read');
    expect(r.text).toContain('This does not mean');
    // …and the position, its levels and its drift all still render.
    expect(r.text).toContain('HYPE LONG');
    expect(r.text).toContain('Stop now 55.954');
  });
});

describe('what the management engine reports', () => {
  it('says both statuses in the platform’s words', async () => {
    // The fake's default mirrors the live read of 2026-08-11.
    world({ kind: 'exposure', exposure: anExposure() });
    const r = await page();
    expect(r.text).toContain('Management engine: break-even ACTIVE · trailing ACTIVE — BattleGrid’s own words.');
  });

  it('renders a word it has never seen as itself', async () => {
    world({
      kind: 'exposure',
      exposure: anExposure({ positions: [aPosition({ trailingStatus: 'GIVEBACK_ARMED' })] }),
    });
    const r = await page();
    expect(r.text).toContain('trailing GIVEBACK_ARMED');
  });

  it('claims no state when the platform said nothing', async () => {
    world({
      kind: 'exposure',
      exposure: anExposure({
        positions: [aPosition({ breakEvenStatus: null, trailingStatus: null })],
      }),
    });
    const r = await page();
    // Absent is not idle: no line at all, and nothing reads as a default.
    expect(r.text).not.toContain('Management engine');
  });
});
