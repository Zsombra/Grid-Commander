import { beforeEach, describe, expect, it } from 'vitest';
import { ListAuditQuery } from '@/application/use-cases/list-audit.query.js';
import { RecordAuditCommand } from '@/application/use-cases/record-audit.command.js';
import type { Remedy } from '@/domain/connection/remedy.js';
import { ConnectionRevokedError } from '@/domain/errors.js';
import { McpBattleGridAdapter } from '@/infrastructure/battlegrid/mcp-adapter.js';
import { FakeAuditStore, FakeClock, FakeConfirmationStore, FakeConnectionStore } from '../support/fakes.js';
import { ConnectionScopes } from '@/infrastructure/battlegrid/connection-scopes.js';

const config = {
  clientId: 'client-1',
  mcpUrl: 'https://mcp.battlegrid.trade/mcp',
  authorizeUrl: 'https://mcp.battlegrid.trade/authorize',
  tokenUrl: 'https://mcp.battlegrid.trade/token',
  revokeUrl: 'https://mcp.battlegrid.trade/revoke',
  redirectUri: 'http://localhost:3000/api/auth/battlegrid/callback',
};

/** A fetch that answers tools/list normally and tools/call with the given status. */
function fetchWith(callStatus: number): typeof globalThis.fetch {
  return (async (_url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? '{}')) as { method?: string };
    if (body.method === 'tools/list') {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          result: { tools: [{ name: 'get_account_state', annotations: { readOnlyHint: true } }] },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: callStatus });
  }) as typeof globalThis.fetch;
}

/** A store holding one active `mcp:read` connection for `u1`. */
function connected(clock: FakeClock): FakeConnectionStore {
  const store = new FakeConnectionStore(clock);
  void store.upsert({
    userId: 'u1',
    battlegridSubject: 'sub-u1',
    scopes: ['mcp:read'],
    accessToken: 'at',
    refreshToken: null,
    accessTokenExpiresAt: null,
  });
  return store;
}

describe('R10 — authority withdrawn at BattleGrid rather than through us', () => {
  let clock: FakeClock;
  let audit: FakeAuditStore;
  let confirmations: FakeConfirmationStore;

  beforeEach(() => {
    clock = new FakeClock();
    audit = new FakeAuditStore(clock);
    confirmations = new FakeConfirmationStore(clock);
  });

  const adapter = (status: number, remedy: Remedy = 'reconnect') =>
    new McpBattleGridAdapter({
      config,
      audit,
      confirmations,
      heldScopes: new ConnectionScopes(connected(clock)),
      remedy,
      fetch: fetchWith(status),
    });

  it('fails_cleanly_and_offers_reconnect on a 401', async () => {
    const err: unknown = await adapter(401)
      .callTool({ userId: 'u1', accessToken: 'stale', tool: 'get_account_state', args: {} })
      .then(() => null)
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ConnectionRevokedError);
    expect((err as Error).message.toLowerCase()).toContain('reconnect');
  });

  it('treats a 403 the same way', async () => {
    await expect(
      adapter(403).callTool({ userId: 'u1', accessToken: 'stale', tool: 'get_account_state', args: {} }),
    ).rejects.toBeInstanceOf(ConnectionRevokedError);
  });

  it('does not disguise a revocation as a generic failure the user cannot act on', async () => {
    const err: unknown = await adapter(401)
      .callTool({ userId: 'u1', accessToken: 'stale', tool: 'get_account_state', args: {} })
      .then(() => null)
      .catch((e: unknown) => e);
    expect((err as Error).message).not.toMatch(/failed with 401/);
  });

  it('still records the attempt and its failure', async () => {
    await adapter(401)
      .callTool({ userId: 'u1', accessToken: 'stale', tool: 'get_account_state', args: {} })
      .catch(() => undefined);
    expect(audit.entries[0]?.outcome).toBe('failed');
  });

  it('leaves an ordinary server error as an ordinary error', async () => {
    const err: unknown = await adapter(500)
      .callTool({ userId: 'u1', accessToken: 'at', tool: 'get_account_state', args: {} })
      .then(() => null)
      .catch((e: unknown) => e);
    expect(err).not.toBeInstanceOf(ConnectionRevokedError);
  });
});

