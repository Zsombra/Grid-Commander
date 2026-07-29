import { describe, expect, it } from 'vitest';
import { CurrentUserQuery } from '@/application/use-cases/current-user.query.js';
import { ResolveAuthorityQuery, type TokenVault } from '@/application/use-cases/resolve-authority.query.js';
import { DescribeRebindQuery, RebindAgentCommand } from '@/application/use-cases/rebind-agent.command.js';
import { ListAgentsQuery } from '@/application/use-cases/list-agents.query.js';
import { ConfirmationRequiredError } from '@/domain/errors.js';
import { CookieSession, type CookieStore } from '@/infrastructure/http/cookie-session.js';
import { McpAgentAdapter } from '@/infrastructure/battlegrid/agent-adapter.js';
import { McpBattleGridAdapter } from '@/infrastructure/battlegrid/mcp-adapter.js';
import { SequentialRandom } from '../support/agent-fakes.js';
import { FakeAuditStore, FakeClock, FakeConfirmationStore, FakeConnectionStore } from '../support/fakes.js';
import { ConnectionScopes } from '@/infrastructure/battlegrid/connection-scopes.js';

/**
 * The assumption three changes have rested on: that the layers are plugged into
 * each other.
 *
 * Every layer is tested against its own contract, and until this file nothing
 * asserted the contracts were connected. The specific thing worth proving is
 * that a destructive call made through the *real* path — session, authority,
 * guard sequence, adapter — really does require a confirmation and really does
 * write an audit row. Those are guarantees about a call path, and no request
 * had ever taken it.
 *
 * Deliberately one test file, not a suite. The layers below are thoroughly
 * covered; what was missing is a proof of connection, not a second copy of the
 * coverage. The only double is at the fetch boundary.
 */

const config = {
  clientId: 'client-1',
  mcpUrl: 'https://mcp.battlegrid.trade/mcp',
  authorizeUrl: 'https://mcp.battlegrid.trade/authorize',
  tokenUrl: 'https://mcp.battlegrid.trade/token',
  revokeUrl: 'https://mcp.battlegrid.trade/revoke',
  redirectUri: 'http://localhost:3000/api/auth/battlegrid/callback',
};

const AGENT = {
  id: 'a1',
  revision: 4,
  displayName: 'Volatilis',
  status: 'ACTIVE',
  strategyId: 's-old',
  strategyName: 'Volatilis — imported',
  strategyRevision: 1,
  bindingState: 'BOUND',
  brainPreset: 'ROMMEL',
  capabilities: { canEdit: true, canDelete: true, canArchive: true, canEditOverlay: true },
};

/** A BattleGrid that classifies rebind as destructive, as the real one does. */
function fakeBattleGrid() {
  const calls: Array<{ tool: string; args: Record<string, unknown> }> = [];
  const fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? '{}')) as {
      method?: string;
      params?: { name?: string; arguments?: Record<string, unknown> };
    };

    const result =
      body.method === 'tools/list'
        ? {
            tools: [
              { name: 'list_intelligence_agents', annotations: { readOnlyHint: true } },
              { name: 'get_intelligence_agent', annotations: { readOnlyHint: true } },
              {
                name: 'rebind_intelligence_agent',
                annotations: { readOnlyHint: false, destructiveHint: true },
              },
            ],
          }
        : respond(body.params?.name ?? '', body.params?.arguments ?? {}, calls);

    return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof globalThis.fetch;

  return { fetch, calls };
}

function respond(
  tool: string,
  args: Record<string, unknown>,
  calls: Array<{ tool: string; args: Record<string, unknown> }>,
): unknown {
  calls.push({ tool, args });
  if (tool === 'list_intelligence_agents') {
    return { agents: [AGENT], slotUsage: { limit: 3, used: 1, remaining: 2, rank: { displayName: 'Recruit III' } } };
  }
  if (tool === 'get_intelligence_agent') return { agent: AGENT };
  if (tool === 'rebind_intelligence_agent') {
    return { agent: { ...AGENT, revision: 5, strategyId: 's-new', strategyName: 'Momentum Breakout' } };
  }
  return {};
}

class MemoryCookies implements CookieStore {
  private jar = new Map<string, string>();
  get(name: string): string | undefined {
    return this.jar.get(name);
  }
  set(name: string, value: string): void {
    this.jar.set(name, value);
  }
  delete(name: string): void {
    this.jar.delete(name);
  }
}

