import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { DrizzleTransactionStore } from '@/infrastructure/db/repositories/drizzle-connection-repository.js';
import { harness, TestClock } from './support.js';

const h = harness();

afterAll(() => h.close());
beforeEach(() => h.reset());

const MINUTE = 60_000;

function store() {
  const clock = new TestClock();
  return { clock, store: new DrizzleTransactionStore(h.db, clock) };
}

const pending = (clock: TestClock, state: string, livesFor = 10 * MINUTE) => ({
  state,
  codeVerifier: `verifier-for-${state}`,
  createdAt: clock.now(),
  expiresAt: new Date(clock.now().getTime() + livesFor),
});

describe('a pending authorization', () => {
  it('returns the verifier it was created with', async () => {
    const { clock, store: s } = store();
    await s.create(pending(clock, 's1'));
    expect((await s.consume('s1'))?.codeVerifier).toBe('verifier-for-s1');
  });

  it('is unknown before it is created', async () => {
    const { store: s } = store();
    expect(await s.consume('never-issued')).toBeNull();
  });

  /**
   * Single-use is enforced by the delete, not by a flag. A replayed callback
   * finds nothing — which is what makes the authorization code impossible to
   * redeem twice even if the browser sends it twice.
   */
  it('cannot be consumed a second time', async () => {
    const { clock, store: s } = store();
    await s.create(pending(clock, 's1'));
    expect(await s.consume('s1')).not.toBeNull();
    expect(await s.consume('s1')).toBeNull();
  });

  it('leaves no row behind once consumed', async () => {
    const { clock, store: s } = store();
    await s.create(pending(clock, 's1'));
    await s.consume('s1');
    const { rows } = await h.pool.query<{ n: number }>(
      'select count(*)::int as n from oauth_transactions',
    );
    expect(rows[0]?.n).toBe(0);
  });

  it('two concurrent callbacks for one state: exactly one gets the verifier', async () => {
    const { clock, store: s } = store();
    await s.create(pending(clock, 's1'));
    const [a, b] = await Promise.all([s.consume('s1'), s.consume('s1')]);
    expect([a, b].filter((r) => r !== null)).toHaveLength(1);
  });
});

describe('expiry', () => {
  it('refuses a state that has outlived its window', async () => {
    const { clock, store: s } = store();
    await s.create(pending(clock, 's1', 5 * MINUTE));
    clock.advance(6 * MINUTE);
    expect(await s.consume('s1')).toBeNull();
  });

  it('accepts one that has not', async () => {
    const { clock, store: s } = store();
    await s.create(pending(clock, 's1', 5 * MINUTE));
    clock.advance(4 * MINUTE);
    expect(await s.consume('s1')).not.toBeNull();
  });

  /**
   * There is no background job. An unswept table of dead states is a slow leak,
   * so every consume clears what has expired on its way past — including when
   * the state it was asked for does not exist.
   */
  it('sweeps expired rows even when the lookup finds nothing', async () => {
    const { clock, store: s } = store();
    await s.create(pending(clock, 'old-1', MINUTE));
    await s.create(pending(clock, 'old-2', MINUTE));
    await s.create(pending(clock, 'still-good', 60 * MINUTE));

    clock.advance(10 * MINUTE);
    await s.consume('some-state-that-does-not-exist');

    const { rows } = await h.pool.query<{ state: string }>('select state from oauth_transactions');
    expect(rows.map((r) => r.state)).toEqual(['still-good']);
  });
});
