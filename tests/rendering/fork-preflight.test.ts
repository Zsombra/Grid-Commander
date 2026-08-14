import { beforeEach, describe, expect, it, vi } from 'vitest';
import { aStrategy, FakeStrategiesPort } from '../support/strategy-fakes.js';
import { actingWith } from './support/fake-acting.js';

/**
 * The fork's name pre-flight, invoked — not read.
 *
 * BattleGrid answers a fork into a taken name with an unexplained
 * "Internal server error" (#102), and the operator has decided that defect
 * stays unreported. So the action refuses before sending, on the listing it
 * re-reads anyway — and these tests run the action to see both halves: that
 * a colliding name never reaches the port, and that a non-colliding one
 * still does. The property "nothing was sent" is the fake's call record,
 * not prose.
 */

let current: { app: unknown; user: unknown };

vi.mock('@/presentation/session.js', () => ({
  acting: async () => current,
  requestApp: async () => (current as { app: unknown }).app,
}));

const DUNKIRK = aStrategy({ id: 'sys-d', name: 'Dunkirk', scope: 'SYSTEM', revision: 3 });
const BERLIN = aStrategy({ id: 'sys-b', name: 'Berlin', scope: 'SYSTEM', revision: 2 });
const EARLIER_COPY = aStrategy({ id: 'own-1', name: 'Dunkirk (fork)', scope: 'PRIVATE' });
const ALESIA = aStrategy({ id: 'own-2', name: 'Alesia', scope: 'PRIVATE' });

let strategies: FakeStrategiesPort;

function world() {
  strategies = new FakeStrategiesPort([DUNKIRK, BERLIN, EARLIER_COPY, ALESIA]);
  current = actingWith({ strategies }) as typeof current;
}

beforeEach(() => {
  vi.resetModules();
  world();
});

/** Where a server action sent the caller, from the error `redirect()` throws. */
async function destinationOf(run: () => Promise<unknown>): Promise<URL> {
  try {
    await run();
  } catch (err) {
    const digest = (err as { digest?: string }).digest;
    if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) {
      return new URL(digest.split(';')[2] ?? '', 'http://gc.test');
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

const action = async () =>
  (await import('../../app/(app)/strategies/[id]/fork/page.js')).forkStrategy;

const forkCalls = () => strategies.calls.filter((c) => c.op === 'fork');

describe('a taken name is refused before it is sent', () => {
  it('refuses the blank-name arm when the default name is already owned', async () => {
    const forkStrategy = await action();
    const dest = await destinationOf(() =>
      forkStrategy(form({ strategyId: 'sys-d', sourceRevision: '3' })),
    );
    expect(forkCalls()).toHaveLength(0);
    expect(dest.pathname).toBe('/strategies/sys-d/fork');
    const problem = dest.searchParams.get('problem') ?? '';
    expect(problem).toContain('Nothing was attempted');
    expect(problem).toContain('"Dunkirk (fork)"');
    expect(problem).toContain('Type a name of your own');
  });

  it('refuses a chosen name that is already theirs, and keeps what was typed', async () => {
    const forkStrategy = await action();
    const dest = await destinationOf(() =>
      forkStrategy(form({ strategyId: 'sys-d', sourceRevision: '3', name: 'Alesia' })),
    );
    expect(forkCalls()).toHaveLength(0);
    const problem = dest.searchParams.get('problem') ?? '';
    expect(problem).toContain('"Alesia"');
    // The claim is a measured fact about the platform, stated before any
    // response exists — not a diagnosis of one.
    expect(problem).toContain('measured, not documented');
    expect(dest.searchParams.get('name')).toBe('Alesia');
  });

  it('does not pre-refuse a name that matches only a SYSTEM strategy', async () => {
    const forkStrategy = await action();
    const dest = await destinationOf(() =>
      forkStrategy(form({ strategyId: 'sys-d', sourceRevision: '3', name: 'Berlin' })),
    );
    expect(forkCalls()).toHaveLength(1);
    expect(dest.pathname).toBe('/strategies/sys-d-fork/edit');
  });

  it('leaves the platform backstop untouched when the pre-flight passes', async () => {
    strategies.forkRefusal = 'Internal server error';
    const forkStrategy = await action();
    const dest = await destinationOf(() =>
      forkStrategy(form({ strategyId: 'sys-d', sourceRevision: '3', name: 'Agincourt' })),
    );
    expect(forkCalls()).toHaveLength(1);
    expect(dest.searchParams.get('problem')).toBe('Internal server error');
    expect(dest.searchParams.get('name')).toBe('Agincourt');
  });
});
