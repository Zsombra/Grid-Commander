import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadConfig } from '@/config.js';
import { OWNER_USER_ID, OwnerOnlyUser } from '@/application/use-cases/owner-only-user.js';
import { DeclaredScopes } from '@/domain/connection/held-scopes.js';
import { ConnectionScopes } from '@/infrastructure/battlegrid/connection-scopes.js';
import type { ConnectionReader } from '@/domain/connection/connection-repository.js';

/**
 * A deployment holding the owner's own credential.
 *
 * This is the authentication path, so what is checked here is not "does it
 * work" but "does it claim only what is true". Two things in particular:
 *
 * - A declared scope is not a granted one. The delegated path registers for
 *   `mcp:read`, so wager authority is *unobtainable*; a `bg_live_` key carries
 *   whatever the account gave it and the product cannot read which. Anything
 *   presenting the second as the first would claim a boundary that is not there.
 * - There is no login. Whoever reaches a personal deployment acts as the owner.
 */

const REQUIRED = {
  DATABASE_URL: 'postgres://localhost:5432/grid_commander',
  TOKEN_ENCRYPTION_KEY: 'a'.repeat(44),
  SESSION_SECRET: 'b'.repeat(44),
};

const OAUTH = {
  BATTLEGRID_CLIENT_ID: 'client-id',
  BATTLEGRID_REDIRECT_URI: 'http://localhost:3000/api/auth/battlegrid/callback',
};

