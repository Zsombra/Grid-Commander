import { beforeEach, describe, expect, it, vi } from 'vitest';
import { aStrategy, FakeStrategiesPort } from '../support/strategy-fakes.js';
import { actingWith } from './support/fake-acting.js';
import { rendered } from './support/render.js';

/**
 * A reason a bounce carried must survive whatever branch renders next.
 *
 * The defect these pin: a perform is refused, redirects back with
 * `?problem=`, and the page's *own* re-read then fails or refuses — so the
 * page renders its terminal branch and the carried reason, the only record of
 * what the click did, is dropped. Two refusals have to line up, which is why
 * it survived two sweeps of the dropped-redirect class.
 *
 * The rebind, deploy and undeploy branches are asserted at the source level in
 * `refusals-reach-the-operator.test.ts`; these render the strategy lifecycle
 * pages, where the branch is reachable through the fake port.
 */

let current: { app: unknown; user: unknown };

vi.mock('@/presentation/session.js', () => ({
  acting: async () => current,
  requestApp: async () => (current as { app: unknown }).app,
}));

const BERLIN = aStrategy({ id: 's-1', name: 'Berlin', scope: 'PRIVATE', revision: 2 });
const CARRIED = 'Nothing was attempted: your strategies could not be re-read.';

function world(readable: boolean) {
  const strategies = new FakeStrategiesPort([BERLIN]);
  strategies.readable = readable;
  const w = actingWith({ strategies });
  current = w;
  return w;
}

const params = () => Promise.resolve({ id: 's-1' });
const carried = () => Promise.resolve({ problem: CARRIED });

const pages = [
  {
    name: 'archive',
    load: async () => (await import('../../app/(app)/strategies/[id]/archive/page.js')).default,
  },
  {
    name: 'restore',
    load: async () => (await import('../../app/(app)/strategies/[id]/restore/page.js')).default,
  },
  {
    name: 'fork',
    load: async () => (await import('../../app/(app)/strategies/[id]/fork/page.js')).default,
  },
] as const;

beforeEach(() => {
  world(true);
});

for (const page of pages) {
  describe(`${page.name}: an unreadable re-read does not eat the carried reason`, () => {
    it('shows both the carried reason and why the page cannot load', async () => {
      world(false);
      const Page = await page.load();
      const r = await rendered(await Page({ params: params(), searchParams: carried() }));
      // The bounce's reason — what the operator's click actually did.
      expect(r.text).toContain(CARRIED);
      // And the page's own failure, not replaced by it.
      expect(r.text).toContain('BattleGrid did not respond');
    });
  });

  describe(`${page.name}: a strategy that is no longer listed keeps it too`, () => {
    it('shows the carried reason on the no-such-strategy branch', async () => {
      // Readable, but this id is not in the listing.
      world(true);
      const Page = await page.load();
      const r = await rendered(
        await Page({ params: Promise.resolve({ id: 'gone' }), searchParams: carried() }),
      );
      expect(r.text).toContain(CARRIED);
      expect(r.text).toContain('No such strategy');
    });
  });
}
