import { beforeEach, describe, expect, it, vi } from 'vitest';
import { aStrategy, FakeStrategiesPort } from '../support/strategy-fakes.js';
import { actingWith } from './support/fake-acting.js';

/**
 * The three lifecycle actions, invoked — not read.
 *
 * `refusals-reach-the-operator.test.ts` asserts these actions' *shape* from
 * source, which is this repository's established way of checking a server
 * action. It cannot tell a redirect that names the ceremony page from one that
 * names the roster, and the defect here was exactly that: a failed pre-perform
 * re-read landed the operator on `/strategies` with no word, so a click that
 * did nothing looked like one that worked.
 *
 * So these run the action. `redirect()` signals by throwing, and the thrown
 * error carries the destination in its digest — which is what lets an
 * invocation test read where the action decided to send someone.
 */

let current: { app: unknown; user: unknown };

vi.mock('@/presentation/session.js', () => ({
  acting: async () => current,
  requestApp: async () => (current as { app: unknown }).app,
}));

const BERLIN = aStrategy({ id: 's-1', name: 'Berlin', scope: 'PRIVATE', revision: 2 });

function world(readable: boolean) {
  const strategies = new FakeStrategiesPort([BERLIN]);
  strategies.readable = readable;
  current = actingWith({ strategies });
}

/** Where a server action sent the caller, from the error `redirect()` throws. */
async function destinationOf(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
  } catch (err) {
    const digest = (err as { digest?: string }).digest;
    if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) {
      // `NEXT_REDIRECT;push;/url;307;`
      return digest.split(';')[2] ?? '';
    }
    throw err;
  }
  throw new Error('expected the action to redirect');
}

const form = (fields: Record<string, string>): FormData => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
};

const actions = [
  {
    name: 'archive',
    load: async () => (await import('../../app/(app)/strategies/[id]/archive/page.js')).archiveStrategy,
    fields: { strategyId: 's-1', confirmationToken: 't' },
    page: '/strategies/s-1/archive',
  },
  {
    name: 'restore',
    load: async () => (await import('../../app/(app)/strategies/[id]/restore/page.js')).restoreStrategy,
    fields: { strategyId: 's-1' },
    page: '/strategies/s-1/restore',
  },
  {
    name: 'fork',
    load: async () => (await import('../../app/(app)/strategies/[id]/fork/page.js')).forkStrategy,
    fields: { strategyId: 's-1' },
    page: '/strategies/s-1/fork',
  },
] as const;

for (const action of actions) {
  describe(`${action.name}: an attempt that could not be made says so`, () => {
    beforeEach(() => {
      world(true);
    });

    it('returns to the ceremony page with a reason when the re-read fails', async () => {
      world(false);
      const run = await action.load();
      const to = await destinationOf(() => run(form(action.fields)));

      expect(to.startsWith(action.page), `sent to ${to}`).toBe(true);
      const problem = decodeURIComponent(new URL(to, 'http://x').searchParams.get('problem') ?? '');
      expect(problem).toContain('Nothing was attempted');
      // The platform's own words for the failure, not a rewording.
      expect(problem).toContain('BattleGrid did not respond');
    });

    it('returns to the ceremony page with a reason when the strategy is gone', async () => {
      const run = await action.load();
      const to = await destinationOf(() => run(form({ ...action.fields, strategyId: 'gone' })));

      expect(to.startsWith('/strategies/gone/'), `sent to ${to}`).toBe(true);
      const problem = decodeURIComponent(new URL(to, 'http://x').searchParams.get('problem') ?? '');
      expect(problem).toContain('Nothing was attempted');
      expect(problem).toContain('no longer in your list');
    });

    it('does not land the operator on the roster with nothing said', async () => {
      world(false);
      const run = await action.load();
      const to = await destinationOf(() => run(form(action.fields)));
      // The defect, named: `/strategies` exactly, carrying no reason.
      expect(to).not.toBe('/strategies');
    });
  });
}
