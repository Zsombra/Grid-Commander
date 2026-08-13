import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The recording, against the live authorization server.
 *
 * `tests/architecture/oauth-conformance.test.ts` runs offline against
 * `docs/battlegrid-oauth-metadata.json`, which makes that file the thing every
 * other OAuth check ultimately trusts. A recording nothing re-fetches is a
 * recording that can quietly stop describing the platform — and then the guard
 * built on it passes while a user is sent to an endpoint that has moved.
 *
 * This is the same relationship `probe_mcp_surface.py` has to the tool
 * artifact, made cheap enough to run on demand: the discovery document needs no
 * credential at all.
 *
 * **Gated on `BATTLEGRID_OAUTH_LIVE` rather than on an API key**, because it
 * needs none — and gating it on `BATTLEGRID_API_KEY` would tie a check that
 * requires no authority to a variable that grants a lot of it.
 *
 *   BATTLEGRID_OAUTH_LIVE=1 npx vitest run tests/live/oauth-metadata.test.ts
 *
 * ---
 *
 * **What this does not cover.** This file checks the authorization server's
 * published *description*. It does not exchange an authorization code for a
 * token, and **no test in this suite does** — obtaining a code requires a person
 * at a consent screen, so the exchange cannot be automated. The limit is real;
 * a reader believing it does not exist is not.
 *
 * That belief was reachable and it cost something. Until 2026-08-13 the
 * delegated path had never completed a single connection: BattleGrid sends no
 * OIDC `sub` and the adapter required one, so every grant it was ever issued was
 * refused. The only place `sub` appears is in a token response nothing here
 * receives, so this gate was green and correct throughout, and the list it
 * appeared in was what misled. See #203.
 */

const live = process.env['BATTLEGRID_OAUTH_LIVE'] ? describe : describe.skip;

const DISCOVERY = 'https://mcp.battlegrid.trade/.well-known/oauth-authorization-server';

live('the recorded discovery document still describes the platform', () => {
  it('matches what the server publishes right now', async () => {
    const recorded = JSON.parse(readFileSync('docs/battlegrid-oauth-metadata.json', 'utf8'));
    const res = await fetch(DISCOVERY, { headers: { accept: 'application/json' } });
    expect(res.status, 'the discovery document must be reachable').toBe(200);
    const livedoc = await res.json();

    /**
     * Compared field by field rather than as one object, so a failure names
     * what moved instead of printing two documents side by side and leaving the
     * reader to diff them.
     */
    for (const key of Object.keys(recorded)) {
      expect(livedoc[key], `${key} changed on the platform`).toEqual(recorded[key]);
    }

    // And the other direction: a field the platform added is news too. It may be
    // a capability worth using, or a signal the server was reconfigured.
    const added = Object.keys(livedoc).filter((k) => !(k in recorded));
    expect(added, 'the platform publishes fields the recording does not have').toEqual([]);
  });

  /**
   * PKCE is the only thing standing between this public client and a stolen
   * authorization code — the server issues no `client_secret` (findings-dcr
   * F-1), so there is no second factor. It was confirmed enforced, not merely
   * advertised, by sending an authorization request without a challenge and
   * being refused.
   *
   * This asserts the advertisement. The enforcement itself cannot be re-checked
   * without a registered client, and registrations here are write-once.
   */
  it('still advertises the challenge method the product sends', async () => {
    const res = await fetch(DISCOVERY, { headers: { accept: 'application/json' } });
    const doc = await res.json();
    expect(doc.code_challenge_methods_supported).toContain('S256');
    expect(doc.token_endpoint_auth_methods_supported).toContain('none');
  });
});
