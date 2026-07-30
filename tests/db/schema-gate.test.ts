import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { databaseUrl } from './support.js';

/**
 * The gate that decides whether a deployment serves.
 *
 * `tools/check-schema.mjs` runs before the server in the container, and a
 * deployment missing a migration exits rather than starting. That makes it one
 * of the few things in this product whose failure mode is a **refused deploy**,
 * and the only way to know it still works is to point it at a real database in
 * each of the states it distinguishes.
 *
 * It cannot be faked here. The whole claim is about what PostgreSQL reports for
 * `drizzle.__drizzle_migrations`, and a stub would only ever agree with the code
 * that reads it — the same reason the rest of this suite exists.
 */

const JOURNAL = 'drizzle/migrations/meta/_journal.json';

/**
 * Run the gate against a database, returning its exit code and *both* streams.
 *
 * `spawnSync` rather than `execFileSync` because the latter returns stdout only,
 * and the ahead-of-this-build warning goes to stderr — where a deploy log wants
 * it. The first version of this helper dropped that stream and reported the
 * warning missing when it had been printed.
 */
function gate(url: string): { code: number; out: string } {
  const result = spawnSync('node', ['tools/check-schema.mjs'], {
    env: { ...process.env, DATABASE_URL: url },
    encoding: 'utf8',
  });
  return { code: result.status ?? -1, out: `${result.stdout}${result.stderr}` };
}

function migrate(url: string): void {
  execFileSync('node', ['tools/migrate.mjs'], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'ignore',
  });
}

const admin = () => databaseUrl().replace(/\/[^/]+$/, '/postgres');
const scratch = () => databaseUrl().replace(/\/[^/]+$/, '/gc_schema_gate_test');

async function recreateScratch(): Promise<void> {
  const client = new Client({ connectionString: admin() });
  await client.connect();
  await client.query('drop database if exists gc_schema_gate_test');
  await client.query('create database gc_schema_gate_test');
  await client.end();
}

async function dropScratch(): Promise<void> {
  const client = new Client({ connectionString: admin() });
  await client.connect();
  await client.query('drop database if exists gc_schema_gate_test');
  await client.end();
}

beforeAll(recreateScratch);
afterAll(dropScratch);

describe('a deployment against a database that has never been migrated', () => {
  it('refuses to serve', async () => {
    const { code } = gate(scratch());
    expect(code, 'serving here means every route fails on its first query').toBe(1);
  });

  it('says the database has never been migrated, rather than naming a count', async () => {
    // "behind by 1" is confusing on a database with nothing in it, and it is the
    // state a first deployment is actually in.
    const { out } = gate(scratch());
    expect(out).toMatch(/never been migrated/i);
  });

  it('names the migrations that are missing', async () => {
    const expected = JSON.parse(readFileSync(JOURNAL, 'utf8')).entries as Array<{ tag: string }>;
    const { out } = gate(scratch());
    for (const entry of expected) expect(out).toContain(entry.tag);
  });

  it('says how to fix it', async () => {
    // A refusal that does not say what to run is a puzzle handed to whoever is
    // watching a deploy fail.
    expect(gate(scratch()).out).toMatch(/migrate/);
  });
});

describe('a deployment against a migrated database', () => {
  it('serves', () => {
    migrate(scratch());
    const { code, out } = gate(scratch());
    expect(code).toBe(0);
    expect(out).toMatch(/schema ok/);
  });

  it('is unchanged by applying the migrations again', () => {
    // The release step runs on every deploy, including deploys that change no
    // migration. Applying twice must be a no-op, not a second row.
    migrate(scratch());
    expect(gate(scratch()).code).toBe(0);
  });
});

describe('a database carrying migrations this build does not know about', () => {
  it('serves anyway, rather than turning a rollback into an outage', async () => {
    const client = new Client({ connectionString: scratch() });
    await client.connect();
    // A future migration, from a version this build predates.
    await client.query(
      "insert into drizzle.__drizzle_migrations (hash, created_at) values ('future', 9999999999999)",
    );
    await client.end();

    const { code, out } = gate(scratch());
    expect(code, 'an older version on a newer schema usually works').toBe(0);
    // Always said, because it means a deploy went backwards.
    expect(out).toMatch(/does not know about|newer schema/i);
  });
});

describe('the gate cannot pass by measuring nothing', () => {
  it('refuses when it cannot reach the database', () => {
    const { code, out } = gate('postgres://nobody@127.0.0.1:1/none');
    expect(code).toBe(1);
    expect(out).toMatch(/could not reach the database/i);
  });

  it('refuses when DATABASE_URL is absent', () => {
    let code = 0;
    try {
      const env = { ...process.env };
      delete env['DATABASE_URL'];
      execFileSync('node', ['tools/check-schema.mjs'], { env, stdio: 'ignore' });
    } catch (err) {
      code = (err as { status: number }).status;
    }
    expect(code).toBe(1);
  });
});
