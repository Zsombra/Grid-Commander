import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadConfig } from '@/config.js';

/**
 * What the product sends to the authorization server, against what that server
 * publishes about itself.
 *
 * `CLAUDE.md` states the lesson: *the tool list goes stale after a BattleGrid
 * deployment — rediscover at runtime, never hard-code.* It was applied to tools
 * and nowhere else. Four OAuth URLs are built from a constant in `config.ts` and
 * were compared to nothing, on the one path whose failure mode is sending a user
 * to a consent screen that does not exist.
 *
 * They agree. That is the point: this file is the difference between *correct*
 * and *known to be correct*, and only the second survives a deployment nobody
 * announced.
 *
 * **The URLs stay pinned rather than resolved at request time**, deliberately.
 * An issuer's endpoints are meant to be stable, and a client that reads its
 * authorization endpoint off the network on every request will follow a redirect
 * an attacker controls the first time discovery is poisoned. Pin, and check.
 *
 * Offline, against a recording, exactly as `mcp-conformance.test.ts` runs.
 * `tests/live/oauth-metadata.test.ts` is what keeps the recording honest.
 */

interface Metadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  revocation_endpoint: string;
  registration_endpoint: string;
  scopes_supported: string[];
  grant_types_supported: string[];
  response_types_supported: string[];
  code_challenge_methods_supported: string[];
  token_endpoint_auth_methods_supported: string[];
}

const metadata = JSON.parse(
  readFileSync('docs/battlegrid-oauth-metadata.json', 'utf8'),
) as Metadata;

/**
 * `loadConfig` requires the OAuth variables unless a personal key is set, so the
 * delegated shape is what has to be constructed to read the URLs at all.
 */
function delegatedConfig() {
  return loadConfig();
}

describe('the product’s OAuth endpoints are the ones BattleGrid publishes', () => {
  const saved = { ...process.env };

  beforeEach(() => {
    delete process.env['BATTLEGRID_API_KEY'];
    process.env['BATTLEGRID_CLIENT_ID'] = 'a-registered-client';
    process.env['BATTLEGRID_REDIRECT_URI'] = 'http://localhost:3000/api/auth/battlegrid/callback';
    process.env['DATABASE_URL'] = 'postgres://localhost:5432/x';
    process.env['TOKEN_ENCRYPTION_KEY'] = 'k'.repeat(44);
    process.env['SESSION_SECRET'] = 's'.repeat(44);
  });

  afterEach(() => {
    process.env = { ...saved };
  });

  it('builds the authorization endpoint the server names', () => {
    expect(delegatedConfig().battlegrid.authorizeUrl).toBe(metadata.authorization_endpoint);
  });

  it('builds the token endpoint the server names', () => {
    expect(delegatedConfig().battlegrid.tokenUrl).toBe(metadata.token_endpoint);
  });

  it('builds the revocation endpoint the server names', () => {
    // Disconnecting revokes upstream before clearing the session. A wrong URL
    // here means a user who believes they revoked a grant that is still live.
    expect(delegatedConfig().battlegrid.revokeUrl).toBe(metadata.revocation_endpoint);
  });

  it('reads a recording that is actually the discovery document', () => {
    // A recording reduced to `{}` would make every check above pass vacuously,
    // which is the failure mode every guard in this directory carries a note
    // about.
    expect(metadata.issuer).toContain('battlegrid');
    expect(Object.keys(metadata).length).toBeGreaterThan(6);
  });
});

/**
 * A matching URL is not a matching request.
 *
 * `config.ts` could name every endpoint correctly while
 * `buildAuthorizationUrl` sends a challenge method the server does not accept.
 * These read the adapter's source, because the alternative is asserting against
 * a value the same file computes — the shape of test that has agreed with itself
 * three times in this repository.
 */
