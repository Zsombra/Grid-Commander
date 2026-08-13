import { Pool } from 'pg';
import { assertNoLiveGrant, databaseUrl } from './support.js';

/**
 * Asked once, before any test file runs.
 *
 * **The scoping is the whole correctness of this guard**, and two narrower
 * placements were tried and are wrong:
 *
 * - *Per `reset()`* re-asks a question the suite has already answered by
 *   emptying the table.
 * - *Per harness, or a module-level flag* — vitest isolates modules per file, so
 *   the flag resets for each one. Scoped that way the check fired on
 *   `connections.test.ts`'s own fixtures and refused 42 tests in the files that
 *   ran after it: the guard working perfectly against the wrong subject.
 *
 * The question is only ever whether the database held a live grant **before the
 * suite started**. Once it is running, every connection in there is its own
 * fixture, and `globalSetup` is the only place that means what the question
 * means.
 *
 * Refusing here aborts the run before a single table is touched, which is the
 * point: the row this protects holds the only copy of tokens whose
 * authorization survives it (#208).
 */
export async function setup(): Promise<void> {
  const pool = new Pool({ connectionString: databaseUrl() });
  try {
    await assertNoLiveGrant(pool);
  } finally {
    await pool.end();
  }
}