function walkApp(dir = 'app', out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walkApp(full, out);
    else if (/\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}

let saved: NodeJS.ProcessEnv;

beforeEach(() => {
  saved = { ...process.env };
  for (const name of [
    ...Object.keys(REQUIRED),
    ...Object.keys(OAUTH),
    'BATTLEGRID_API_KEY',
    'BATTLEGRID_KEY_SCOPES',
    'ANTHROPIC_API_KEY',
  ]) {
    delete process.env[name];
  }
  Object.assign(process.env, REQUIRED);
});

afterEach(() => {
  process.env = saved;
});

describe('a personal deployment needs no registered client', () => {
  it('starts with a key and no BATTLEGRID_CLIENT_ID', () => {
    // The whole point. Requiring a registered client to avoid registering one
    // would make the personal path unreachable by its own precondition.
    process.env['BATTLEGRID_API_KEY'] = 'bg_live_abc';
    expect(() => loadConfig()).not.toThrow();
  });

  it('still requires a client when there is no key', () => {
    // The delegated path is untouched: without a personal key, the OAuth client
    // is as required as it ever was.
    expect(() => loadConfig()).toThrow('BATTLEGRID_CLIENT_ID is not set');
  });

  it('carries the key through to config', () => {
    process.env['BATTLEGRID_API_KEY'] = 'bg_live_abc';
    expect(loadConfig().personal?.apiKey).toBe('bg_live_abc');
  });

  it('leaves personal unset when no key is configured', () => {
    Object.assign(process.env, OAUTH);
    expect(loadConfig().personal).toBeUndefined();
  });
});

describe('what the key is declared to carry', () => {
  beforeEach(() => {
    process.env['BATTLEGRID_API_KEY'] = 'bg_live_abc';
  });

  it('defaults to mcp:read rather than to whatever the key holds', () => {
    // Defaulting the other way would have the product act with authority nobody
    // asked it to use, on the strength of a variable being unset.
    expect(loadConfig().personal?.scopes).toEqual(['mcp:read']);
  });

  it('accepts an explicit wider declaration', () => {
    process.env['BATTLEGRID_KEY_SCOPES'] = 'mcp:read mcp:wager';
    expect(loadConfig().personal?.scopes).toEqual(['mcp:read', 'mcp:wager']);
  });

  it('refuses an unknown scope rather than dropping it', () => {
    // Silently narrowing is a confusing afternoon. Silently widening is worse.
    process.env['BATTLEGRID_KEY_SCOPES'] = 'mcp:read mcp:admin';
    expect(() => loadConfig()).toThrow(/mcp:admin/);
  });

  it('is a declaration, and the code says so where it is read', () => {
    // The distinction is the whole safety story of this path; if the comment
    // explaining it disappears, the next reader treats config as a grant.
    const source = readFileSync('src/domain/connection/held-scopes.ts', 'utf8');
    expect(source).toMatch(/declar/i);
    expect(source).toMatch(/cannot|no way to read|whatever the platform/i);
  });
});

describe('scopes come from whichever source is entitled to answer', () => {
  it('a declaration answers without consulting the database', async () => {
    // A personal deployment has no connection row. Inventing one to hold a value
    // that came from an environment variable would make configuration look like
    // a grant.
    const declared = new DeclaredScopes(['mcp:read']);
    await expect(declared.forUser('anyone')).resolves.toEqual(['mcp:read']);
  });

  it('a delegated grant still comes from the connection', async () => {
    const connections = {
      findByUserId: async () => ({
        userId: 'u1',
        scopes: ['mcp:read'],
        battlegridSubject: 's',
        status: 'active',
        accessTokenExpiresAt: new Date(Date.now() + 3_600_000),
      }),
    } as unknown as ConnectionReader;

    await expect(new ConnectionScopes(connections).forUser('u1')).resolves.toEqual(['mcp:read']);
  });

  it('no connection holds nothing, which refuses everything', async () => {
    // Not "any scope". An absent grant is no authority at all, and the guard
    // refusing every call is the correct reading of it.
    const connections = { findByUserId: async () => null } as unknown as ConnectionReader;
    await expect(new ConnectionScopes(connections).forUser('u1')).resolves.toEqual([]);
  });
});

describe('the owner, on a deployment that authenticates nobody', () => {
  it('acts without a session', async () => {
    const { kind } = await new OwnerOnlyUser('bg_live_abc').execute();
    expect(kind).toBe('acting');
  });

  it('acts with the configured key', async () => {
    const result = await new OwnerOnlyUser('bg_live_abc').execute();
    expect(result.kind === 'acting' && result.authority.accessToken).toBe('bg_live_abc');
  });

  it('uses a stable identity, so the audit log has something to key on', async () => {
    const result = await new OwnerOnlyUser('bg_live_abc').execute();
    expect(result.kind === 'acting' && result.authority.userId).toBe(OWNER_USER_ID);
  });

  it('never reports not-connected — there is nothing to disconnect from', async () => {
    // The delegated path's "not connected" means a grant was lost. A key that
    // stops working surfaces from the call, not from resolving who is acting.
    const result = await new OwnerOnlyUser('bg_live_abc').execute();
    expect(result.kind).not.toBe('not-connected');
  });

  it('leaves the page that reports a missing session unreachable', () => {
    // The half of that claim the assertion above does not reach. `OwnerOnlyUser`
    // never says not-connected, so `NotConnected` cannot render — but only while
    // every page asks *it* who is acting. A page that resolved a session itself
    // would bring the page back, in the one mode where its advice is wrong, and
    // nothing else here would notice.
    const pages = walkApp().filter((f) => /(^|[/\\])page\.tsx$/.test(f));
    const rendering = pages.filter((f) => readFileSync(f, 'utf8').includes('<NotConnected'));

    // If this scan found nothing, the check below would pass vacuously.
    expect(rendering.length).toBeGreaterThan(5);

    const bypassing = rendering.filter((f) => !readFileSync(f, 'utf8').includes('acting()'));
    expect(bypassing, 'these render NotConnected without asking who is acting').toEqual([]);
  });
});

describe('a deployment without a login discloses it', () => {
  const notice = () =>
    readFileSync('src/presentation/components/personal-mode-notice.tsx', 'utf8');
  const layout = () => readFileSync('app/(app)/layout.tsx', 'utf8');

  it('says anyone who can reach it acts as the owner', () => {
    expect(notice()).toMatch(/anyone who can reach/i);
  });

  it('says the scopes are declared rather than enforced', () => {
    expect(notice()).toMatch(/not a limit BattleGrid enforces/i);
  });

  it('is rendered on every page, not once', () => {
    // A warning you saw yesterday is not a warning. It is a property of the
    // deployment, true on every page for as long as it holds.
    expect(layout()).toMatch(/PersonalModeNotice/);
  });

  it('is shown only when there is something to disclose', () => {
    expect(layout()).toMatch(/personal &&/);
  });
});