describe('what the product sends is what the server supports', () => {
  const adapter = readFileSync('src/infrastructure/battlegrid/mcp-adapter.ts', 'utf8');

  it('sends a response type the server supports', () => {
    const sent = adapter.match(/set\('response_type',\s*'([^']+)'\)/)?.[1];
    expect(sent, 'no response_type found in buildAuthorizationUrl').toBeDefined();
    expect(metadata.response_types_supported).toContain(sent);
  });

  it('sends a challenge method the server supports', () => {
    const sent = adapter.match(/set\('code_challenge_method',\s*'([^']+)'\)/)?.[1];
    expect(sent, 'no code_challenge_method found').toBeDefined();
    expect(metadata.code_challenge_methods_supported).toContain(sent);
  });

  it('uses grant types the server supports', () => {
    const sent = [...adapter.matchAll(/grant_type:\s*'([^']+)'/g)].map((m) => m[1] as string);
    expect(sent.length, 'no grant_type found in the adapter').toBeGreaterThan(1);
    for (const g of sent) expect(metadata.grant_types_supported).toContain(g);
  });

  /**
   * F-1 in `findings-dcr`: the server issues no `client_secret` whatever
   * authentication method a registration asks for, so the client is public and
   * PKCE is the only proof. Sending a secret would be sending a value that does
   * not exist.
   */
  it('authenticates as a public client, which is the only kind this server issues', () => {
    expect(metadata.token_endpoint_auth_methods_supported).toContain('none');
    // Only a *sent* secret is the defect. The adapter names `client_secret` in a
    // comment explaining why it sends none, and that comment is the record of
    // F-1 — matching the bare string would delete the explanation to satisfy
    // the check, which is the wrong direction entirely.
    const code = adapter.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '');
    expect(code, 'a secret this server never issues must not be sent').not.toMatch(
      /client_secret/,
    );
  });
});

/**
 * Scope is a claim about the server too.
 *
 * `mcp:wager` is modelled and deliberately never requested; both it and
 * `mcp:read` must exist, or the product's whole scope story is about a
 * vocabulary the platform does not have.
 */
describe('the scopes the product models are the scopes the server has', () => {
  const scope = readFileSync('src/domain/connection/scope.ts', 'utf8');

  it('models only scopes the server publishes', () => {
    const modelled = [...scope.matchAll(/'(mcp:[a-z]+)'/g)].map((m) => m[1] as string);
    expect(modelled.length).toBeGreaterThan(1);
    for (const s of new Set(modelled)) expect(metadata.scopes_supported).toContain(s);
  });

  it('models every scope the server publishes, so none is silently unhandled', () => {
    for (const s of metadata.scopes_supported) expect(scope).toContain(s);
  });
});

/**
 * The gate says what it does not cover.
 *
 * Requirement *The Coverage Around Consent Is Stated Where It Is Read*. There is
 * one segment of the authorization path nothing here can exercise — obtaining an
 * authorization code needs a person at a consent screen — and until 2026-08-13
 * that limit was invisible. `oauth-live` sitting green in the gate list read as
 * "the OAuth path is exercised live", while the delegated path had never
 * completed a single connection: BattleGrid sends no OIDC `sub` and the adapter
 * required one, so every grant the product was ever issued was refused (#203).
 *
 * No gate could have caught that, and none was at fault. What was at fault was
 * a list that implied coverage it did not have. So the boundary is written where
 * someone meets it, and this is what notices if it is deleted.
 *
 * Matched on meaning rather than on a sentence: two independent ideas — that no
 * check exchanges a token, and that a human at a consent screen is why — so a
 * rewrite that keeps the point keeps passing, and one that drops it does not.
 */
describe('the coverage boundary around consent is stated where it is read', () => {
  const places = {
    'scripts/ci.sh': readFileSync('scripts/ci.sh', 'utf8'),
    'tests/live/oauth-metadata.test.ts': readFileSync('tests/live/oauth-metadata.test.ts', 'utf8'),
  };

  for (const [where, text] of Object.entries(places)) {
    it(`${where} says a human at a consent screen is the reason`, () => {
      expect(text.toLowerCase()).toContain('consent screen');
    });

    it(`${where} says no check exchanges a token`, () => {
      // "exchange" plus a negation of coverage, within the same file. Either
      // half alone is satisfiable by prose that does not make the claim.
      expect(text.toLowerCase()).toMatch(/exchang/);
      expect(text.toLowerCase()).toMatch(/no (gate|test|check)/);
    });
  }

  it('is reading files that exist and have content', () => {
    // A scan that silently found nothing would pass vacuously, which is the
    // failure this directory exists to prevent.
    for (const [where, text] of Object.entries(places)) {
      expect(text.length, where).toBeGreaterThan(500);
    }
  });
});
