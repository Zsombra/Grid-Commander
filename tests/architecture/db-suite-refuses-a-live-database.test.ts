import { describe, expect, it, afterEach } from 'vitest';
import { assertDisposable } from '../db/support.js';

/**
 * The database suite truncates. This is what stops it truncating yours.
 *
 * On 2026-08-13 `npm run test:db` was run with the `DATABASE_URL` from `.env` —
 * the application's own — and it truncated a live signal record. Every test
 * passed. Nothing warned. The record could not be rebuilt, because BattleGrid
 * serves current readings only and does not re-serve history.
 *
 * The guard is opt-*in* on purpose, and these pin that: an unrecognised name
 * refuses, a near-miss refuses, and a typo in the override refuses. A suite
 * whose failure mode is unrecoverable data has to fail toward doing nothing.
 */

const KEY = 'DB_TESTS_MAY_TRUNCATE';
const original = process.env[KEY];

afterEach(() => {
  if (original === undefined) delete process.env[KEY];
  else process.env[KEY] = original;
});

const at = (db: string) => `postgres://u:p@localhost:5432/${db}`;

describe('the database suite refuses a database nobody called disposable', () => {
  it('refuses the name the application itself uses', () => {
    delete process.env[KEY];
    expect(() => assertDisposable(at('grid_commander'))).toThrow(/Refusing to run/);
  });

  it('names the database it refused, so the message is actionable', () => {
    delete process.env[KEY];
    expect(() => assertDisposable(at('grid_commander'))).toThrow(/grid_commander/);
  });

  it('says why — that it truncates, and that the record cannot be re-served', () => {
    delete process.env[KEY];
    expect(() => assertDisposable(at('production'))).toThrow(/TRUNCATES/);
    expect(() => assertDisposable(at('production'))).toThrow(/current readings only/);
  });

  it('allows a database whose name says it is disposable', () => {
    delete process.env[KEY];
    for (const db of ['grid_commander_test', 'test_grid', 'gc-scratch', 'throwaway_db', 'tests']) {
      expect(() => assertDisposable(at(db))).not.toThrow();
    }
  });

  it('does not treat a name that merely contains the letters as permission', () => {
    delete process.env[KEY];
    // "latest" and "contest" contain "test" and are not statements of intent.
    for (const db of ['latest', 'contest', 'protests']) {
      expect(() => assertDisposable(at(db))).toThrow(/Refusing to run/);
    }
  });

  it('allows an explicit override, spelled exactly', () => {
    process.env[KEY] = 'yes';
    expect(() => assertDisposable(at('grid_commander'))).not.toThrow();
  });

  it('refuses a near-miss override — a typo must not read as consent', () => {
    for (const v of ['y', 'YES', 'true', '1', 'yes ']) {
      process.env[KEY] = v;
      expect(() => assertDisposable(at('grid_commander'))).toThrow(/Refusing to run/);
    }
  });

  it('refuses a string it cannot parse rather than letting it pass', () => {
    delete process.env[KEY];
    expect(() => assertDisposable('not a url at all')).toThrow(/Refusing to run/);
  });
});
