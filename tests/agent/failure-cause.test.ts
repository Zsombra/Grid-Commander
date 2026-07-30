import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ConnectionRevokedError, DiscoveryUnavailableError } from '@/domain/errors.js';
import type { Remedy } from '@/domain/connection/remedy.js';
import { toDomainError } from '@/infrastructure/battlegrid/call-path.js';
import { malformed, messageOf, unreadable } from '@/infrastructure/battlegrid/unreadable.js';
import { McpAgentAdapter } from '@/infrastructure/battlegrid/agent-adapter.js';
import { McpBattleGridAdapter } from '@/infrastructure/battlegrid/mcp-adapter.js';
import { ConnectionScopes } from '@/infrastructure/battlegrid/connection-scopes.js';
import {
  FakeAuditStore,
  FakeClock,
  FakeConfirmationStore,
  FakeConnectionStore,
} from '../support/fakes.js';

/**
 * Which failure it was, carried out of the read.
 *
 * The roster tells a user their agents have not been lost, and earns that by
 * naming a cause that is obviously external and obviously not deletion. For a
 * long time it named the same one every time — "could not reach BattleGrid" —
 * including on a 401, where BattleGrid was reached and answered.
 *
 * That is the more dangerous half to get wrong, because it is the reassuring
 * half. It says the problem is transient and on somebody else's side, so
 * someone with a bad credential waits for an outage that is not happening.
 */

describe('classifying a failed read', () => {
  it('calls a refused authority a refusal', () => {
    expect(unreadable(new ConnectionRevokedError('reconnect')).cause).toBe('refused');
  });

  it('calls a transport failure unreachable', () => {
    expect(unreadable(new TypeError('fetch failed')).cause).toBe('unreachable');
  });

  it('calls a JSON-RPC error unreachable', () => {
    // BattleGrid responded, but with an error rather than an answer. Not a
    // refusal of authority — the credential may be perfectly good.
    expect(unreadable(new Error('tools/call failed with 500')).cause).toBe('unreachable');
  });

  it('does not treat another domain error as a refusal', () => {
    // Only ConnectionRevokedError means "answered and declined". A discovery
    // failure is its own thing and must not borrow the remedy.
    expect(unreadable(new DiscoveryUnavailableError('list_agents')).cause).toBe('unreachable');
  });

  it('survives something thrown that is not an Error', () => {
    expect(unreadable('boom')).toEqual({
      kind: 'unreadable',
      reason: 'boom',
      cause: 'unreachable',
    });
  });

  it('keeps the message alongside the cause rather than replacing it', () => {
    // The cause drives one sentence; the reason is still shown verbatim above
    // it. Losing the reason would remove the only specific information there is.
    expect(unreadable(new Error('tools/list failed with 503')).reason).toBe(
      'tools/list failed with 503',
    );
  });
});

describe('an answer that is not an answer', () => {
  it('is unreachable, not refused', () => {
    // The call succeeded. Classifying this as a refusal would send the user to
    // fix an authority that is working.
    expect(malformed('no categories returned').cause).toBe('unreachable');
  });

  it('keeps the reason it was given', () => {
    expect(malformed('no categories returned').reason).toBe('no categories returned');
  });
});

describe('the shared message helper', () => {
  it('reads an Error', () => {
    expect(messageOf(new Error('nope'))).toBe('nope');
  });

  it('stringifies anything else', () => {
    expect(messageOf(404)).toBe('404');
  });
});

describe('the sentence that varies', () => {
  const view = () => readFileSync('src/presentation/components/why-not-loaded.tsx', 'utf8');

  it('says the platform refused when it refused', () => {
    expect(view()).toMatch(/refused the authority/i);
  });

  it('says the platform could not be reached when it could not', () => {
    expect(view()).toMatch(/could not reach BattleGrid/i);
  });

  it('keeps the reassurance in both cases', () => {
    // The reassurance is the point of the sentence and does not vary. It sits
    // outside the branch, so neither case can be written without it.
    const branch = view().slice(view().indexOf('<p className="mt-2">'));
    expect(branch).toMatch(/This does not mean \{subject\} gone/);
    expect(branch.match(/This does not mean/g)).toHaveLength(1);
  });
});

