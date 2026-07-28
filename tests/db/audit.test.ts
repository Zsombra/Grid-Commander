import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { DrizzleAuditRepository } from '@/infrastructure/db/repositories/drizzle-audit-repository.js';
import type { NewAuditEntry } from '@/domain/audit/audit-repository.js';
import { harness, ids, TestClock } from './support.js';

const h = harness();

afterAll(() => h.close());
beforeEach(() => h.reset());

function repo(clock = new TestClock()) {
  return { clock, repo: new DrizzleAuditRepository(h.db, clock, ids('audit')) };
}

const attempt = (over: Partial<NewAuditEntry> = {}): NewAuditEntry => ({
  userId: 'u1',
  actor: 'user',
  tool: 'create_intelligence_agent',
  destructive: false,
  idempotencyKey: null,
  ...over,
});

describe('recording an operation', () => {
  /**
   * The entry is written before the attempt and completed after. An operation
   * that crashes mid-flight leaves `attempted`, which is the honest unknown —
   * not a failure, and certainly not a success.
   */
  it('begins as attempted', async () => {
    const { repo: r } = repo();
    await r.begin(attempt());
    const [entry] = await r.listForUser('u1', 10);
    expect(entry?.outcome).toBe('attempted');
    expect(entry?.completedAt).toBeNull();
  });

  it('completes with an outcome and a time', async () => {
    const { clock, repo: r } = repo();
    const id = await r.begin(attempt());
    clock.advance(1_500);
    await r.complete(id, 'succeeded');

    const [entry] = await r.listForUser('u1', 10);
    expect(entry?.outcome).toBe('succeeded');
    expect(entry?.completedAt?.toISOString()).toBe('2026-07-28T00:00:01.500Z');
  });

  it('records why a failure failed', async () => {
    const { repo: r } = repo();
    const id = await r.begin(attempt());
    await r.complete(id, 'failed', 'BattleGrid returned 503');

    const [entry] = await r.listForUser('u1', 10);
    expect(entry?.outcome).toBe('failed');
    expect(entry?.failureReason).toBe('BattleGrid returned 503');
  });

  it('carries a destructive flag through storage', async () => {
    const { repo: r } = repo();
    await r.begin(attempt({ tool: 'rebind_intelligence_agent', destructive: true }));
    expect((await r.listForUser('u1', 10))[0]?.destructive).toBe(true);
  });

  /** A-E: "I did this" and "the assistant did this while answering me" differ. */
  it('distinguishes the assistant from the user', async () => {
    const { repo: r } = repo();
    await r.begin(attempt({ actor: 'assistant', tool: 'list_intelligence_agents' }));
    expect((await r.listForUser('u1', 10))[0]?.actor).toBe('assistant');
  });

  it('reads an unrecognised stored outcome as attempted, never as success', async () => {
    const { repo: r } = repo();
    await r.begin(attempt());
    await h.pool.query(`update audit_entries set outcome = 'something-new'`);
    expect((await r.listForUser('u1', 10))[0]?.outcome).toBe('attempted');
  });
});

describe('reading the record back', () => {
  it('shows a user only their own entries', async () => {
    const { repo: r } = repo();
    await r.begin(attempt({ userId: 'u1', tool: 'mine' }));
    await r.begin(attempt({ userId: 'u2', tool: 'theirs' }));

    expect((await r.listForUser('u1', 10)).map((e) => e.tool)).toEqual(['mine']);
    expect((await r.listForUser('u2', 10)).map((e) => e.tool)).toEqual(['theirs']);
  });

  it('returns newest first', async () => {
    const { clock, repo: r } = repo();
    await r.begin(attempt({ tool: 'first' }));
    clock.advance(1_000);
    await r.begin(attempt({ tool: 'second' }));
    clock.advance(1_000);
    await r.begin(attempt({ tool: 'third' }));

    expect((await r.listForUser('u1', 10)).map((e) => e.tool)).toEqual([
      'third',
      'second',
      'first',
    ]);
  });

  it('honours the limit', async () => {
    const { clock, repo: r } = repo();
    for (let i = 0; i < 5; i++) {
      await r.begin(attempt({ tool: `t${i}` }));
      clock.advance(1_000);
    }
    expect(await r.listForUser('u1', 2)).toHaveLength(2);
  });
});

/**
 * The uniqueness the guard sequence rests on. It is a database constraint, so a
 * fake cannot establish it — the fake would only be agreeing with the code.
 */
describe('idempotency', () => {
  it('allows any number of entries that carry no key', async () => {
    const { repo: r } = repo();
    await r.begin(attempt({ idempotencyKey: null }));
    await r.begin(attempt({ idempotencyKey: null }));
    await r.begin(attempt({ idempotencyKey: null }));
    expect(await r.listForUser('u1', 10)).toHaveLength(3);
  });

  it('refuses a second entry with the same key for one user', async () => {
    const { repo: r } = repo();
    await r.begin(attempt({ idempotencyKey: 'k1' }));
    await expect(r.begin(attempt({ idempotencyKey: 'k1' }))).rejects.toThrow();
  });

  it('lets two different users use the same key', async () => {
    const { repo: r } = repo();
    await r.begin(attempt({ userId: 'u1', idempotencyKey: 'k1' }));
    await r.begin(attempt({ userId: 'u2', idempotencyKey: 'k1' }));
    expect(await r.findByIdempotencyKey('u1', 'k1')).not.toBeNull();
    expect(await r.findByIdempotencyKey('u2', 'k1')).not.toBeNull();
  });

  it('finds the earlier attempt so a retry can be recognised', async () => {
    const { repo: r } = repo();
    const id = await r.begin(attempt({ idempotencyKey: 'k1' }));
    const found = await r.findByIdempotencyKey('u1', 'k1');
    expect(found?.id).toBe(id);
    expect(found?.outcome).toBe('attempted');
  });

  it('does not find a key belonging to another user', async () => {
    const { repo: r } = repo();
    await r.begin(attempt({ userId: 'u2', idempotencyKey: 'k1' }));
    expect(await r.findByIdempotencyKey('u1', 'k1')).toBeNull();
  });

  it('two concurrent attempts with one key: exactly one is recorded', async () => {
    const { repo: r } = repo();
    const results = await Promise.allSettled([
      r.begin(attempt({ idempotencyKey: 'k1' })),
      r.begin(attempt({ idempotencyKey: 'k1' })),
    ]);
    expect(results.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    expect(await r.listForUser('u1', 10)).toHaveLength(1);
  });
});
