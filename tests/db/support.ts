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
  return url;
}

/** Every table the repositories touch. Truncated between tests, in one statement. */
const TABLES = [
  'audit_entries',
  'confirmation_tokens',
  'connections',
  'oauth_transactions',
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