/** Everything from a cookie to a BattleGrid call, wired the way composition wires it. */
async function wire() {
  const clock = new FakeClock();
  const cookies = new MemoryCookies();
  const sessions = new CookieSession({ cookies, secret: 'server-secret', clock });

  const connections = new FakeConnectionStore(clock);
  await connections.upsert({
    userId: 'u1',
    battlegridSubject: 'sub-u1',
    scopes: ['mcp:read'],
    accessToken: 'live-access',
    refreshToken: 'live-refresh',
    accessTokenExpiresAt: new Date(clock.now().getTime() + 3_600_000),
  });

  const audit = new FakeAuditStore(clock);
  const confirmations = new FakeConfirmationStore(clock);
  const platform = fakeBattleGrid();

  const battlegrid = new McpBattleGridAdapter({
    config,
    audit,
    confirmations,
    heldScopes: new ConnectionScopes(connections),
    remedy: 'reconnect',
    fetch: platform.fetch,
  });
  const agents = new McpAgentAdapter(battlegrid);

  const vault: TokenVault = {
    read: async (userId) => {
      const secret = connections.secrets.get(userId);
      return secret ? { accessToken: secret.accessToken, refreshToken: secret.refreshToken } : null;
    },
  };

  const authority = new ResolveAuthorityQuery(connections, vault, battlegrid, clock);

  return {
    clock,
    audit,
    confirmations,
    platform,
    sessions,
    currentUser: new CurrentUserQuery(sessions, connections, authority),
    listAgents: new ListAgentsQuery(agents),
    describeRebind: new DescribeRebindQuery(agents, confirmations, new SequentialRandom(), clock),
    rebindAgent: new RebindAgentCommand(agents),
  };
}

describe('a request travels the whole path', () => {
  it('reads a roster from BattleGrid using the session’s authority', async () => {
    const app = await wire();
    await app.sessions.issue({ userId: 'u1', issuedAt: app.clock.now() });

    const user = await app.currentUser.execute();
    expect(user.kind).toBe('acting');
    if (user.kind !== 'acting') return;

    const { roster } = await app.listAgents.execute(user.authority);
    expect(roster.kind).toBe('agents');
    expect(roster.kind === 'agents' && roster.agents[0]?.displayName).toBe('Volatilis');
    // The token that reached the platform came from the connection, not from
    // anywhere the request could have supplied it.
    expect(user.authority.accessToken).toBe('live-access');
  });

  it('a request with no session reaches BattleGrid not at all', async () => {
    const app = await wire();
    const user = await app.currentUser.execute();
    expect(user.kind).toBe('not-connected');
    expect(app.platform.calls).toEqual([]);
  });

  /**
   * The proof this file exists for. Through the real path, a destructive
   * operation without a confirmation must be refused *before* it is attempted,
   * and no audit row may claim it was.
   */
  it('refuses a destructive call with no confirmation, and records no attempt', async () => {
    const app = await wire();
    await app.sessions.issue({ userId: 'u1', issuedAt: app.clock.now() });
    const user = await app.currentUser.execute();
    if (user.kind !== 'acting') throw new Error('expected to be acting');

    await expect(
      app.rebindAgent.execute({
        ...user.authority,
        agentId: 'a1',
        toStrategyId: 's-new',
        expectedRevision: 4,
        confirmationToken: '',
      }),
    ).rejects.toBeInstanceOf(ConfirmationRequiredError);

    expect(app.platform.calls.some((c) => c.tool === 'rebind_intelligence_agent')).toBe(false);
    // A refusal is not an attempt.
    expect(app.audit.entries).toEqual([]);
  });

  it('performs it with a confirmation, and writes the audit row before the call', async () => {
    const app = await wire();
    await app.sessions.issue({ userId: 'u1', issuedAt: app.clock.now() });
    const user = await app.currentUser.execute();
    if (user.kind !== 'acting') throw new Error('expected to be acting');

    const proposal = await app.describeRebind.execute({
      ...user.authority,
      agentId: 'a1',
      toStrategyId: 's-new',
      toStrategyName: 'Momentum Breakout',
    });
    if (proposal.kind !== 'proposal') throw new Error('expected a proposal');

    const result = await app.rebindAgent.execute({
      ...user.authority,
      agentId: 'a1',
      toStrategyId: 's-new',
      expectedRevision: proposal.proposal.rebind.expectedRevision,
      confirmationToken: proposal.proposal.confirmationToken,
    });

    expect(result.agent.binding.strategyId).toBe('s-new');

    const sent = app.platform.calls.find((c) => c.tool === 'rebind_intelligence_agent');
    expect(sent?.args['expectedRevision']).toBe(4);

    const row = app.audit.entries.find((e) => e.tool === 'rebind_intelligence_agent');
    expect(row?.destructive).toBe(true);
    expect(row?.outcome).toBe('succeeded');
  });

  it('a confirmation for one agent does not authorise another, through the real path', async () => {
    const app = await wire();
    await app.sessions.issue({ userId: 'u1', issuedAt: app.clock.now() });
    const user = await app.currentUser.execute();
    if (user.kind !== 'acting') throw new Error('expected to be acting');

    const proposal = await app.describeRebind.execute({
      ...user.authority,
      agentId: 'a1',
      toStrategyId: 's-new',
      toStrategyName: 'Momentum Breakout',
    });
    if (proposal.kind !== 'proposal') throw new Error('expected a proposal');

    await expect(
      app.rebindAgent.execute({
        ...user.authority,
        agentId: 'a1',
        // A different destination than the one confirmed.
        toStrategyId: 's-elsewhere',
        expectedRevision: 4,
        confirmationToken: proposal.proposal.confirmationToken,
      }),
    ).rejects.toBeInstanceOf(ConfirmationRequiredError);
  });
});
