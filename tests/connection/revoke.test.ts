import { beforeEach, describe, expect, it } from 'vitest';
import { ListAuditQuery } from '@/application/use-cases/list-audit.query.js';
import { RecordAuditCommand } from '@/application/use-cases/record-audit.command.js';
import { ConnectionRevokedError } from '@/domain/errors.js';
import { McpBattleGridAdapter } from '@/infrastructure/battlegrid/mcp-adapter.js';
import { FakeAuditStore, FakeClock, FakeConfirmationStore, FakeConnectionStore } from '../support/fakes.js';

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

  const adapter = (status: number) =>
    new McpBattleGridAdapter({
      config,
      audit,
      confirmations,
      connections: connected(clock),
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

describe('R2 — a grant with no subject cannot establish an identity', () => {
  /**
   * Found by the production gate. Defaulting an absent `sub` to '' made every
   * such grant collide on the same key: the second user to connect would be
   * recognised as the first and land in a stranger's workspace, holding a
   * stranger's BattleGrid connection.
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
      connections: new FakeConnectionStore(clock),
      fetch,
    });
  };

  it('refuses a token response with no subject', async () => {
    const adapter = adapterWith(
      tokenFetch({ access_token: 'at', scope: 'mcp:read' }), // no `sub`
    );
    await expect(
      adapter.exchangeCode({ code: 'c', codeVerifier: 'v' }),
    ).rejects.toThrow(/no subject/i);
  });

  it('refuses an empty-string subject just as firmly', async () => {
    const adapter = adapterWith(tokenFetch({ access_token: 'at', scope: 'mcp:read', sub: '' }));
    await expect(
      adapter.exchangeCode({ code: 'c', codeVerifier: 'v' }),
    ).rejects.toThrow(/no subject/i);
  });

  it('accepts a grant that carries one', async () => {
    const adapter = adapterWith(
      tokenFetch({ access_token: 'at', scope: 'mcp:read', sub: 'bg-user-1', expires_in: 3600 }),
    );
    const grant = await adapter.exchangeCode({ code: 'c', codeVerifier: 'v' });
    expect(grant.subject).toBe('bg-user-1');
  });
});
