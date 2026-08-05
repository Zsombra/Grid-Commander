import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { DrizzleProposalStore } from '@/infrastructure/db/repositories/drizzle-proposal-store.js';
import { proposals as table } from '@/infrastructure/db/schema/index.js';
import { harness } from './support.js';

/**
 * Proposals, against a real PostgreSQL.
 *
 * A fake could only ever agree with the code. The two things this table is for
 * — that it holds nothing spendable, and that one account's proposals are
 * invisible to another — are guarantees the database enforces, so they are
 * checked where the database is.
 */

const h = harness();
afterAll(() => h.close());
beforeEach(async () => {
  await h.reset();
  // Proposals reference users; the FK is part of what is being asserted.
  await h.db.execute(
    "insert into users (id, battlegrid_subject) values ('u1', 's1'), ('u2', 's2')" as never,
  );
});

const RECORDED = new Date('2026-08-05T09:00:00Z');

function store() {
  return new DrizzleProposalStore(h.db);
}

const intent = (over: Partial<Parameters<DrizzleProposalStore['record']>[0]> = {}) => ({
  id: 'p1',
  userId: 'u1',
  operation: 'edit' as const,
  target: 'agent-1',
  proposedValues: { tradingMode: 'OFF' },
  recordedAt: RECORDED,
  ...over,
});

describe('the proposal store holds nothing that can be spent', () => {
  it('has no column for a confirmation token or an access token', () => {
    /**
     * The `battlegrid-connection` requirement, expressed as schema.
     *
     * Read off the table definition rather than asserted in prose, so a
     * migration adding one fails here instead of shipping. The stated
     * property is that an attacker who reads every row can change nothing —
     * which is only true while there is nothing here to present.
     */
    const columns = Object.keys(table);
    expect(columns).not.toContain('confirmationToken');
    expect(columns).not.toContain('token');
    expect(columns).not.toContain('accessToken');
    expect(columns).not.toContain('accessTokenEncrypted');
    // And the guard's own guard: if the table were renamed to nothing, the
    // absences above would pass vacuously.
    expect(columns).toContain('operation');
    expect(columns).toContain('proposedValues');
  });

  it('stores what was proposed, verbatim', async () => {
    const s = store();
    await s.record(intent({ proposedValues: { tradingMode: 'OFF', note: 'burning money' } }));
    const back = await s.get({ userId: 'u1', id: 'p1' });
    // Verbatim, because `/pending/[id]` shows this beside what the fresh
    // describe says will happen. Normalising here would be reconciling the two
    // on the operator's behalf.
    expect(back?.proposedValues).toEqual({ tradingMode: 'OFF', note: 'burning money' });
    expect(back?.recordedAt.toISOString()).toBe(RECORDED.toISOString());
    expect(back?.status).toBe('open');
  });
});

describe('a proposal belongs to exactly one account', () => {
  it('is invisible to another account', async () => {
    const s = store();
    await s.record(intent());
    expect(await s.list('u2')).toEqual([]);
    expect(await s.get({ userId: 'u2', id: 'p1' })).toBeNull();
  });

  it('cannot be resolved by another account', async () => {
    const s = store();
    await s.record(intent());
    expect(await s.resolve({ userId: 'u2', id: 'p1', status: 'agreed' })).toBe(false);
    expect((await s.get({ userId: 'u1', id: 'p1' }))?.status).toBe('open');
  });

  it('refuses a user the database does not know', async () => {
    // The foreign key, not a check in code. A proposal for a non-existent
    // account is a row nobody could ever open.
    await expect(store().record(intent({ id: 'p2', userId: 'ghost' }))).rejects.toThrow();
  });
});

describe('resolving happens once', () => {
  it('moves an open proposal and reports it', async () => {
    const s = store();
    await s.record(intent());
    expect(await s.resolve({ userId: 'u1', id: 'p1', status: 'agreed' })).toBe(true);
    const back = await s.get({ userId: 'u1', id: 'p1' });
    expect(back?.status).toBe('agreed');
    expect(back?.resolvedAt).not.toBeNull();
  });

  it('refuses a second resolve, so a double submit cannot report success twice', async () => {
    const s = store();
    await s.record(intent());
    await s.resolve({ userId: 'u1', id: 'p1', status: 'agreed' });
    expect(await s.resolve({ userId: 'u1', id: 'p1', status: 'declined' })).toBe(false);
    // And the first answer stands rather than being overwritten.
    expect((await s.get({ userId: 'u1', id: 'p1' }))?.status).toBe('agreed');
  });

  it('declining is as final as agreeing', async () => {
    const s = store();
    await s.record(intent());
    expect(await s.resolve({ userId: 'u1', id: 'p1', status: 'declined' })).toBe(true);
    expect(await s.resolve({ userId: 'u1', id: 'p1', status: 'agreed' })).toBe(false);
  });
});

describe('reading the queue', () => {
  it('returns newest first', async () => {
    const s = store();
    await s.record(intent({ id: 'old', recordedAt: new Date('2026-08-01T09:00:00Z') }));
    await s.record(intent({ id: 'new', recordedAt: new Date('2026-08-05T09:00:00Z') }));
    expect((await s.list('u1')).map((p) => p.id)).toEqual(['new', 'old']);
  });

  it('drops a row naming an operation this product does not offer', async () => {
    // A stored operation that no longer resolves to a describe cannot be acted
    // on, and rendering it would offer a button that cannot work. Written
    // through raw SQL because the store's own types make it unreachable.
    await h.db.execute(
      `insert into proposals (id, user_id, operation, target, proposed_values, recorded_at, status)
       values ('gone', 'u1', 'applyPlan', 't', '{}', now(), 'open')` as never,
    );
    expect(await store().list('u1')).toEqual([]);
  });

  it('survives values that are not readable JSON', async () => {
    await h.db.execute(
      `insert into proposals (id, user_id, operation, target, proposed_values, recorded_at, status)
       values ('bad', 'u1', 'edit', 't', 'not json', now(), 'open')` as never,
    );
    const [back] = await store().list('u1');
    // The proposal is still listed — losing the whole queue over one unreadable
    // field would hide the others.
    expect(back?.id).toBe('bad');
    expect(back?.proposedValues).toEqual({});
  });
});
