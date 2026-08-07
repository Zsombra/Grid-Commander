import { beforeEach, describe, expect, it, vi } from 'vitest';
import { aGamePreset, aGridDetail, aGridSession, FakeMarketGridPort } from '../support/grid-fakes.js';
import { actingWith, notConnected } from './support/fake-acting.js';
import { rendered } from './support/render.js';

/**
 * The arena page, branch by branch — the same discipline
 * `pages-name-their-entity` applies to agents and strategies. The branch
 * that matters most is the first: an unreadable list must never render as
 * an empty arena, because "nothing is running" invites a player back later
 * and "nothing could be read" tells them something is wrong now.
 */

let current: { app: unknown; user: unknown };

vi.mock('@/presentation/session.js', () => ({
  acting: async () => current,
  requestApp: async () => (current as { app: unknown }).app,
}));

async function arenaRendered() {
  const Page = (await import('../../app/(app)/arena/page.js')).default;
  return rendered(await Page());
}

async function sessionRendered(id: string) {
  const Page = (await import('../../app/(app)/arena/[id]/page.js')).default;
  return rendered(await Page({ params: Promise.resolve({ id }) }));
}

/**
 * The page's text as a reader meets it, rather than as JSX assembled it.
 *
 * `rendered` joins every text node with a space, so a sentence built around an
 * interpolated figure — and the price of a session is nothing but interpolated
 * figures — arrives with its seams showing. The same helper `exposure.test.ts`
 * uses, for the same reason.
 */
const asRead = (text: string): string => text.replace(/\s+/g, ' ');

beforeEach(() => {
  current = actingWith();
});

