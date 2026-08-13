import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { assertNoLiveGrant, harness } from './support.js';

/**
 * The truncating suite refuses a database holding live authority.
 *
 * `assertDisposable` asks whether the **database** is disposable and answers
 * correctly. Nothing asked whether the **data** was, and on 2026-08-13 this
 * suite twice truncated a database holding a live delegated connection. Both
 * times the grant survived at BattleGrid with its only tokens deleted, leaving
 * an authorization the product cannot revoke (#208).
 *
 * These drive the refusal rather than describing it. The second occurrence
 * happened ninety minutes after the hazard was written down, by the person who
 * wrote it — so a warning was demonstrably not the fix, and a guard nobody has
 * seen fail would be the same mistake a third time.
 *
 * Every test cleans up in a `finally`. A live connection left behind here would
 * refuse the *next* file's first `reset()`, which is the guard working and a
 * miserable way to find out.
 */

const h = harness();

/** Inserts a connection directly — not through a repository, which would need a user row. */
async function connectionWith(status: 'active' | 'revoked'): Promise<void> {
  await h.pool.query(`insert into users (id, battlegrid_subject) values ($1, $2)`, [
    'guard-user',
    'guard-subject',
  ]);
  await h.pool.query(
    `insert into connections
       (id, user_id, battlegrid_subject, access_token_encrypted, refresh_token_encrypted,
        access_token_expires_at, scopes, status, created_at)
     values (gen_random_uuid(), $1, $2, 'cipher', 'cipher', now() + interval '1 hour',
             $3, $4, now())`,
    ['guard-user', 'guard-subject', ['mcp:read'], status],
  );
}

afterEach(async () => {
  await h.pool.query('delete from connections');
  await h.pool.query('delete from users');
});

afterAll(async () => {
  await h.close();
});

describe('a truncating suite refuses a database holding live authority', () => {
  it('refuses an active connection, and truncates nothing', async () => {
    await connectionWith('active');

    await expect(assertNoLiveGrant(h.pool)).rejects.toThrow(/active BattleGrid connection/i);

    // The row is the point. A refusal that threw *after* truncating would be
    // the bug wearing a warning label.
    const { rows } = await h.pool.query<{ n: number }>(
      'select count(*)::int as n from connections',
    );
    expect(rows[0]?.n, 'the connection must survive the refusal').toBe(1);
  });

  it('says what is at stake and how to repair it', async () => {
    await connectionWith('active');

    // Not wording for its own sake: the operator's next action depends on
    // knowing the grant outlives the row, and on being given a way out that
    // does not require the app to be running.
    for (const phrase of [
      /only as ciphertext/i,
      /can no longer revoke/i,
      /disconnect through the product/i,
      /delete from connections/i,
    ]) {
      await expect(assertNoLiveGrant(h.pool)).rejects.toThrow(phrase);
    }
  });

  it('proceeds when there is no connection', async () => {
    await expect(assertNoLiveGrant(h.pool)).resolves.toBeUndefined();
  });

  it('proceeds when the only connection is revoked', async () => {
    // A revoked connection has no authority left to strand — the product
    // already relinquished it upstream.
    await connectionWith('revoked');
    await expect(assertNoLiveGrant(h.pool)).resolves.toBeUndefined();
  });

  it('is not overridden by DB_TESTS_MAY_TRUNCATE', async () => {
    /**
     * The two claims are independent, and conflating them is the bug. That flag
     * asserts the *database* may be truncated; this asserts something about
     * what is *in* it. An acknowledgement of one is not an acknowledgement of
     * the other.
     */
    const before = process.env['DB_TESTS_MAY_TRUNCATE'];
    process.env['DB_TESTS_MAY_TRUNCATE'] = 'yes';
    try {
      await connectionWith('active');
      await expect(assertNoLiveGrant(h.pool)).rejects.toThrow(/does not override/i);
    } finally {
      if (before === undefined) delete process.env['DB_TESTS_MAY_TRUNCATE'];
      else process.env['DB_TESTS_MAY_TRUNCATE'] = before;
    }
  });
});
