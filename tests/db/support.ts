import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type { Cipher } from '@/infrastructure/crypto/envelope.js';
import { createCipher } from '@/infrastructure/crypto/envelope.js';
import type { Clock } from '@/ports/clock.js';

/**
 * What the database suite needs, and what it refuses to run without.
 *
 * The refusal is the point. A suite that skips when `DATABASE_URL` is absent
 * reports the same green as a suite that ran, and every guarantee it covers —
 * single-use confirmations, single-use OAuth state, the uniqueness the identity
 * rests on — silently stops being checked. So this throws, loudly, naming what
 * to set.
 */
export function databaseUrl(): string {
  const url = process.env['DATABASE_URL'];
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. The database suite requires a real PostgreSQL and ' +
        'does not skip without one — a skipped run would be indistinguishable from a ' +
        'passing one. Start a database and set DATABASE_URL, or run `npm test` for ' +
        'the suite that needs none.',
    );
  }
  assertDisposable(url);
  return url;
}

/**
 * This suite TRUNCATES. It must not do that to a database somebody is using.
 *
 * `databaseUrl()` used to refuse only a *missing* URL and accept any present
 * one — including the app's own, which is exactly what `.env` sets and what a
 * developer running the app already has exported. On 2026-08-13 that happened:
 * the suite was pointed at a live `grid_commander` and truncated a recorder
 * record that BattleGrid cannot re-serve, because it serves current readings
 * only. The tests all passed. Nothing warned.
 *
 * So a truncating suite now requires the database to be named as disposable,
 * and the check is opt-*in* rather than opt-out: an unrecognised value refuses,
 * a typo refuses, and silence refuses. The failure mode of getting this wrong
 * is unrecoverable data, so it fails toward doing nothing.
 *
 * Two ways to say it, both explicit:
 *   - name the database so it says so — anything matching /test|scratch|throwaway/
 *   - or set DB_TESTS_MAY_TRUNCATE=yes, exactly, for a database named otherwise
 */
const DISPOSABLE_NAME = /(^|[_-])(test|tests|scratch|throwaway)([_-]|$)/i;

export function assertDisposable(url: string): void {
  if (process.env['DB_TESTS_MAY_TRUNCATE'] === 'yes') return;

  let name = '';
  try {
    name = new URL(url).pathname.replace(/^\//, '');
  } catch {
    // Not a parseable URL. Let the driver produce its own error rather than
    // guessing — but do not let an unparseable string count as permission.
  }
  if (name && DISPOSABLE_NAME.test(name)) return;

  throw new Error(
    [
      `Refusing to run the database suite against "${name || url}".`,
      'This suite TRUNCATES every table it touches, including the signal record — ' +
        'which BattleGrid cannot re-serve, because it serves current readings only.',
      'Point DATABASE_URL at a disposable database (a name containing "test", ' +
        '"scratch" or "throwaway"), or set DB_TESTS_MAY_TRUNCATE=yes if you are ' +
        'certain this one is disposable.',
      'This guard exists because the suite was once pointed at a live database and ' +
        'destroyed a record that could not be rebuilt. Every test passed.',
    ].join('\n\n'),
  );
}

/**
 * A live grant is not disposable data.
 *
 * `assertDisposable` asks whether the **database** is disposable and answers
 * correctly. Nothing asked whether the **data** was, and on 2026-08-13 this
 * suite twice truncated a database holding a live delegated connection. Both
 * times the authorization at BattleGrid survived: the access and refresh tokens
 * exist only as ciphertext *in the row*, so deleting it leaves a grant nobody
 * can enumerate and the product cannot revoke. That is exactly what
 * `DisconnectCommand` refuses to do — relinquishing locally is not
 * relinquishing — arriving through a door it does not watch (#208).
 *
 * **`DB_TESTS_MAY_TRUNCATE` deliberately does not override this.** That flag
 * says the database may be truncated; this is a claim about what is in it, and
 * treating one as the other is the confusion that produced the bug. Nobody is
 * stuck: the message names both remedies.
 *
 * It reads the **data**, not the connection string, because that is where the
 * fact lives — and a connection can arrive after `DATABASE_URL` is set, which is
 * how it happened both times.
 *
 * Called from `tests/db/global-setup.ts`, once, before any file runs. Not from
 * `reset()`: after the first truncate every connection in the database is the
 * suite's own fixture, and asking again interrogates them instead.
 */
export async function assertNoLiveGrant(pool: Pool): Promise<void> {
  let active = 0;
  try {
    const { rows } = await pool.query<{ n: number }>(
      "select count(*)::int as n from connections where status = 'active'",
    );
    active = rows[0]?.n ?? 0;
  } catch (err) {
    // A database that predates the schema holds nothing, so there is nothing to
    // strand. Any *other* failure is refused: a table we could not read is not
    // a table we know is empty, and this guard fails toward doing nothing.
    if ((err as { code?: string }).code === '42P01') return;
    throw err;
  }
  if (active === 0) return;

  throw new Error(
    [
      `Refusing to truncate: this database holds ${active} active BattleGrid connection(s).`,
      'The access and refresh tokens exist only as ciphertext in those rows. ' +
        'Truncating deletes the only copy while the authorization stays live at ' +
        'BattleGrid — leaving a grant this product can no longer revoke.',
      'Disconnect through the product first (/connect → disconnect), which ' +
        'relinquishes the authority upstream before the row goes.',
      'If the app is not running, revoke at BattleGrid and then clear the row: ' +
        `delete from connections;`,
      'DB_TESTS_MAY_TRUNCATE does not override this. It says the database is ' +
        'disposable; a live credential in it is a different claim.',
    ].join('\n\n'),
  );
}

/** Every table the repositories touch. Truncated between tests, in one statement. */
const TABLES = [
  'audit_entries',
  'confirmation_tokens',
  'connections',
  'oauth_transactions',
  'proposals',
  'signal_readings',
  'signal_captures',
  'signal_capture_runs',
  'users',
] as const;

export interface Harness {
  readonly db: NodePgDatabase<Record<string, never>>;
  readonly pool: Pool;
  readonly cipher: Cipher;
  reset(): Promise<void>;
  close(): Promise<void>;
}

export function harness(): Harness {
  const pool = new Pool({ connectionString: databaseUrl() });
  return {
    pool,
    db: drizzle(pool),
    // A fixed key. These tests assert that what went in comes back out, not
    // that the key is secret.
    cipher: createCipher(Buffer.alloc(32, 7).toString('base64')),
    async reset() {
      // No live-grant check here: `tests/db/global-setup.ts` asks once, before
      // any file runs. Asking again would interrogate the suite's own fixtures.
      await pool.query(`truncate ${TABLES.join(', ')} cascade`);
    },
    async close() {
      await pool.end();
    },
  };
}

/**
 * A clock the test moves by hand.
 *
 * Expiry and single-use rules are the behaviours under test here, and both are
 * defined in terms of "now". Waiting for real time would make the suite slow and
 * flaky in the same stroke.
 */
export class TestClock implements Clock {
  constructor(private current = new Date('2026-07-28T00:00:00.000Z')) {}
  now(): Date {
    return this.current;
  }
  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}

/** Ids that read as what they are when a test fails. */
export function ids(prefix: string): () => string {
  let n = 0;
  return () => `${prefix}-${++n}`;
}