describe('the arena page, branch by branch', () => {
  it('an unreadable list says so — never an empty arena', async () => {
    const grid = new FakeMarketGridPort();
    grid.list = { kind: 'unreadable', reason: 'BattleGrid timed out', cause: 'unreachable' };
    current = actingWith({ grid });
    const r = await arenaRendered();
    expect(r.headings[0]).toBe('The arena could not be read');
    expect(r.text).toContain('BattleGrid timed out');
    expect(r.text).not.toContain('no Market Grid sessions');
  });

  it('a session whose submission check failed still shows its schedule', async () => {
    /**
     * The whole page used to be a 500 here: the list read was guarded, the
     * per-session reads were not, and one rate-limited session threw out of
     * the use-case. `all-controllers-probe` caught it on its first run.
     *
     * This test used to fail the *detail* read and assert "schedule could not
     * be read". That sentence is gone, and its absence is the point of the
     * change: the schedule is on the list row that rendered the session, so
     * saying it could not be read was false. What can still fail is the
     * submission check, and it may cost the entered fact and nothing else.
     */
    const grid = new FakeMarketGridPort();
    grid.stage(aGridSession({ id: 'ms-1', name: 'CRYPTO WARS · 1H' }));
    grid.stage(
      aGridSession({
        id: 'ms-2',
        name: 'STOCKS OFFENSIVE',
        coinTickers: ['NVDA'],
        status: 'LOCKED',
      }),
    );
    grid.unreadableSubmission.add('ms-1');
    current = actingWith({ grid });

    const r = await arenaRendered();
    // Present, named, with the coin pool and the schedule the list carried.
    expect(r.text).toContain('CRYPTO WARS · 1H');
    expect(r.text).toContain('BTC, ETH, HYPE');
    expect(asRead(r.text)).toContain('Locks 2026-08-01T18:00:00Z');
    expect(r.text).not.toContain('schedule could not be read');
    // And the neighbour rendered in full.
    expect(r.text).toContain('STOCKS OFFENSIVE');
    expect(r.text).toContain('LOCKED');
  });

  it('never asks for a session detail it already has', async () => {
    /**
     * The fan-out, asserted as a call count rather than as rendered text —
     * fifty `get_market_grid_session` calls for four fields the list row
     * already carried, which is where `all-controllers-probe` met HTTP 429.
     * Both payloads were compared live on 2026-08-06 and the four fields came
     * back byte-identical, so a rendering assertion cannot tell which call
     * filled them and would pass against the fan-out's return.
     */
    const grid = new FakeMarketGridPort();
    grid.stage(aGridSession({ id: 'ms-1' }));
    grid.stage(aGridSession({ id: 'ms-2' }));
    current = actingWith({ grid });

    await arenaRendered();
    expect(grid.detailCalls).toEqual([]);
    expect(grid.submissionCalls).toEqual(['ms-1', 'ms-2']);
  });

  it('an unread submission check does not claim the account stayed out', async () => {
    const grid = new FakeMarketGridPort();
    grid.stage(aGridSession({ id: 'ms-1' }));
    grid.unreadableSubmission.add('ms-1');
    current = actingWith({ grid });

    const r = await arenaRendered();
    expect(r.text).toContain('Whether this account entered could not be read');
    // The reason rides with it now. It used to be spent on the schedule
    // sentence, which no longer exists to spend it on.
    expect(r.text).toContain('BattleGrid did not answer');
    expect(r.text).not.toContain('has not entered this session');
  });

  it('an empty arena says the platform lists nothing', async () => {
    const r = await arenaRendered();
    expect(r.headings[0]).toBe('Arena');
    expect(r.text).toContain('lists no Market Grid sessions');
  });

  it('a session shows schedule, coins, entry state — and that watching is all there is', async () => {
    const grid = new FakeMarketGridPort();
    grid.stage(aGridSession());
    grid.stage(
      aGridSession({
        id: 'ms-2',
        name: 'CRYPTO WARS · 4H',
        coinTickers: ['APT'],
        status: 'LOCKED',
        playerCount: 12,
      }),
    );
    grid.submitted.add('ms-2');
    current = actingWith({ grid });

    const r = await arenaRendered();
    expect(r.text).toContain('CRYPTO WARS · 1H');
    expect(r.text).toContain('PENDING');
    expect(r.text).toContain('BTC, ETH, HYPE');
    expect(asRead(r.text)).toContain('settles 2026-08-01T19:00:00Z');
    expect(asRead(r.text)).toContain('12 player(s)');
    expect(r.text).toContain('has not entered');
    expect(r.text).toContain('has entered');
    expect(r.text).toContain('Watching only');
    expect(r.text).toContain('Results arrive after settlement.');
  });

  it('a settled session stops promising results that have arrived', async () => {
    const grid = new FakeMarketGridPort();
    // The status is read off the list row now, so that is where the fixture
    // sets it — a staged detail would be a payload nobody would read.
    grid.stage(aGridSession({ status: 'SETTLED' }));
    current = actingWith({ grid });
    const r = await arenaRendered();
    expect(r.text).not.toContain('Results arrive after settlement.');
    // And it is bespoke silence, not the fall-through for words the surface
    // has no reading of — SETTLED's meaning is stated by the results tool
    // itself, so shunting it there would disclaim something that is known.
    expect(r.text).not.toContain('no reading of it');
  });

  it('a cancelled session is promised nothing', async () => {
    /**
     * The ordinary case, not an edge: 48 of the 50 sessions the live list
     * returned on 2026-08-06 were CANCELLED, and every one of them was told
     * "Results arrive after settlement" — a promise about an event that will
     * never happen, made in this product's own voice. Cancellation is
     * terminal, and the row now says so plainly.
     */
    const grid = new FakeMarketGridPort();
    grid.stage(aGridSession({ status: 'CANCELLED' }));
    current = actingWith({ grid });

    const r = await arenaRendered();
    expect(r.text).toContain('CANCELLED');
    expect(asRead(r.text)).toContain(
      'This session was cancelled. It will not settle, and no results will be published.',
    );
    expect(r.text).not.toContain('Results arrive after settlement.');
  });

  it('a status outside the observed vocabulary is the platform word, with no claim attached', async () => {
    /**
     * The declared enum also carries LIVE, RESOLVING and
     * SETTLEMENT_QUARANTINED, none ever observed on a session — and this
     * repo has twice been shown a vocabulary it thought was closed. A word
     * without bespoke prose renders as the platform's own, the BindingSummary
     * third-branch treatment: reported, not interpreted, promised nothing.
     * The fixture word is deliberately outside the declared enum too, because
     * the branch exists for whatever a future deployment says next.
     */
    const grid = new FakeMarketGridPort();
    grid.stage(aGridSession({ status: 'LOCKED' }));
    current = actingWith({ grid });

    const r = await arenaRendered();
    expect(asRead(r.text)).toContain(
      `LOCKED is the platform's own word for this session's state — Grid-Commander has no reading of it, and neither promises results nor rules them out.`,
    );
    expect(r.text).not.toContain('Results arrive after settlement.');
    expect(r.text).not.toContain('was cancelled');
  });

  it('a session the list gave no status neither promises results nor denies them', async () => {
    /**
     * `status: null` is "the platform did not say", and a session in an unknown
     * state is not a session known to be unsettled. Telling a reader to come
     * back after settlement is a claim, and this read made none.
     */
    const grid = new FakeMarketGridPort();
    grid.stage(aGridSession({ status: null }));
    current = actingWith({ grid });
    const r = await arenaRendered();
    expect(r.text).toContain('status not stated');
    expect(r.text).not.toContain('Results arrive after settlement.');
    // Unreadable is not a vocabulary word either: null is the named unknown,
    // not a platform word to be quoted back with a disclaimer.
    expect(r.text).not.toContain('no reading of it');
  });

  it('an unauthenticated request is offered the path to connect', async () => {
    current = { app: actingWith().app, user: notConnected };
    const r = await arenaRendered();
    expect(r.text).toContain('connect');
  });
});

