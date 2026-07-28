import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { DrizzleConnectionRepository } from '@/infrastructure/db/repositories/drizzle-connection-repository.js';
import type { NewConnection } from '@/domain/connection/connection-repository.js';
import { harness, ids } from './support.js';

const h = harness();
const repo = () => new DrizzleConnectionRepository(h.db, h.cipher, ids('conn'));

afterAll(() => h.close());
beforeEach(() => h.reset());

const grant = (over: Partial<NewConnection> = {}): NewConnection => ({
  userId: 'u1',
  battlegridSubject: 'sub-1',
  scopes: ['mcp:read'],
  accessToken: 'at-1',
  refreshToken: 'rt-1',
  accessTokenExpiresAt: new Date('2026-07-28T01:00:00Z'),
  ...over,
});

describe('storing a connection', () => {
  it('comes back as it went in', async () => {
    const r = repo();
    await r.upsert(grant());

    const found = await r.findByUserId('u1');
    expect(found?.battlegridSubject).toBe('sub-1');
    expect(found?.scopes).toEqual(['mcp:read']);
    expect(found?.status).toBe('active');
    expect(found?.accessTokenExpiresAt?.toISOString()).toBe('2026-07-28T01:00:00.000Z');
  });

  it('encrypts the tokens at rest and decrypts only on the way out', async () => {
    const r = repo();
    await r.upsert(grant());

    const { rows } = await h.pool.query<{ access_token_encrypted: string }>(
      'select access_token_encrypted from connections',
    );
    expect(rows[0]?.access_token_encrypted).not.toContain('at-1');
    expect(await r.read('u1')).toEqual({ accessToken: 'at-1', refreshToken: 'rt-1' });
  });

  it('finds the identity by BattleGrid subject', async () => {
    const r = repo();
    await r.upsert(grant());
    expect(await r.findUserIdBySubject('sub-1')).toBe('u1');
    expect(await r.findUserIdBySubject('sub-unknown')).toBeNull();
  });

  it('replaces the grant rather than accumulating connections', async () => {
    const r = repo();
    await r.upsert(grant());
    await r.upsert(grant({ accessToken: 'at-2', refreshToken: null }));

    const { rows } = await h.pool.query<{ n: number }>(
      'select count(*)::int as n from connections',
    );
    expect(rows[0]?.n).toBe(1);
    expect(await r.read('u1')).toEqual({ accessToken: 'at-2', refreshToken: null });
  });

  it('carries an absent expiry as absent, not as an instant', async () => {
    const r = repo();
    await r.upsert(grant({ accessTokenExpiresAt: null }));
    expect((await r.findByUserId('u1'))?.accessTokenExpiresAt).toBeNull();
  });
});

/** `text[]` — the column the backlog item expected to be wrong. */
describe('scopes', () => {
  it('round-trips several', async () => {
    const r = repo();
    await r.upsert(grant({ scopes: ['mcp:read', 'mcp:wager'] }));
    expect((await r.findByUserId('u1'))?.scopes).toEqual(['mcp:read', 'mcp:wager']);
  });

  it('round-trips none, without becoming null', async () => {
    const r = repo();
    await r.upsert(grant({ scopes: [] }));
    expect((await r.findByUserId('u1'))?.scopes).toEqual([]);
  });

  it('drops a stored scope the domain does not recognise', async () => {
    const r = repo();
    await r.upsert(grant());
    // A scope BattleGrid might start issuing. Widening the held set silently is
    // the one direction that must never happen.
    await h.pool.query(`update connections set scopes = '{mcp:read,mcp:invent}'`);
    expect((await r.findByUserId('u1'))?.scopes).toEqual(['mcp:read']);
  });
});

