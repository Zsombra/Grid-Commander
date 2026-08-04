import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadConfig } from '@/config.js';

/**
 * Which variables the application refuses to start without.
 *
 * The distinction this protects has failed twice, in both directions. A
 * `SESSION_SECRET` the example never mentioned returned 500 on every
 * authenticated route while every gate stayed green. And an assistant key
 * treated as required would break `scripts/check-serving.sh`, which boots from
 * `.env.example` alone and cannot be handed a real one.
 */

const REQUIRED = {
  BATTLEGRID_CLIENT_ID: 'client-id',
  BATTLEGRID_REDIRECT_URI: 'http://localhost:3000/api/auth/battlegrid/callback',
  DATABASE_URL: 'postgres://localhost:5432/grid_commander',
  TOKEN_ENCRYPTION_KEY: 'a'.repeat(44),
  SESSION_SECRET: 'b'.repeat(44),
};

let saved: NodeJS.ProcessEnv;

beforeEach(() => {
  saved = { ...process.env };
  for (const name of [
    ...Object.keys(REQUIRED),
    'ANTHROPIC_API_KEY',
    'ALLOW_INSECURE_COOKIES',
    // Scrubbed because it changes the answer. A personal key puts the config
    // in a mode where the OAuth pair is not required, so an operator with one
    // exported saw these two cases pass an assertion they were meant to fail —
    // the suite testing its own environment rather than the product. Found on
    // 2026-08-04, the first time anything ran the suite with a key set.
    'BATTLEGRID_API_KEY',
  ]) {
    delete process.env[name];
  }
  Object.assign(process.env, REQUIRED);
});

afterEach(() => {
  process.env = saved;
});

describe('what the application refuses to start without', () => {
  for (const name of Object.keys(REQUIRED)) {
    it(`fails when ${name} is missing`, () => {
      delete process.env[name];
      expect(() => loadConfig()).toThrow(`${name} is not set`);
    });
  }
});

describe('the application needs no credential but BattleGrid’s', () => {
  it('starts with no ANTHROPIC_API_KEY, because nothing reads one', () => {
    // The assistant was the only thing that ever did, and it was removed in
    // `only-mcp-control` — it reached a model API no deployment had a
    // credential for. This asserts the variable is genuinely gone rather than
    // merely unset: setting it must change nothing.
    process.env['ANTHROPIC_API_KEY'] = 'sk-ant-test';
    expect(() => loadConfig()).not.toThrow();
    expect(JSON.stringify(loadConfig())).not.toContain('sk-ant-test');
  });

  it('documents exactly one third-party credential', () => {
    // `.env.example` is what a deployment is configured from, and
    // `check-serving.sh` boots the application from it. One BattleGrid key, or
    // an OAuth client for the delegated path — and nothing else.
    const example = readFileSync('.env.example', 'utf8');
    expect(example).not.toContain('ANTHROPIC');
    expect(example).toContain('BATTLEGRID');
  });
});