describe('the arena states what the game costs', () => {
  it('shows the rulebook: the grid, the price and what a call is worth', async () => {
    const grid = new FakeMarketGridPort();
    grid.stage(aGridSession());
    current = actingWith({ grid });

    const r = await arenaRendered();
    expect(r.text).toContain('CRYPTO WARS');
    // 3×3 of nine, which is the operator's description of the game stated as
    // the platform's own numbers.
    expect(asRead(r.text)).toContain('9 coins to call');
    expect(asRead(r.text)).toContain('entry 10');
    // Seams and all: the multiplier is an interpolated figure, and what is
    // being asserted is that the sentence carries the platform's number rather
    // than how the JSX was split.
    expect(asRead(r.text)).toContain('price change × 100');
  });

  it('prices every session from the list, even one whose submission check failed', async () => {
    const grid = new FakeMarketGridPort();
    grid.stage(aGridSession({ id: 'ms-1' }));
    grid.unreadableSubmission.add('ms-1');
    current = actingWith({ grid });

    const r = await arenaRendered();
    expect(r.text).toContain('Whether this account entered could not be read');
    // The stake and the schedule both come off the list, so they survive the
    // one per-session read that is left failing.
    expect(asRead(r.text)).toContain('Entry 10');
    expect(asRead(r.text)).toContain('PENDING');
  });

  it('says a fee it could not read is unknown, never free', async () => {
    const grid = new FakeMarketGridPort();
    grid.stage(aGridSession({ entryFee: null, prizePool: null }));
    current = actingWith({ grid });

    const r = await arenaRendered();
    expect(asRead(r.text)).toContain('Entry not stated');
    expect(asRead(r.text)).not.toContain('Entry 0');
  });

  it('says how many more players a session needs to run', async () => {
    const grid = new FakeMarketGridPort();
    grid.stage(aGridSession({ playersNeeded: 2, minimumPlayers: 4 }));
    current = actingWith({ grid });

    const r = await arenaRendered();
    expect(asRead(r.text)).toContain('Needs 2 more player');
    expect(asRead(r.text)).toContain('minimum of 4');
  });

  it('rules that could not be read say so, and the sessions still list', async () => {
    const grid = new FakeMarketGridPort();
    grid.stage(aGridSession({ name: 'CRYPTO WARS · 1H' }));
    grid.rules = { kind: 'unreadable', reason: 'BattleGrid timed out', cause: 'unreachable' };
    current = actingWith({ grid });

    const r = await arenaRendered();
    expect(r.text).toContain('rules could not be read');
    expect(r.text).toContain('CRYPTO WARS · 1H');
    // Two independent reads: the rulebook failing is not the arena failing.
    expect(r.headings[0]).toBe('Arena');
  });

  it('states no jackpot the platform did not state', async () => {
    const grid = new FakeMarketGridPort();
    grid.rules = { kind: 'rules', presets: [aGamePreset({ jackpotEnabled: false })] };
    current = actingWith({ grid });

    const r = await arenaRendered();
    expect(r.text).not.toContain('jackpot');
  });

  it('opens each listed session', async () => {
    const grid = new FakeMarketGridPort();
    grid.stage(aGridSession({ id: 'ms-7' }));
    current = actingWith({ grid });

    const r = await arenaRendered();
    expect(r.links).toContain('/arena/ms-7');
  });
});

