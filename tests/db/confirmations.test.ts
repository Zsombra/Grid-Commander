import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { DrizzleConfirmationStore } from '@/infrastructure/db/repositories/drizzle-audit-repository.js';
import type { ConfirmationToken } from '@/domain/capability/confirmation.js';
import { harness, TestClock } from './support.js';

const h = harness();

afterAll(() => h.close());
beforeEach(() => h.reset());

const MINUTE = 60_000;
const REBIND = 'rebind_intelligence_agent';

function store(clock = new TestClock()) {
  return { clock, store: new DrizzleConfirmationStore(h.db, clock) };
}

const issued = (clock: TestClock, over: Partial<ConfirmationToken> = {}): ConfirmationToken => ({
  token: 'c1',
  userId: 'u1',
  tool: REBIND,
  target: 'agent-1',
  consequence: 'This replaces the entire configuration of Nightwatch.',
  expiresAt: new Date(clock.now().getTime() + 5 * MINUTE),
  consumedAt: null,
  ...over,
});

describe('a confirmation', () => {
  it('returns the wording the user was shown', async () => {
    const { clock, store: s } = store();
    await s.issue(issued(clock));
    const used = await s.consume('c1', 'u1', REBIND, 'agent-1');
    expect(used?.consequence).toBe('This replaces the entire configuration of Nightwatch.');
  });

  it('is unknown before it is issued', async () => {
    const { store: s } = store();
    expect(await s.consume('never-issued', 'u1', REBIND, 'agent-1')).toBeNull();
  });

  /**
   * The gate this test exists for. `consume` spends the token in the same
   * statement that checks it — every condition sits in the WHERE, because
   * `.returning()` hands back the row *after* the update, so a post-hoc
   * `consumedAt !== null` test could never fail and a spent token would replay.
   */
  it('cannot be spent twice', async () => {
    const { clock, store: s } = store();
    await s.issue(issued(clock));
    expect(await s.consume('c1', 'u1', REBIND, 'agent-1')).not.toBeNull();
    expect(await s.consume('c1', 'u1', REBIND, 'agent-1')).toBeNull();
  });

  it('records when it was spent', async () => {
    const { clock, store: s } = store();
    await s.issue(issued(clock));
    clock.advance(30_000);
    const used = await s.consume('c1', 'u1', REBIND, 'agent-1');
    expect(used?.consumedAt?.toISOString()).toBe('2026-07-28T00:00:30.000Z');
  });

  /**
   * Two requests presenting one token at the same instant. This is the case a
   * fake cannot show: the guarantee belongs to the single conditional UPDATE,
   * and an in-memory store would have to reimplement it to be checked.
   */
  it('two concurrent requests presenting it: exactly one succeeds', async () => {
    const { clock, store: s } = store();
    await s.issue(issued(clock));
    const [a, b] = await Promise.all([
      s.consume('c1', 'u1', REBIND, 'agent-1'),
      s.consume('c1', 'u1', REBIND, 'agent-1'),
    ]);
    expect([a, b].filter((r) => r !== null)).toHaveLength(1);
  });
});

/** A confirmation authorises one act on one thing. It is not a permission slip. */
describe('what a confirmation is bound to', () => {
  it('refuses a different target', async () => {
    const { clock, store: s } = store();
    await s.issue(issued(clock, { target: 'agent-1' }));
    expect(await s.consume('c1', 'u1', REBIND, 'agent-2')).toBeNull();
  });

  it('refuses a different tool', async () => {
    const { clock, store: s } = store();
    await s.issue(issued(clock, { tool: REBIND }));
    expect(await s.consume('c1', 'u1', 'archive_intelligence_agent', 'agent-1')).toBeNull();
  });

  it('refuses another user, even with the right token', async () => {
    const { clock, store: s } = store();
    await s.issue(issued(clock, { userId: 'u1' }));
    expect(await s.consume('c1', 'u2', REBIND, 'agent-1')).toBeNull();
  });

  it('leaves the token spendable after a mismatched attempt', async () => {
    const { clock, store: s } = store();
    await s.issue(issued(clock));
    await s.consume('c1', 'u1', REBIND, 'agent-2');
    expect(await s.consume('c1', 'u1', REBIND, 'agent-1')).not.toBeNull();
  });
});

describe('expiry', () => {
  it('refuses one presented after its window', async () => {
    const { clock, store: s } = store();
    await s.issue(issued(clock));
    clock.advance(6 * MINUTE);
    expect(await s.consume('c1', 'u1', REBIND, 'agent-1')).toBeNull();
  });

  it('accepts one presented inside it', async () => {
    const { clock, store: s } = store();
    await s.issue(issued(clock));
    clock.advance(4 * MINUTE);
    expect(await s.consume('c1', 'u1', REBIND, 'agent-1')).not.toBeNull();
  });

  it('does not spend a token it refused for expiry', async () => {
    const { clock, store: s } = store();
    await s.issue(issued(clock));
    clock.advance(6 * MINUTE);
    await s.consume('c1', 'u1', REBIND, 'agent-1');
    const { rows } = await h.pool.query<{ consumed_at: Date | null }>(
      'select consumed_at from confirmation_tokens',
    );
    expect(rows[0]?.consumed_at).toBeNull();
  });
});
