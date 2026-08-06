import { describe, expect, it } from 'vitest';
import { WatchArenaQuery } from '@/application/use-cases/watch-arena.query.js';
import { aGridDetail, aGridSession, FakeMarketGridPort } from '../support/grid-fakes.js';

const who = { userId: 'u1', accessToken: 'at' };

describe('watching the arena', () => {
  it('merges detail, coin pool and the entered fact per session', async () => {
    const grid = new FakeMarketGridPort();
    grid.stage(aGridSession({ id: 'ms-1' }));
    grid.stage(
      aGridSession({ id: 'ms-2', name: 'CRYPTO WARS · 4H', coinTickers: ['APT', 'AVAX'] }),
      aGridDetail({ id: 'ms-2', name: 'CRYPTO WARS · 4H', status: 'LOCKED', playerCount: 12 }),
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
    expect(second?.detail?.status).toBe('LOCKED');
    expect(second?.detail?.playerCount).toBe(12);
  });

  it('keeps a session whose detail could not be read, and the ones that could', async () => {
    /**
     * The defect this was written for. `listSessions` was guarded and the two
     * per-session reads were not, so one rate-limited session threw out of the
     * use-case and `/arena` answered 500 — while `readField`, hitting the same
     * limit in the same walk, degraded correctly.
     */
    const grid = new FakeMarketGridPort();
    grid.stage(aGridSession({ id: 'ms-1', name: 'CRYPTO WARS · 1H' }));
    grid.stage(aGridSession({ id: 'ms-2', name: 'STOCKS OFFENSIVE' }), aGridDetail({ id: 'ms-2', status: 'LOCKED' }));
    grid.unreadableDetail.add('ms-1');

    const result = await new WatchArenaQuery(grid).execute(who);
    if (result.kind !== 'arena') throw new Error(result.kind);
    const [first, second] = result.sessions;

    // Still present, with what the list carried.
    expect(first?.name).toBe('CRYPTO WARS · 1H');
    expect(first?.coinTickers).toEqual(['BTC', 'ETH', 'HYPE']);
    expect(first?.detail).toBeNull();
    expect(first?.unreadable).toBe('BattleGrid did not answer');
    // And the neighbour is untouched.
    expect(second?.detail?.status).toBe('LOCKED');
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
