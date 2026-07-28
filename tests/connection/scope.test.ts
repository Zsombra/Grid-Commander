import { describe, expect, it } from 'vitest';
import { ScopeUnavailableError } from '@/domain/errors.js';
import { McpBattleGridAdapter } from '@/infrastructure/battlegrid/mcp-adapter.js';
import type { Scope } from '@/domain/connection/scope.js';
import {
  FakeAuditStore,
  FakeClock,
  FakeConfirmationStore,
  FakeConnectionStore,
} from '../support/fakes.js';

const config = {
  clientId: 'client-1',
  mcpUrl: 'https://mcp.battlegrid.trade/mcp',
  authorizeUrl: 'https://mcp.battlegrid.trade/authorize',
  tokenUrl: 'https://mcp.battlegrid.trade/token',
  revokeUrl: 'https://mcp.battlegrid.trade/revoke',
  redirectUri: 'http://localhost:3000/api/auth/battlegrid/callback',
};

/** A server that lists one read-only tool and answers any call successfully. */
const fetchOk: typeof globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
  const body = JSON.parse(String(init?.body ?? '{}')) as { method?: string };
  const result =
    body.method === 'tools/list'
      ? { tools: [{ name: 'get_account_state', annotations: { readOnlyHint: true } }] }
      : { ok: true };
  return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}) as typeof globalThis.fetch;

/**
 * Build an adapter whose user holds exactly `scopes`, or has no connection at
 * all when `scopes` is null.
 */
function adapterFor(scopes: readonly Scope[] | null, opts: { revoked?: boolean } = {}) {
  const clock = new FakeClock();
  const connections = new FakeConnectionStore(clock);
  const ready =
    scopes === null
      ? Promise.resolve()
      : connections
          .upsert({
            userId: 'u1',
            battlegridSubject: 'sub-u1',
            scopes,
            accessToken: 'at',
            refreshToken: null,
            accessTokenExpiresAt: null,
          })
          .then(() => (opts.revoked ? connections.markRevoked('u1') : undefined));

  const adapter = new McpBattleGridAdapter({
    config,
    audit: new FakeAuditStore(clock),
    confirmations: new FakeConfirmationStore(clock),
    connections,
    fetch: fetchOk,
  });
  return { adapter, ready };
}

const readCall = {
  userId: 'u1',
  accessToken: 'at',
  tool: 'get_account_state',
  args: {},
};

/**
 * R3, third scenario. The held scopes are read from the connection, not
 * assumed.
 *
 * The version this replaces returned the constant `['mcp:read']`. It was
 * correct under the pinned registration and wrong in the dangerous direction:
 * it reported authority the connection might not hold, so the guard would
 * permit a call the grant did not cover. See PG-004.
 */
describe('measures_against_the_grant', () => {
  it('permits an operation the grant covers', async () => {
    const { adapter, ready } = adapterFor(['mcp:read']);
    await ready;
    await expect(adapter.callTool(readCall)).resolves.toBeDefined();
  });

  it('refuses an operation the grant does not cover, before attempting it', async () => {
    // A grant narrower than what was requested: BattleGrid returned nothing.
    const { adapter, ready } = adapterFor([]);
    await ready;
    await expect(adapter.callTool(readCall)).rejects.toBeInstanceOf(ScopeUnavailableError);
  });

  it('holds nothing when there is no connection at all', async () => {
    const { adapter, ready } = adapterFor(null);
    await ready;
    await expect(adapter.callTool(readCall)).rejects.toBeInstanceOf(ScopeUnavailableError);
  });

  it('holds nothing once the connection is revoked', async () => {
    // The scopes are still recorded; the authority is not. Status decides.
    const { adapter, ready } = adapterFor(['mcp:read'], { revoked: true });
    await ready;
    await expect(adapter.callTool(readCall)).rejects.toBeInstanceOf(ScopeUnavailableError);
  });

  it('names the authority that would be needed', async () => {
    const { adapter, ready } = adapterFor([]);
    await ready;
    const err: unknown = await adapter.callTool(readCall).catch((e: unknown) => e);
    expect((err as Error).message).toContain('mcp:read');
  });
});
