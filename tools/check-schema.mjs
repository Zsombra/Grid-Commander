#!/usr/bin/env node
/**
 * Refuse to serve against a schema this version does not recognise.
 *
 * The application already refuses to start without the configuration it was
 * given. This is the same idea applied to the database it was pointed at, and it
 * exists because the alternative failure is quiet: a deployment whose migration
 * was skipped looks exactly like one whose migration ran, right up until a user
 * touches the feature that needed the new column. By then it reads as a defect
 * in the product rather than a missing step in the deploy.
 *
 * So a missed migration becomes a **failed start**, which a platform reports,
 * instead of a broken request an hour later, which nobody does.
 *
 * Uses `pg` directly and nothing else. It runs in the runtime image, before the
 * server, and must not need the build toolchain that image deliberately omits.
 *
 *   node tools/check-schema.mjs
 *
 * Exit 0: the database has everything this version carries.
 * Exit 1: it does not, and the missing migrations are named.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';

const JOURNAL = join('drizzle', 'migrations', 'meta', '_journal.json');

const url = process.env['DATABASE_URL'];
if (!url) {
  console.error('DATABASE_URL is not set — cannot check the schema.');
  process.exit(1);
}

/** What this build of the product carries, from the committed journal. */
let expected;
try {
  expected = JSON.parse(readFileSync(JOURNAL, 'utf8')).entries ?? [];
} catch (err) {
  console.error(`Could not read ${JOURNAL}: ${err.message}`);
  process.exit(1);
}

if (expected.length === 0) {
  // Not a pass. A build carrying no migrations at all means the journal did not
  // reach the image, and every comparison below would agree with an empty
  // database — the exact shape of a check that passes by measuring nothing.
  console.error(`${JOURNAL} lists no migrations. The image was built wrong.`);
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });

try {
  await client.connect();
} catch (err) {
  console.error(`Could not reach the database: ${err.message}`);
  process.exit(1);
}

/**
 * What the database has applied.
 *
 * Drizzle records one row per migration with `created_at` set to the journal
 * entry's `when`, which is what makes this comparison possible without hashing
 * anything. A missing table is not an error here — it is a database that has
 * never been migrated, which the report below states plainly.
 */
let applied = [];
try {
  const result = await client.query(
    'select created_at from drizzle.__drizzle_migrations order by created_at',
  );
  applied = result.rows.map((row) => String(row.created_at));
} catch {
  applied = [];
}

await client.end();

const have = new Set(applied);
const missing = expected.filter((entry) => !have.has(String(entry.when)));
const expectedWhen = new Set(expected.map((entry) => String(entry.when)));
const ahead = applied.filter((when) => !expectedWhen.has(when));

if (missing.length > 0) {
  console.error(
    applied.length === 0
      ? 'This database has never been migrated.'
      : `This database is behind by ${missing.length} migration(s).`,
  );
  console.error('');
  for (const entry of missing) console.error(`  missing: ${entry.tag}`);
  console.error('');
  console.error('Refusing to serve. Apply them first:');
  console.error('');
  console.error('  docker run --rm -e DATABASE_URL=... <image> migrate');
  console.error('');
  process.exit(1);
}

if (ahead.length > 0) {
  // Not a refusal: an older version against a newer schema usually still works,
  // and refusing would turn a rollback into an outage. It is always worth
  // saying, because it means a deploy went backwards.
  console.warn(
    `Note: the database carries ${ahead.length} migration(s) this build does not know about.`,
  );
  console.warn('An older version is running against a newer schema.');
}

console.log(`schema ok — ${expected.length} migration(s) applied`);
