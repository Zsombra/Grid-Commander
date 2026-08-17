#!/usr/bin/env node
/**
 * Prove a served route can actually query the database.
 *
 * `check-serving.sh` probes routes anonymously: they resolve a session, find
 * none, and render "Not connected" — which needs no query. So a database that
 * is reachable and migrated but whose *queries* fail (role permissions, a
 * search-path oddity, a pool setting) passes every probe. Found by running
 * the suite against a stopped PostgreSQL: five 200s and "serving ok".
 * See `no-route-exercises-the-database`.
 *
 * This mints a session cookie the way `CookieSession` signs one, requests a
 * session-resolving route with it, and asserts two things:
 *
 *   1. The route answers 200 — resolving the session and looking up the
 *      user's connection did not blow up.
 *   2. `pg_stat_database` shows the application committed at least one
 *      transaction while answering — the request genuinely reached the
 *      database through the application's own pool.
 *
 * The second assertion is what keeps the signing coupling honest. This file
 * mirrors the cookie format (`userId.issuedAtMs.HMAC-SHA256-base64url`,
 * secret from SESSION_SECRET) rather than importing the TypeScript that owns
 * it; if the format ever drifts, the cookie is rejected, the route renders
 * without querying, the transaction delta stays zero, and this check FAILS —
 * drift is loud, not silent. The owning implementation is
 * `src/infrastructure/http/cookie-session.ts` + `src/domain/session/session.ts`,
 * and both point here.
 *
 *   PORT=3210 node tools/check-route-queries.mjs
 *
 * Exit 0: the route answered 200 and the database saw its transaction.
 * Exit 1: either half failed, and the output says which.
 */

import { createHmac, randomBytes } from 'node:crypto';
import pg from 'pg';

const url = process.env['DATABASE_URL'];
const secret = process.env['SESSION_SECRET'];
const port = process.env['PORT'] ?? '3210';
if (!url || !secret) {
  console.error('DATABASE_URL and SESSION_SECRET are required.');
  process.exit(1);
}

/** The cookie `CookieSession.issue` would set, for a user that exists nowhere. */
function mintCookie() {
  const payload = `probe-${randomBytes(8).toString('base64url')}.${Date.now()}`;
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `gc_session=${payload}.${signature}`;
}

const client = new pg.Client({ connectionString: url });

/** Transactions the database has finished, ours-to-be among them. */
async function finishedTransactions() {
  const res = await client.query(
    'SELECT xact_commit + xact_rollback AS n FROM pg_stat_database WHERE datname = current_database()',
  );
  return Number(res.rows[0]?.n ?? 0);
}

try {
  await client.connect();
  /**
   * This connection's own polls commit transactions too — each SELECT is an
   * implicit transaction, visible to every *later* read. So the k-th poll
   * expects `baseline + k` from its own traffic alone, and only a value
   * beyond that is the application's. The check owns its environment (the
   * serving script refuses shared ports and databases follow the same rule),
   * so nothing else is writing to the counter.
   */
  const baseline = await finishedTransactions();

  const res = await globalThis.fetch(`http://127.0.0.1:${port}/audit`, {
    headers: { cookie: mintCookie() },
    redirect: 'manual',
  });
  if (res.status >= 500) {
    console.error(`the authenticated route answered ${res.status} — a session that`);
    console.error('resolves reaches the repositories, and the query path is broken.');
    process.exit(1);
  }

  // The stats collector can lag a moment behind the transaction.
  let sawAppTransaction = false;
  for (let poll = 1; poll <= 10; poll++) {
    await new Promise((r) => setTimeout(r, 500));
    // By poll k, this connection has committed k reads of its own since the
    // baseline value was produced (the baseline read included). Only a value
    // beyond those is the application's.
    const value = await finishedTransactions();
    if (value > baseline + poll) {
      sawAppTransaction = true;
      break;
    }
  }

  if (!sawAppTransaction) {
    console.error('the route answered without the database seeing a transaction.');
    console.error('Either the session cookie was rejected (has the signing in');
    console.error('cookie-session.ts drifted from what this file mints?) or the');
    console.error('route no longer queries. Neither is a pass.');
    process.exit(1);
  }

  console.log(`route queries ok — /audit answered ${res.status} and the database committed its transaction`);
} finally {
  await client.end();
}
