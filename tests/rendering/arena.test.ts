import { beforeEach, describe, expect, it, vi } from 'vitest';
import { aGridDetail, aGridSession, FakeMarketGridPort } from '../support/grid-fakes.js';
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

  it('a session whose detail failed still renders, and the others are untouched', async () => {
    /**
     * The whole page used to be a 500 here: the list read was guarded, the
     * per-session reads were not, and one rate-limited session threw out of
     * the use-case. `all-controllers-probe` caught it on its first run.
     */
    const grid = new FakeMarketGridPort();
    grid.stage(aGridSession({ id: 'ms-1', name: 'CRYPTO WARS · 1H' }));
    grid.stage(
      aGridSession({ id: 'ms-2', name: 'STOCKS OFFENSIVE', coinTickers: ['NVDA'] }),
      aGridDetail({ id: 'ms-2', name: 'STOCKS OFFENSIVE', status: 'LOCKED' }),
    );
    grid.unreadableDetail.add('ms-1');
    current = actingWith({ grid });

    const r = await arenaRendered();
    // Present, named, with the coin pool the list carried.
    expect(r.text).toContain('CRYPTO WARS · 1H');
    expect(r.text).toContain('BTC, ETH, HYPE');
    expect(r.text).toContain('schedule could not be read');
    // And the neighbour rendered in full.
    expect(r.text).toContain('STOCKS OFFENSIVE');
    expect(r.text).toContain('LOCKED');
  });

  it('an unread submission check does not claim the account stayed out', async () => {
    const grid = new FakeMarketGridPort();
    grid.stage(aGridSession({ id: 'ms-1' }));
    grid.unreadableSubmission.add('ms-1');
    current = actingWith({ grid });

    const r = await arenaRendered();
    expect(r.text).toContain('Whether this account entered could not be read');
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
      aGridSession({ id: 'ms-2', name: 'CRYPTO WARS · 4H', coinTickers: ['APT'] }),
      aGridDetail({ id: 'ms-2', name: 'CRYPTO WARS · 4H', status: 'LOCKED' }),
    );
    grid.submitted.add('ms-2');
    current = actingWith({ grid });

    const r = await arenaRendered();
    expect(r.text).toContain('CRYPTO WARS · 1H');
    expect(r.text).toContain('PENDING');
    expect(r.text).toContain('BTC, ETH, HYPE');
    expect(r.text).toContain('has not entered');
    expect(r.text).toContain('has entered');
    expect(r.text).toContain('Watching only');
    expect(r.text).toContain('Results arrive after settlement.');
  });

  it('a settled session stops promising results that have arrived', async () => {
    const grid = new FakeMarketGridPort();
    grid.stage(aGridSession(), aGridDetail({ status: 'SETTLED' }));
    current = actingWith({ grid });
    const r = await arenaRendered();
    expect(r.text).not.toContain('Results arrive after settlement.');
  });

  it('an unauthenticated request is offered the path to connect', async () => {
    current = { app: actingWith().app, user: notConnected };
    const r = await arenaRendered();
    expect(r.text).toContain('connect');
  });
});
