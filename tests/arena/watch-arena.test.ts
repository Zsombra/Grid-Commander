import { describe, expect, it } from 'vitest';
import { WatchArenaQuery } from '@/application/use-cases/watch-arena.query.js';
import { aGridSession, FakeMarketGridPort } from '../support/grid-fakes.js';

const who = { userId: 'u1', accessToken: 'at' };

describe('watching the arena', () => {
  it('merges the schedule, coin pool and the entered fact per session', async () => {
    const grid = new FakeMarketGridPort();
    grid.stage(aGridSession({ id: 'ms-1' }));
    grid.stage(
      aGridSession({
        id: 'ms-2',
        name: 'CRYPTO WARS · 4H',
        coinTickers: ['APT', 'AVAX'],
        status: 'LOCKED',
        playerCount: 12,
      }),
    );
    grid.submitted.add('ms-2');

    const result = await new WatchArenaQuery(grid).execute(who);
    expect(result.kind).toBe('arena');
    if (result.kind !== 'arena') return;
    expect(result.sessions).toHaveLength(2);

    const [first, second] = result.sessions;
    expect(first?.entered).toBe(false);
    expect(first?.coinTickers).toEqual(['BTC', 'ETH', 'HYPE']);
    expect(second?.entered).toBe(true);
    // Off the list row, not off a detail call.
    expect(second?.status).toBe('LOCKED');
    expect(second?.playerCount).toBe(12);
  });

  it('reads the schedule off the list and makes no detail call at all', async () => {
    /**
     * Fifty sessions used to mean fifty `get_market_grid_session` calls, for
     * `status`, `lockAt`, `settleAt` and `playerCount` — which
     * `list_market_grid_sessions` sends on every row (observed on all fifty,
     * 2026-08-06). That fan-out is where `all-controllers-probe` met HTTP 429.
     *
     * Asserting the rendered schedule would not catch its return: the fields
     * read the same whichever call filled them. The call count is the property.
     */
    const grid = new FakeMarketGridPort();
    grid.stage(aGridSession({ id: 'ms-1', lockAt: '2026-08-06T10:00:00Z' }));
    grid.stage(aGridSession({ id: 'ms-2', status: 'LOCKED' }));

    const result = await new WatchArenaQuery(grid).execute(who);
    if (result.kind !== 'arena') throw new Error(result.kind);

    expect(grid.detailCalls).toEqual([]);
    // One per session, and only the question no list can answer: whether *this
    // account* entered.
    expect(grid.submissionCalls).toEqual(['ms-1', 'ms-2']);
    expect(result.sessions[0]?.lockAt).toBe('2026-08-06T10:00:00Z');
    expect(result.sessions[1]?.status).toBe('LOCKED');
  });

  it('keeps the schedule when the submission check is the read that failed', async () => {
    /**
     * The successor to "keeps a session whose detail could not be read". The
     * detail read is gone, so the only per-session failure left is the
     * submission check — and it must cost the entered fact alone. The arena
     * used to answer this case by saying the *schedule* could not be read,
     * while the schedule sat in the list payload that rendered the row.
     */
    const grid = new FakeMarketGridPort();
    grid.stage(aGridSession({ id: 'ms-1', name: 'CRYPTO WARS · 1H' }));
    grid.stage(aGridSession({ id: 'ms-2', name: 'STOCKS OFFENSIVE', status: 'LOCKED' }));
    grid.unreadableSubmission.add('ms-1');

    const result = await new WatchArenaQuery(grid).execute(who);
    if (result.kind !== 'arena') throw new Error(result.kind);
    const [first, second] = result.sessions;

    // Everything the list carried survives the read that failed.
    expect(first?.name).toBe('CRYPTO WARS · 1H');
    expect(first?.coinTickers).toEqual(['BTC', 'ETH', 'HYPE']);
    expect(first?.status).toBe('PENDING');
    expect(first?.settleAt).toBe('2026-08-01T19:00:00Z');
    expect(first?.entered).toBeNull();
    expect(first?.unreadable).toBe('BattleGrid did not answer');
    // And the neighbour is untouched.
    expect(second?.status).toBe('LOCKED');
    expect(second?.entered).toBe(false);
  });

  it('never reports an unread submission check as not having entered', async () => {
    /**
     * `entered` was a boolean, and the page rendered `!entered` as "this
     * account has not entered this session" — a definite claim produced by a
     * read that returned nothing. Same error as an unreadable roster shown as
     * an empty one.
     */
    const grid = new FakeMarketGridPort();
    grid.stage(aGridSession({ id: 'ms-1' }));
    grid.unreadableSubmission.add('ms-1');

    const result = await new WatchArenaQuery(grid).execute(who);
    if (result.kind !== 'arena') throw new Error(result.kind);
    expect(result.sessions[0]?.entered).toBeNull();
    expect(result.sessions[0]?.entered).not.toBe(false);
  });

  it('no sessions is the empty arena, not an error', async () => {
    const result = await new WatchArenaQuery(new FakeMarketGridPort()).execute(who);
    expect(result).toEqual({ kind: 'empty' });
  });

  it('an unreadable list stays unreadable — never an empty arena', async () => {
    const grid = new FakeMarketGridPort();
    grid.list = { kind: 'unreadable', reason: 'BattleGrid timed out', cause: 'unreachable' };
    const result = await new WatchArenaQuery(grid).execute(who);
    expect(result).toEqual({ kind: 'unreadable', reason: 'BattleGrid timed out', cause: 'unreachable' });
  });
});
