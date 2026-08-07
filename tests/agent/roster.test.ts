import { describe, expect, it } from 'vitest';
import { ListAgentsQuery } from '@/application/use-cases/list-agents.query.js';
import { McpAgentAdapter } from '@/infrastructure/battlegrid/agent-adapter.js';
import type { BattleGridPort, ToolCallRequest } from '@/ports/battlegrid.js';
import { anAgent, FakeAgentsPort } from '../support/agent-fakes.js';

const who = { userId: 'u1', accessToken: 'at' };

/** A1 — the roster reflects the live account. */
describe('shows_live_agents', () => {
  it('returns the agents the account holds', async () => {
    const port = new FakeAgentsPort([anAgent(), anAgent({ id: 'a2', displayName: 'Momentum' })]);
    const res = await new ListAgentsQuery(port).execute(who);

    expect(res.roster.kind).toBe('agents');
    expect(res.roster.kind === 'agents' && res.roster.agents.map((a) => a.displayName)).toEqual([
      'Volatilis',
      'Momentum',
    ]);
  });

  it('carries each agent’s binding and lifecycle state', async () => {
    const port = new FakeAgentsPort([anAgent({ status: 'ARCHIVED' })]);
    const res = await new ListAgentsQuery(port).execute(who);

    const first = res.roster.kind === 'agents' ? res.roster.agents[0] : undefined;
    expect(first?.status).toBe('ARCHIVED');
    expect(first?.binding.strategyName).toBe('Volatilis — imported');
  });
});

/** A1 — an empty account is not a failure. */
describe('empty_is_not_failure', () => {
  it('reports empty as its own state', async () => {
    const res = await new ListAgentsQuery(new FakeAgentsPort()).execute(who);
    expect(res.roster.kind).toBe('empty');
  });

  it('still offers the path to create one', async () => {
    const res = await new ListAgentsQuery(new FakeAgentsPort()).execute(who);
    expect(res.creation.kind).toBe('available');
  });
});

/**
 * A1 — a roster that could not be read must never render as "you have no
 * agents". That mistake ends with a user recreating something they already own,
 * or believing their work was deleted.
 */
describe('unreadable_is_not_empty', () => {
  const broken = () => {
    const port = new FakeAgentsPort();
    port.rosterReadable = false;
    return port;
  };

  it('reports unreadable, distinctly from empty', async () => {
    const res = await new ListAgentsQuery(broken()).execute(who);
    expect(res.roster.kind).toBe('unreadable');
    expect(res.roster.kind).not.toBe('empty');
  });

  it('says why', async () => {
    const res = await new ListAgentsQuery(broken()).execute(who);
    expect(res.roster.kind === 'unreadable' && res.roster.reason).toBeTruthy();
  });

  it('offers no create action against state it could not read', async () => {
    const res = await new ListAgentsQuery(broken()).execute(who);
    expect(res.creation.kind).toBe('unknown');
    expect(res.creation.kind).not.toBe('available');
  });
});

/**
 * The one value the two agent reads disagree on, held at the adapter.
 *
 * Both tools return the same thirty keys; for the same agent at the same
 * moment the list said `last24hCostUsd: 0.09022839` and the detail said `0`,
 * stably. The adapter reads spend from the list and leaves the detail's copy
 * unread — asserted against the real adapter over a stub transport, because
 * the mapper split is exactly the kind of decision a refactor merges back
 * together. See `the-cost-of-an-agent-reads-differently-from-two-tools`.
 */
describe('spend_comes_off_the_list', () => {
  /** The observed divergence: one row, served to whichever tool asks. */
  const row = { id: 'a1', revision: 1, displayName: 'THE .0', last24hCostUsd: 0.09022839 };

  function adapterOver(respond: (req: ToolCallRequest) => unknown) {
    const battlegrid: BattleGridPort = {
      buildAuthorizationUrl: () => '',
      exchangeCode: async () => {
        throw new Error('unused');
      },
      refresh: async () => {
        throw new Error('unused');
      },
      revoke: async () => {},
      discoverTools: async () => [],
      callTool: async (request) => ({
        content: respond(request),
        classification: {
          mutating: false,
          destructive: false,
          requiredScope: 'mcp:read',
          basis: 'annotations',
        },
        auditEntryId: 'audit-1',
      }),
    };
    return new McpAgentAdapter(battlegrid);
  }

  it('the roster read carries the figure', async () => {
    const adapter = adapterOver(() => ({ agents: [row] }));
    const roster = await adapter.listAgents(who);
    expect(roster.kind).toBe('agents');
    expect(roster.kind === 'agents' && roster.agents[0]?.last24hCostUsd).toBe(0.09022839);
  });

  it('the detail read leaves it null, even when the payload offers a number', async () => {
    // Live, the detail offers 0 where the list offers $0.09. Null rather than
    // the payload's value is the adapter refusing to repeat the copy it
    // cannot trust — an agent that is spending money must not read as one
    // that is not.
    const adapter = adapterOver(() => ({ agent: row }));
    const agent = await adapter.getAgent({ ...who, agentId: 'a1' });
    expect(agent.last24hCostUsd).toBeNull();
    // And the name rides both reads — the two tools agree on it.
    expect(agent.displayName).toBe('THE .0');
  });
});