describe('the cause is carried, not parsed', () => {
  const views = [
    'src/presentation/components/agent-roster.tsx',
    'src/presentation/components/strategy-list.tsx',
    'src/presentation/components/why-not-loaded.tsx',
  ];

  it('is read from the result in both places that claim one', () => {
    for (const f of views.slice(0, 2)) {
      expect(readFileSync(f, 'utf8'), f).toMatch(/cause=\{[a-z]+\.cause\}/);
    }
  });

  it('is decided nowhere but the adapter boundary', () => {
    // A view matching on words would re-derive a judgement already available as
    // a fact, and would start lying the first time a message was reworded.
    for (const f of views) {
      const source = readFileSync(f, 'utf8');
      expect(source, f).not.toMatch(/reason\.(includes|match|startsWith|indexOf)/);
    }
  });

  it('is set by one function, so the two adapters cannot disagree', () => {
    // Both adapters previously carried their own identical `message` helper.
    // Adding a second identical classification beside it is how the same
    // failure ends up described one way on /agents and another on /strategies.
    for (const f of [
      'src/infrastructure/battlegrid/agent-adapter.ts',
      'src/infrastructure/battlegrid/strategy-adapter.ts',
    ]) {
      const source = readFileSync(f, 'utf8');
      expect(source, f).not.toMatch(/cause:\s*'(refused|unreachable)'/);
      expect(source, f).toMatch(/from '\.\/unreadable\.js'/);
    }
  });
});

describe('through the real adapter, not the helper', () => {
  /**
   * The helper is tested above in isolation. This proves the adapter actually
   * calls it — the gap the classification could silently fall into, because a
   * `cause` hardcoded at one catch site would satisfy the type and every test
   * that only reads the helper.
   */
  const config = {
    clientId: 'client-1',
    mcpUrl: 'https://mcp.battlegrid.trade/mcp',
    authorizeUrl: 'https://mcp.battlegrid.trade/authorize',
    tokenUrl: 'https://mcp.battlegrid.trade/token',
    revokeUrl: 'https://mcp.battlegrid.trade/revoke',
    redirectUri: 'http://localhost:3000/api/auth/battlegrid/callback',
  };

  const roster = async (callResponse: () => Response | Promise<Response>) => {
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
    const fetch = (async (_u: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { method?: string };
      if (body.method === 'tools/list') {
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            result: {
              tools: [
                {
                  name: 'list_intelligence_agents',
                  description: 'List agents',
                  annotations: { readOnlyHint: true },
                },
              ],
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return callResponse();
    }) as typeof globalThis.fetch;

    const battlegrid = new McpBattleGridAdapter({
      config,
      audit: new FakeAuditStore(clock),
      confirmations: new FakeConfirmationStore(clock),
      heldScopes: new ConnectionScopes(connections),
      remedy: 'reconnect',
      fetch,
    });
    return new McpAgentAdapter(battlegrid).listAgents({ userId: 'u1', accessToken: 'at' });
  };

  it('reports a 401 as refused', async () => {
    const result = await roster(() => new Response('unauthorized', { status: 401 }));
    expect(result.kind === 'unreadable' && result.cause).toBe('refused');
  });

  it('reports a 500 as unreachable', async () => {
    const result = await roster(() => new Response('boom', { status: 500 }));
    expect(result.kind === 'unreadable' && result.cause).toBe('unreachable');
  });

  it('reports a transport failure as unreachable', async () => {
    const result = await roster(() => Promise.reject(new TypeError('fetch failed')));
    expect(result.kind === 'unreadable' && result.cause).toBe('unreachable');
  });
});

describe('a revocation stays a revocation on the way out', () => {
  /**
   * Found by a mutation that survived. `callTool` guards
   * `err instanceof ConnectionRevokedError ? err : toDomainError(...)`, and
   * removing the guard changed nothing — because `toDomainError` returns a
   * non-conflict `Error` unchanged, so the revocation was preserved by accident
   * rather than by the guard.
   *
   * The hazard is real even though the guard is currently redundant: a
   * revocation whose message tripped a conflict marker would be reshaped into
   * `RevisionConflictError`, and the user would be told their state moved on
   * when in fact their credential died. That is the same class of mistake this
   * whole change is about — a true-sounding explanation that is the wrong one.
   *
   * So the invariant is pinned where it can actually break: the remedy
   * sentences. This fails the day one of them is reworded to contain "conflict".
   */
  const remedies: Remedy[] = ['reconnect', 'repair-the-key'];

  it('is not reshaped into a revision conflict, for any remedy', () => {
    for (const remedy of remedies) {
      const err = new ConnectionRevokedError(remedy);
      expect(toDomainError(err, 'list_intelligence_agents'), remedy).toBeInstanceOf(
        ConnectionRevokedError,
      );
    }
  });

  it('so it still classifies as refused, for any remedy', () => {
    for (const remedy of remedies) {
      const passed = toDomainError(new ConnectionRevokedError(remedy), 'x');
      expect(unreadable(passed).cause, remedy).toBe('refused');
    }
  });
});
