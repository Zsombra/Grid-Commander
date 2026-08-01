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
    expect(second?.status).toBe('LOCKED');
    expect(second?.playerCount).toBe(12);
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
