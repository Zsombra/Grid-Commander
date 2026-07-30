#!/usr/bin/env node
/**
 * Apply the committed migration journal.
 *
 * A separate operation from serving, deliberately. A platform's release step
 * runs this once; every replica then boots, finds the schema it recognises, and
 * serves. The alternative — each container migrating itself on start — has N
 * replicas racing on the same journal, and the winner is decided by scheduling.
 *
 * Uses **drizzle's own migrator**, not a runner written here. The journal, the
 * ordering, and the bookkeeping in `drizzle.__drizzle_migrations` are drizzle's
 * to define, and a second implementation of them would be a second opinion about
 * what "applied" means. `drizzle-kit` is a build dependency and is not in the
 * runtime image; `drizzle-orm/node-postgres/migrator` is the same logic without
 * the CLI.
 *
 *   node tools/migrate.mjs
 *
 * Safe to run against an up-to-date database: drizzle applies nothing.
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

const url = process.env['DATABASE_URL'];
if (!url) {
  console.error('DATABASE_URL is not set — nothing to migrate.');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: url });

try {
  await migrate(drizzle(pool), { migrationsFolder: 'drizzle/migrations' });
  console.log('migrations applied');
} catch (err) {
  // Named rather than swallowed: a half-applied migration is the one failure
  // here that needs a human, and the message is the only thing they get.
  console.error(`Migration failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