describe('one session, opened', () => {
  it('names the session and shows schedule, entry state and the results state', async () => {
    const grid = new FakeMarketGridPort();
    grid.stage(
      aGridSession({ id: 'ms-1', name: 'CRYPTO WARS · 1H' }),
      aGridDetail({ id: 'ms-1', name: 'CRYPTO WARS · 1H', status: 'PENDING' }),
    );
    current = actingWith({ grid });

    const r = await sessionRendered('ms-1');
    expect(r.headings[0]).toBe('CRYPTO WARS · 1H');
    expect(r.text).toContain('PENDING');
    expect(r.text).toContain('has not entered this session');
    // The platform's refusal, rendered as the state it is.
    expect(r.text).toContain('published after this session settles');
    expect(r.links).toContain('/arena');
  });

  it('a session that could not be read is not called a session that does not exist', async () => {
    const grid = new FakeMarketGridPort();
    grid.stage(aGridSession({ id: 'ms-1' }));
    grid.unreadableDetail.add('ms-1');
    current = actingWith({ grid });

    const r = await sessionRendered('ms-1');
    expect(r.text).toContain('could not be read');
    expect(r.text).not.toContain('No such session');
    // And the reads that did answer still answer.
    expect(r.text).toContain('has not entered this session');
  });

  it('an unread submission check does not claim the account stayed out', async () => {
    const grid = new FakeMarketGridPort();
    grid.stage(aGridSession({ id: 'ms-1' }));
    grid.unreadableSubmission.add('ms-1');
    current = actingWith({ grid });

    const r = await sessionRendered('ms-1');
    expect(r.text).toContain('Whether this account entered could not be read');
    expect(r.text).not.toContain('has not entered this session');
  });

  it('a settled session says results exist and refuses to report figures it has not seen', async () => {
    const grid = new FakeMarketGridPort();
    grid.stage(aGridSession({ id: 'ms-1' }), aGridDetail({ id: 'ms-1', status: 'SETTLED' }));
    grid.outcome = {
      kind: 'settled',
      payloadUnmodelled: { leaderboard: [{ rank: 1 }], resolutions: [], playerGrids: [] },
    };
    current = actingWith({ grid });

    const r = await sessionRendered('ms-1');
    expect(r.text).toContain('has published results');
    expect(r.text).toContain('does not read them yet');
    expect(asRead(r.text)).toContain('returned 3 field(s)');
    // Nothing from inside the payload reaches the page.
    expect(r.text).not.toContain('rank');
    expect(r.text).not.toContain('leaderboard');
  });

  it('a results read that failed is not reported as "not settled yet"', async () => {
    const grid = new FakeMarketGridPort();
    grid.stage(aGridSession({ id: 'ms-1' }));
    grid.outcome = { kind: 'unreadable', reason: 'BattleGrid timed out', cause: 'unreachable' };
    current = actingWith({ grid });

    const r = await sessionRendered('ms-1');
    expect(r.text).toContain('results could not be read');
    expect(r.text).toContain('BattleGrid timed out');
    expect(r.text).not.toContain('published after this session settles');
  });

  it('an unauthenticated request is offered the path to connect', async () => {
    current = { app: actingWith().app, user: notConnected };
    const r = await sessionRendered('ms-1');
    expect(r.text).toContain('connect');
  });
});
