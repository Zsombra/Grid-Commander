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
  for (const name of [...Object.keys(REQUIRED), 'ANTHROPIC_API_KEY', 'ALLOW_INSECURE_COOKIES']) {
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

describe('the assistant key is optional', () => {
  it('starts with no ANTHROPIC_API_KEY at all', () => {
    // A deployment without a model is supported. If this ever throws, the
    // serving gate stops being able to boot the application.
    expect(() => loadConfig()).not.toThrow();
    expect(loadConfig().anthropicApiKey).toBeUndefined();
  });

  it('reads set-but-empty as absent', () => {
    // `ANTHROPIC_API_KEY=` in a .env is a blank line, not a key. Carrying '' as
    // a value would build a client that fails on every question instead of an
    // assistant that says it is not configured.
    process.env['ANTHROPIC_API_KEY'] = '';
    expect(loadConfig().anthropicApiKey).toBeUndefined();
  });

  it('carries the key when one is set', () => {
    process.env['ANTHROPIC_API_KEY'] = 'sk-ant-test';
    expect(loadConfig().anthropicApiKey).toBe('sk-ant-test');
  });
});
