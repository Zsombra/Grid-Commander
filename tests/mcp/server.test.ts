import { describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { buildServer } from '@/mcp/server.js';
import { TOOLS } from '@/mcp/tools.js';
import type { App } from '@/composition.js';
import { anAgent, FakeAgentsPort } from '../support/agent-fakes.js';
import { actingWith, RenderRadarPort } from '../rendering/support/fake-acting.js';

/**
 * The MCP server, driven through a real client over a real transport.
 *
 * Not a unit test of the handlers: an in-memory pair of the SDK's own
 * transport, so what is asserted is what a model actually receives —
 * schemas, annotations, and the exact text of a refusal.
 *
 * The property that matters most is the last one. Every read in this
 * product distinguishes "nothing exists" from "we could not ask", and a
 * boundary that collapses them hands a model the material to tell an
 * operator they have no agents when in fact BattleGrid did not answer.
 */

const AGENT = anAgent();

async function connected(app: App) {
  const server = buildServer({
    app,
    authority: { userId: 'owner', accessToken: 'tok' },
  });
  const client = new Client({ name: 'test', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

/** The same fakes the rendering tests use, so tools exercise real use-cases. */
function world(agents = new FakeAgentsPort([AGENT])) {
  return { app: actingWith({ agents }).app as unknown as App, agents };
}

const text = (result: unknown): string =>
  ((result as { content: { text: string }[] }).content[0]?.text ?? '');

describe('the MCP server, over a real client', () => {
  it('offers the read surface with schemas a model can use', async () => {
    const client = await connected(world().app);
    const { tools } = await client.listTools();

    expect(tools.length).toBe(TOOLS.length);
    const roster = tools.find((t) => t.name === 'list_agents');
    expect(roster?.description).toContain('unreadable');

    const pipeline = tools.find((t) => t.name === 'read_decision_pipeline');
    expect(pipeline?.inputSchema.required).toEqual(['agentId']);
    expect(pipeline?.inputSchema.properties).toHaveProperty('agentId');
  });

  it('declares each tool by what it actually does', async () => {
    /**
     * This read "every tool read-only, without exception", and that claim
     * stopped being true when `propose_agent_change` shipped: recording a
     * proposal writes a row to this product's store. Nothing reaches
     * BattleGrid — but `readOnlyHint` says "does not modify its environment",
     * and a client using it to decide what needs the operator's approval would
     * have been reading a false one.
     *
     * Which tools may claim it is derived in `annotations.test.ts` from the
     * composition root, so this is the client-side half: what a real client
     * receives over a real transport.
     */
    const client = await connected(world().app);
    const { tools } = await client.listTools();
    for (const t of tools) {
      const writes = TOOLS.find((d) => d.name === t.name)?.writes === true;
      expect(t.annotations?.readOnlyHint, t.name).toBe(!writes);
      // Nothing on this surface destroys anything, in either direction: the
      // reads cannot, and a proposal is additive with declining as its undo.
      expect(t.annotations?.destructiveHint, t.name).toBe(false);
    }
    // Guards the guard: a surface that lost its one writing tool would make
    // the loop above a re-statement of the old, weaker claim.
    expect(
      tools.filter((t) => t.annotations?.readOnlyHint === false).map((t) => t.name),
      'the surface still carries the tool that records',
    ).toEqual(['propose_agent_change']);
  });

  it('answers a real read through the real use-case', async () => {
    const client = await connected(world().app);
    const result = await client.callTool({ name: 'list_agents', arguments: {} });
    // The use-case's own shape, not the port's: it wraps the roster with a
    // verdict on whether creating another agent is even possible. A model
    // gets that reasoning for free rather than re-deriving it from slots.
    const payload = JSON.parse(text(result)) as {
      roster: { kind: string; agents: { id: string }[] };
      creation: { kind: string };
    };
    expect(payload.roster.kind).toBe('agents');
    expect(payload.roster.agents[0]?.id).toBe(AGENT.id);
    expect(payload.creation.kind).toBeTruthy();
  });

  it('passes a refusal through as a refusal, not a tool failure', async () => {
    const { app, agents } = world();
    agents.rosterReadable = false;
    const client = await connected(app);
    const result = await client.callTool({ name: 'list_agents', arguments: {} });

    // The single most important assertion on this surface. If this came
    // back as `isError`, a model would very often paraphrase it to the
    // operator as "you have no agents".
    expect((result as { isError?: boolean }).isError).toBeFalsy();
    const payload = JSON.parse(text(result)) as {
      roster: { kind: string; reason: string };
      creation: { kind: string };
    };
    expect(payload.roster.kind).toBe('unreadable');
    expect(payload.roster.reason).toBeTruthy();
    // And capacity stays unknown rather than being reported as at-capacity.
    expect(payload.creation.kind).toBe('unknown');
  });

  it('keeps “nothing exists” distinguishable from “could not ask”', async () => {
    const empty = world(new FakeAgentsPort([]));
    const client = await connected(empty.app);
    const payload = JSON.parse(
      text(await client.callTool({ name: 'list_agents', arguments: {} })),
    ) as { roster: { kind: string } };
    expect(payload.roster.kind).toBe('empty');
    expect(payload.roster.kind).not.toBe('unreadable');
  });

  it('refuses a call missing a required argument', async () => {
    const client = await connected(world().app);
    const result = await client.callTool({ name: 'read_decision_pipeline', arguments: {} });
    expect((result as { isError?: boolean }).isError).toBe(true);
    expect(text(result)).toContain('agentId');
  });

  it('refuses a tool it does not have', async () => {
    const client = await connected(world().app);
    const result = await client.callTool({ name: 'archive_agent', arguments: {} });
    expect((result as { isError?: boolean }).isError).toBe(true);
    expect(text(result)).toContain('No such tool');
  });

  it('reports a use-case that throws as an error, not as an answer', async () => {
    const { app, agents } = world();
    agents.readBudget = async () => {
      throw new Error('the product broke');
    };
    const client = await connected(app);
    const result = await client.callTool({
      name: 'read_agent_limits',
      arguments: { agentId: AGENT.id },
    });
    // This product failing is not the platform refusing. A model must not
    // narrate it as a finding about the agent.
    expect((result as { isError?: boolean }).isError).toBe(true);
    expect(text(result)).toContain('the product broke');
  });

  /**
   * The model's surface has no page to have read the roster on, so the tool
   * reads it: a radar slot looks the same whether the agent in it is active or
   * archived, and answering "where is this agent scanning" from the radar
   * alone is what put "On duty: scanning SP500" on an archived agent's page.
   */
  describe('read_deployments joins the lifecycle', () => {
    const sp500 = {
      policyId: 'p1',
      coinTicker: 'SP500',
      revision: 4,
      timeframe: '15m',
      enabled: true,
      slotAgentIds: [AGENT.id],
      onDutyAgentId: AGENT.id,
      openPositionAgentId: null,
      resolution: null,
    };

    function radarWorld(agents: FakeAgentsPort) {
      const radar = new RenderRadarPort();
      radar.result = { kind: 'deployments', deployments: [sp500] };
      return { app: actingWith({ agents, radar }).app as unknown as App, agents };
    }

    it('reports an archived agent as holding its slot, and the market as unscanned', async () => {
      const archived = new FakeAgentsPort([anAgent({ status: 'ARCHIVED' })]);
      const client = await connected(radarWorld(archived).app);
      const payload = JSON.parse(
        text(await client.callTool({ name: 'read_deployments', arguments: { agentId: AGENT.id } })),
      ) as { kind: string; deployments: { standing: string; occupancy: string }[] };

      expect(payload.kind).toBe('deployed');
      expect(payload.deployments[0]?.standing).toBe('slot-held-not-scanning');
      expect(payload.deployments[0]?.occupancy).toBe('no-active-agent');
    });

    it('leaves an active agent reading exactly as it did', async () => {
      const client = await connected(radarWorld(new FakeAgentsPort([AGENT])).app);
      const payload = JSON.parse(
        text(await client.callTool({ name: 'read_deployments', arguments: { agentId: AGENT.id } })),
      ) as { deployments: { standing: string }[] };
      expect(payload.deployments[0]?.standing).toBe('on-duty');
    });

    it('will not answer at all when the lifecycle could not be read', async () => {
      // Standing computed against a lifecycle nobody read is the defect, not
      // the fallback. The refusal names which half is missing.
      const agents = new FakeAgentsPort([AGENT]);
      agents.rosterReadable = false;
      const client = await connected(radarWorld(agents).app);
      const payload = JSON.parse(
        text(await client.callTool({ name: 'read_deployments', arguments: { agentId: AGENT.id } })),
      ) as { kind: string; reason: string };
      expect(payload.kind).toBe('unreadable');
      expect(payload.reason).toContain('lifecycle');
    });

    it('says an unknown id is unknown rather than dressing it as a failed read', async () => {
      const client = await connected(radarWorld(new FakeAgentsPort([AGENT])).app);
      const payload = JSON.parse(
        text(await client.callTool({ name: 'read_deployments', arguments: { agentId: 'ghost' } })),
      ) as { kind: string; agentId: string };
      expect(payload.kind).toBe('no-such-agent');
      expect(payload.agentId).toBe('ghost');
    });
  });

  it('tells the model it cannot change anything', async () => {
    const client = await connected(world().app);
    const instructions = client.getInstructions();
    expect(instructions).toMatch(/read-only/i);
    expect(instructions).toMatch(/web app/i);
    // And why its answers are worth preferring over BattleGrid's own.
    expect(instructions).toMatch(/derive/i);
  });
});