describe('revoking', () => {
  it('keeps the record and discards the authority', async () => {
    const r = repo();
    await r.upsert(grant());
    await r.markRevoked('u1');

    expect((await r.findByUserId('u1'))?.status).toBe('revoked');
    expect(await r.read('u1')).toBeNull();
  });

  it('does not hand refreshed tokens back to a revoked connection', async () => {
    const r = repo();
    await r.upsert(grant());
    await r.markRevoked('u1');

    await r.updateTokens('u1', {
      accessToken: 'at-new',
      refreshToken: 'rt-new',
      accessTokenExpiresAt: null,
    });

    // Restoring authority the user gave up is the failure this guards.
    expect(await r.read('u1')).toBeNull();
  });

  it('refreshes an active connection', async () => {
    const r = repo();
    await r.upsert(grant());
    await r.updateTokens('u1', {
      accessToken: 'at-new',
      refreshToken: 'rt-new',
      accessTokenExpiresAt: new Date('2026-07-28T02:00:00Z'),
    });
    expect(await r.read('u1')).toEqual({ accessToken: 'at-new', refreshToken: 'rt-new' });
  });
});

/**
 * One BattleGrid account, one identity — enforced by the unique index on
 * `battlegrid_subject`, which is why no test with a fake can establish it.
 */
describe('one subject, one identity', () => {
  it('a returning user keeps the identity they had', async () => {
    const r = repo();
    const first = await r.upsert(grant({ userId: 'u1' }));
    // What `CompleteConnectionCommand` does for a subject it has seen: it reads
    // the existing id and proposes that.
    const second = await r.upsert(grant({ userId: 'u1', accessToken: 'at-2' }));

    expect(second.userId).toBe(first.userId);
    const { rows } = await h.pool.query<{ n: number }>('select count(*)::int as n from users');
    expect(rows[0]?.n).toBe(1);
  });

  /**
   * The regression test for the defect this change was opened by. Two callbacks
   * for one brand-new subject both read `findUserIdBySubject` as null, both mint
   * a fresh id, and both write.
   *
   * Before the fix, the loser's user insert was swallowed by an untargeted
   * `onConflictDoNothing` and its connection insert then referenced a user that
   * was never created — surfacing
   * `violates foreign key constraint "connections_user_id_users_id_fk"` to
   * someone in the middle of connecting their account.
   */
  it('two first-time callbacks at once leave one identity, and both find it', async () => {
    const r = repo();
    const results = await Promise.allSettled([
      r.upsert(grant({ userId: 'user-a', accessToken: 'at-a' })),
      r.upsert(grant({ userId: 'user-b', accessToken: 'at-b' })),
    ]);

    const failures = results.filter((x) => x.status === 'rejected');
    expect(
      failures.map((f) => String((f as PromiseRejectedResult).reason)),
      'neither callback may surface a storage-level failure',
    ).toEqual([]);

    const resolved = results.map((x) => (x as PromiseFulfilledResult<{ userId: string }>).value);
    expect(resolved[0]?.userId, 'both callbacks resolve to one identity').toBe(
      resolved[1]?.userId,
    );

    const users = await h.pool.query<{ n: number }>('select count(*)::int as n from users');
    expect(users.rows[0]?.n).toBe(1);

    // And the identity they resolved to is the one that actually holds the row.
    const found = await r.findByUserId(resolved[0]?.userId as string);
    expect(found).not.toBeNull();
  });

  it('the surviving identity is the one a later lookup by subject returns', async () => {
    const r = repo();
    await Promise.allSettled([
      r.upsert(grant({ userId: 'user-a' })),
      r.upsert(grant({ userId: 'user-b' })),
    ]);
    const bySubject = await r.findUserIdBySubject('sub-1');
    expect(bySubject).not.toBeNull();
    expect(await r.read(bySubject as string)).not.toBeNull();
  });

  it('every connection references a user that exists', async () => {
    const r = repo();
    await Promise.allSettled([
      r.upsert(grant({ userId: 'user-a' })),
      r.upsert(grant({ userId: 'user-b' })),
    ]);
    const { rows } = await h.pool.query<{ n: number }>(
      'select count(*)::int as n from connections c left join users u on u.id = c.user_id where u.id is null',
    );
    expect(rows[0]?.n).toBe(0);
  });

  it('two different accounts get two identities', async () => {
    const r = repo();
    await r.upsert(grant({ userId: 'u1', battlegridSubject: 'sub-1' }));
    await r.upsert(grant({ userId: 'u2', battlegridSubject: 'sub-2' }));
    const { rows } = await h.pool.query<{ n: number }>('select count(*)::int as n from users');
    expect(rows[0]?.n).toBe(2);
  });
});
