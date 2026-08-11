import { describe, expect, it } from 'vitest';
import { PlatformUnavailableError } from '@/domain/errors.js';
import { McpBattleGridAdapter } from '@/infrastructure/battlegrid/mcp-adapter.js';
import { ConnectionScopes } from '@/infrastructure/battlegrid/connection-scopes.js';
import {
  FakeAuditStore,
  FakeClock,
  FakeConfirmationStore,
  FakeConnectionStore,
} from '../support/fakes.js';

/**
 * The platform publishes its request budget on every answer, and until this
 * change the client read none of it — it reacted to HTTP 429 only after one
 * landed, which the server's own instructions warn "arrives too late to steer
 * a batch you have already dispatched."
 *
 * Two behaviors, from the delta specs:
 *
 *   - every answer's `RateLimit-*` headers become the retained snapshot, and
 *     an answer *without* them retains "unstated" rather than repeating the
 *     previous numbers as current — absence is information, exactly as
 *     `generatedAtMs` treats a snapshot with no timestamp;
 *   - a 429 carries the platform's `Retry-After` into the sentence the
 *     operator reads, and never invents a wait the platform did not name.
 */

const config = {
  clientId: 'client-1',
  mcpUrl: 'https://mcp.battlegrid.trade/mcp',
  authorizeUrl: 'https://mcp.battlegrid.trade/authorize',
  tokenUrl: 'https://mcp.battlegrid.trade/token',
  revokeUrl: 'https://mcp.battlegrid.trade/revoke',
  redirectUri: 'http://localhost:3000/api/auth/battlegrid/callback',
};

const TOOL = 'list_intelligence_agents';

/**
 * A server that answers `tools/list` plainly and `tools/call` from a queue,
 * so one adapter can see budget headers appear and then disappear.
 */
function serverAnswering(
  calls: Array<{ status?: number; headers?: Record<string, string> }>,
): typeof globalThis.fetch {
  return (async (_u: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? '{}')) as { method?: string };
    if (body.method === 'tools/list') {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          result: {
            tools: [{ name: TOOL, description: 'List agents', annotations: { readOnlyHint: true } }],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    const next = calls.shift() ?? {};
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        result: { structuredContent: { agents: [], slotUsage: {} } },
      }),
      {
        status: next.status ?? 200,
        headers: { 'Content-Type': 'application/json', ...(next.headers ?? {}) },
      },
    );
  }) as typeof globalThis.fetch;
}

async function wire(calls: Array<{ status?: number; headers?: Record<string, string> }>) {
  const clock = new FakeClock();
  const connections = new FakeConnectionStore(clock);
  await connections.upsert({
    userId: 'u1',
    battlegridSubject: 'sub-u1',
    scopes: ['mcp:read'],
    accessToken: 'at',
    refreshToken: null,
    accessTokenExpiresAt: null,
  });
  return new McpBattleGridAdapter({
    config,
    audit: new FakeAuditStore(clock),
    confirmations: new FakeConfirmationStore(clock),
    heldScopes: new ConnectionScopes(connections),
    remedy: 'reconnect',
    fetch: serverAnswering(calls),
  });
}

const call = (b: McpBattleGridAdapter) =>
  b.callTool({ userId: 'u1', accessToken: 'at', tool: TOOL, args: {} });

const BUDGET = { 'RateLimit-Limit': '120', 'RateLimit-Remaining': '87', 'RateLimit-Reset': '11' };

describe('the platform’s declared request budget is read', () => {
  it('is unstated before anything has answered', async () => {
    const adapter = await wire([]);
    expect(adapter.lastRequestBudget()).toEqual({ kind: 'unstated' });
  });

  it('an answer carrying the headers becomes the snapshot', async () => {
    const adapter = await wire([{ headers: BUDGET }]);
    await call(adapter);
    expect(adapter.lastRequestBudget()).toEqual({
      kind: 'stated',
      limit: 120,
      remaining: 87,
      resetSeconds: 11,
    });
  });

  it('an answer without the headers exposes unstated, not the previous numbers', async () => {
    // The failure mode this forbids is exactly the stale-snapshot one: a
    // number from an earlier answer repeated as though the platform had just
    // declared it.
    const adapter = await wire([{ headers: BUDGET }, {}]);
    await call(adapter);
    expect(adapter.lastRequestBudget().kind).toBe('stated');
    await call(adapter);
    expect(adapter.lastRequestBudget()).toEqual({ kind: 'unstated' });
  });

  it('a partial header set is unstated, never padded', async () => {
    const adapter = await wire([{ headers: { 'RateLimit-Remaining': '87' } }]);
    await call(adapter);
    expect(adapter.lastRequestBudget()).toEqual({ kind: 'unstated' });
  });
});

describe('a rate-limited request names the wait', () => {
  it('carries Retry-After into the sentence when the platform named one', async () => {
    const adapter = await wire([{ status: 429, headers: { 'Retry-After': '7' } }]);
    const failure = await call(adapter).catch((e: unknown) => e);

    expect(failure).toBeInstanceOf(PlatformUnavailableError);
    const err = failure as PlatformUnavailableError;
    expect(err.retryAfterSeconds).toBe(7);
    expect(err.message).toContain('7 seconds');
    expect(err.message, 'a 429 runs no tool — say so').toContain('nothing on your account changed');
  });

  it('invents no wait when the platform named none', async () => {
    const adapter = await wire([{ status: 429 }]);
    const failure = await call(adapter).catch((e: unknown) => e);

    expect(failure).toBeInstanceOf(PlatformUnavailableError);
    const err = failure as PlatformUnavailableError;
    expect(err.retryAfterSeconds).toBeUndefined();
    expect(err.message).toContain('the next attempt should succeed');
    expect(err.message).not.toMatch(/asks for \d+ second/);
  });

  it('drops an HTTP-date Retry-After rather than misreading it as seconds', async () => {
    const adapter = await wire([
      { status: 429, headers: { 'Retry-After': 'Wed, 21 Oct 2026 07:28:00 GMT' } },
    ]);
    const failure = await call(adapter).catch((e: unknown) => e);
    expect((failure as PlatformUnavailableError).retryAfterSeconds).toBeUndefined();
  });
});