describe('R2 — a connection is removed', () => {
  it('history_survives_disconnect: the record stays readable after disconnecting', async () => {
    const clock = new FakeClock();
    const auditStore = new FakeAuditStore(clock);
    const connections = new FakeConnectionStore(clock);
    const record = new RecordAuditCommand(auditStore);

    await connections.upsert({
      userId: 'u1',
      battlegridSubject: 'sub',
      scopes: ['mcp:read'],
      accessToken: 'at',
      refreshToken: null,
      accessTokenExpiresAt: null,
    });
    const id = await record.begin({
      userId: 'u1',
      actor: 'user',
      tool: 'create_intelligence_agent',
      destructive: false,
      idempotencyKey: null,
    });
    await record.complete(id, 'succeeded');

    await connections.markRevoked('u1');

    // The authority is gone; the record of what was done with it is not.
    const res = await new ListAuditQuery(auditStore).execute({ userId: 'u1' });
    expect(res.entries).toHaveLength(1);
    expect(res.entries[0]?.tool).toBe('create_intelligence_agent');
    expect((await connections.findByUserId('u1'))?.status).toBe('revoked');
  });

  it('discards the stored authority even though the history remains', async () => {
    const clock = new FakeClock();
    const connections = new FakeConnectionStore(clock);
    await connections.upsert({
      userId: 'u1',
      battlegridSubject: 'sub',
      scopes: ['mcp:read'],
      accessToken: 'at',
      refreshToken: 'rt',
      accessTokenExpiresAt: null,
    });
    await connections.markRevoked('u1');
    expect(connections.secrets.has('u1')).toBe(false);
  });
});

describe('R2 — a grant carries authority, not identity', () => {
  /**
   * This block used to assert the opposite, and the opposite was wrong.
   *
   * It required `sub` on every token response and refused without one, on
   * reasoning that was sound: defaulting an absent `sub` to `''` would make
   * every such grant collide on one key, and the second user to connect would be
   * recognised as the first, landing in a stranger's workspace holding a
   * stranger's BattleGrid connection.
   *
   * The reasoning still holds. It just does not belong to a token response.
   * BattleGrid is plain OAuth 2.1 — `openid-configuration` 404, no
   * `userinfo_endpoint` — so `sub` is not a field it sometimes omits; it is a
   * field its authorization server never had. Three live grants on 2026-08-13
   * confirmed it, which is also how anyone found out: **this suite was green,
   * and no delegated connection had ever completed.** Every grant the product
   * was ever issued was refused right here.
   *
   * The refusal now lives in `CompleteConnectionCommand`, where there is an
   * identity read to refuse *on*, and `tests/connection/connect.test.ts` holds
   * the collision guarantee.
   *
   * **Mutation-checked 2026-08-13 (M1).** The `sub` requirement was re-injected
   * into `tokenRequest` and the first test below failed, alone. That matters
   * more here than anywhere: this file's *previous* version was green for the
   * entire life of the defect, so "the tests pass" was never the evidence. The
   * only thing that proves a check works is feeding it the failure it was
   * written for.
   */
  const tokenFetch = (body: Record<string, unknown>): typeof globalThis.fetch =>
    (async () =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })) as typeof globalThis.fetch;

  const adapterWith = (fetch: typeof globalThis.fetch) => {
    const clock = new FakeClock();
    return new McpBattleGridAdapter({
      config,
      audit: new FakeAuditStore(clock),
      confirmations: new FakeConfirmationStore(clock),
      heldScopes: new ConnectionScopes(new FakeConnectionStore(clock)),
      remedy: 'reconnect',
      fetch,
    });
  };

  /**
   * The shape BattleGrid actually sends, byte for byte, from the 2026-08-13
   * walk: `access_token, token_type, expires_in, refresh_token, scope`.
   */
  it('accepts the token response BattleGrid actually sends', async () => {
    const adapter = adapterWith(
      tokenFetch({
        access_token: 'at',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'rt',
        scope: 'mcp:read',
      }),
    );
    const grant = await adapter.exchangeCode({ code: 'c', codeVerifier: 'v' });
    expect(grant.accessToken).toBe('at');
    expect(grant.refreshToken).toBe('rt');
    expect(grant.scopes).toEqual(['mcp:read']);
  });

  /**
   * The grant carries no identity, and cannot be made to.
   *
   * Asserted on the whole key set rather than on `subject` being absent, so that
   * re-adding *any* identity-shaped field to this layer is a decision made in
   * this file rather than something that reappears quietly.
   */
  it('carries no identity out of the token layer, even when the server sends one', async () => {
    const adapter = adapterWith(
      tokenFetch({ access_token: 'at', scope: 'mcp:read', sub: 'bg-user-1', expires_in: 3600 }),
    );
    const grant = await adapter.exchangeCode({ code: 'c', codeVerifier: 'v' });
    expect(Object.keys(grant).sort()).toEqual([
      'accessToken',
      'expiresIn',
      'refreshToken',
      'scopes',
    ]);
    expect(grant).not.toHaveProperty('subject');
  });
});
