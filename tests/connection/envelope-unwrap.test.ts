import { describe, expect, it } from 'vitest';
import {
  McpBattleGridAdapter,
  ToolRefusedError,
  UnreadableEnvelopeError,
} from '@/infrastructure/battlegrid/mcp-adapter.js';
import { McpAgentAdapter } from '@/infrastructure/battlegrid/agent-adapter.js';
import { ConnectionScopes } from '@/infrastructure/battlegrid/connection-scopes.js';
import {
  FakeAuditStore,
  FakeClock,
  FakeConfirmationStore,
  FakeConnectionStore,
} from '../support/fakes.js';

/**
 * The seam that was missing for the whole life of this product.
 *
 * `tools/call` answers with an MCP envelope — the payload lives inside
 * `content[].text` as a JSON string, and again in `structuredContent`. Both
 * adapters handed the *envelope* to their mappers, which looked for `agents` on
 * a value whose only keys were `content` and `structuredContent`, found nothing,
 * and reported an account with no agents.
 *
 * A live account holding two agents rendered as "This BattleGrid account has no
 * agents yet." Nothing caught it because every fake in the suite returned the
 * payload already unwrapped — modelling a wire format that does not exist.
 *
 * The roster's three-state design exists precisely to stop a user being told
 * they own nothing when the read failed. The branch was right. The data never
 * arrived, one layer below where anyone was looking.
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

/** Two agents and a rank, in the shape the live platform returns them. */
const LIVE_ROSTER = {
  agents: [
    {
      id: '26a60e91-6b5c-4a64-8138-04705ec2cf80',
      revision: 4,
      displayName: 'THE .0',
      status: 'ACTIVE',
      strategyId: '24c34a09-15d5-4d20-8951-397398024976',
      strategyName: 'Midway',
      strategyRevision: 2,
      bindingState: 'BOUND',
      brainPreset: 'CUSTOM',
      capabilities: { canEdit: true, canDelete: true, canArchive: true, canEditOverlay: true },
    },
    {
      id: 'b7c1f0e2-0000-4000-8000-000000000002',
      revision: 2,
      displayName: 'Volatilis',
      status: 'ACTIVE',
      strategyId: '3c17584c-ede7-4aca-ba02-045489868a25',
      strategyName: 'Dunkirk',
      strategyRevision: 2,
      bindingState: 'BOUND',
      brainPreset: 'CUSTOM',
      capabilities: { canEdit: true, canDelete: true, canArchive: true, canEditOverlay: true },
    },
  ],
  slotUsage: {
    level: 3,
    rank: { name: 'RECRUIT', tier: 3, displayName: 'Recruit III' },
    limit: 3,
    used: 2,
    remaining: 1,
  },
};

/** A server whose `tools/call` returns exactly the envelope given. */
function serverReturning(envelope: unknown): typeof globalThis.fetch {
  return (async (_u: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? '{}')) as { method?: string };
    const result =
      body.method === 'tools/list'
        ? { tools: [{ name: TOOL, description: 'List agents', annotations: { readOnlyHint: true } }] }
        : envelope;
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof globalThis.fetch;
}

async function wire(envelope: unknown) {
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
  const audit = new FakeAuditStore(clock);
  const battlegrid = new McpBattleGridAdapter({
    config,
    audit,
    confirmations: new FakeConfirmationStore(clock),
    heldScopes: new ConnectionScopes(connections),
    remedy: 'reconnect',
    fetch: serverReturning(envelope),
  });
  return { battlegrid, audit, agents: new McpAgentAdapter(battlegrid) };
}

const who = { userId: 'u1', accessToken: 'at' };
const call = (b: McpBattleGridAdapter) => b.callTool({ ...who, tool: TOOL, args: {} });

const asText = (payload: unknown) => ({ content: [{ type: 'text', text: JSON.stringify(payload) }] });
const asStructured = (payload: unknown) => ({ structuredContent: payload });
const asBoth = (payload: unknown) => ({ ...asText(payload), ...asStructured(payload) });

describe('the payload comes out of the envelope', () => {
  it('reads structuredContent', async () => {
    const { battlegrid } = await wire(asStructured(LIVE_ROSTER));
    expect((await call(battlegrid)).content).toEqual(LIVE_ROSTER);
  });

  it('reads the JSON in a text block when structuredContent is absent', async () => {
    // Relying on one field the server is free to omit is what this whole change
    // exists to stop repeating.
    const { battlegrid } = await wire(asText(LIVE_ROSTER));
    expect((await call(battlegrid)).content).toEqual(LIVE_ROSTER);
  });

  it('gives the same answer from either encoding', async () => {
    const [a, b] = await Promise.all([wire(asText(LIVE_ROSTER)), wire(asStructured(LIVE_ROSTER))]);
    expect((await call(a.battlegrid)).content).toEqual((await call(b.battlegrid)).content);
  });

  it('joins multiple text blocks before parsing', async () => {
    const json = JSON.stringify(LIVE_ROSTER);
    const split = {
      content: [
        { type: 'text', text: json.slice(0, 20) },
        { type: 'text', text: json.slice(20) },
      ],
    };
    const { battlegrid } = await wire(split);
    expect((await call(battlegrid)).content).toEqual(LIVE_ROSTER);
  });

  it('never hands the envelope on', async () => {
    // The defect, stated as a property: whatever comes back must not still be
    // wrapped. Every mapper downstream reads fields off this value.
    const { battlegrid } = await wire(asBoth(LIVE_ROSTER));
    const { content } = await call(battlegrid);
    expect(Object.keys(content as object)).not.toContain('content');
    expect(Object.keys(content as object)).not.toContain('structuredContent');
  });
});

describe('the regression, stated directly', () => {
  it('renders two agents as two agents, never as an empty account', async () => {
    // This is the bug. A live account with two agents said "no agents yet".
    const { agents } = await wire(asBoth(LIVE_ROSTER));
    const roster = await agents.listAgents(who);

    expect(roster.kind).toBe('agents');
    expect(roster.kind === 'agents' && roster.agents.map((a) => a.displayName)).toEqual([
      'THE .0',
      'Volatilis',
    ]);
  });

  it('carries the binding each agent actually has', async () => {
    const { agents } = await wire(asBoth(LIVE_ROSTER));
    const roster = await agents.listAgents(who);
    const first = roster.kind === 'agents' ? roster.agents[0] : undefined;
    expect(first?.binding.strategyName).toBe('Midway');
    expect(first?.binding.strategyRevision).toBe(2);
  });

  it('carries the capacity, so the create affordance is not "unknown"', async () => {
    // With the envelope unread, slotUsage was absent and creation resolved to
    // `unknown` — which renders nothing at all, so the account looked as though
    // it could not create an agent either.
    const { agents } = await wire(asBoth(LIVE_ROSTER));
    const roster = await agents.listAgents(who);
    expect(roster.kind === 'agents' && roster.slots?.remaining).toBe(1);
  });
});

describe('an envelope with no readable payload is a failure, not an empty result', () => {
  it('throws rather than returning an empty object', async () => {
    // The whole lesson. Returning `{}` is what turned a broken integration into
    // a confident statement about someone's account.
    const { battlegrid } = await wire({ content: [] });
    await expect(call(battlegrid)).rejects.toBeInstanceOf(UnreadableEnvelopeError);
  });

  it('throws when the text block is not JSON', async () => {
    const { battlegrid } = await wire({ content: [{ type: 'text', text: 'not json at all' }] });
    await expect(call(battlegrid)).rejects.toBeInstanceOf(UnreadableEnvelopeError);
  });

  it('throws when the payload is a bare string rather than an object', async () => {
    const { battlegrid } = await wire({ content: [{ type: 'text', text: '"just a string"' }] });
    await expect(call(battlegrid)).rejects.toBeInstanceOf(UnreadableEnvelopeError);
  });

  it('surfaces to the user as unreadable, not as an empty roster', async () => {
    // The distinction the roster's three states exist to preserve, now held at
    // the layer that was quietly breaking it.
    const { agents } = await wire({ content: [] });
    const roster = await agents.listAgents(who);
    expect(roster.kind).toBe('unreadable');
  });

  it('is classified unreachable — the platform answered, but not with an answer', async () => {
    const { agents } = await wire({ content: [] });
    const roster = await agents.listAgents(who);
    expect(roster.kind === 'unreadable' && roster.cause).toBe('unreachable');
  });
});

describe('a tool that refused is a failed call', () => {
  const REFUSAL = {
    content: [{ type: 'text', text: 'MCP error -32602: Input validation error: Invalid UUID format' }],
    isError: true,
  };

  it('throws rather than returning a payload', async () => {
    // A refused tool answers over a healthy transport — HTTP 200, well-formed
    // JSON-RPC `result`. Reading only the transport makes every refusal look
    // like an operation that ran and changed nothing.
    const { battlegrid } = await wire(REFUSAL);
    await expect(call(battlegrid)).rejects.toBeInstanceOf(ToolRefusedError);
  });

  it('carries what the platform said about it', async () => {
    const { battlegrid } = await wire(REFUSAL);
    const err: unknown = await call(battlegrid).catch((e: unknown) => e);
    expect((err as Error).message).toContain('Invalid UUID format');
  });

  it('records the attempt as failed, not as succeeded', async () => {
    // Before this, a refused write was indistinguishable in the record from a
    // write that ran and did nothing.
    const { battlegrid, audit } = await wire(REFUSAL);
    await call(battlegrid).catch(() => undefined);
    expect(audit.entries[0]?.outcome).toBe('failed');
  });

  it('does not mistake a successful call for a refusal', async () => {
    const { battlegrid, audit } = await wire(asBoth(LIVE_ROSTER));
    await call(battlegrid);
    expect(audit.entries[0]?.outcome).toBe('succeeded');
  });
});

describe('nothing outside the MCP adapter knows the envelope exists', () => {
  it('keeps the wire format in the one file permitted to know MCP', async () => {
    const { readFileSync, readdirSync, statSync } = await import('node:fs');
    const { join } = await import('node:path');

    const walk = (dir: string, out: string[] = []): string[] => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) walk(full, out);
        else if (/\.tsx?$/.test(full)) out.push(full);
      }
      return out;
    };

    const offenders = walk('src')
      .filter((f) => !f.endsWith('mcp-adapter.ts'))
      .filter((f) => /structuredContent/.test(readFileSync(f, 'utf8')));

    expect(offenders, 'these know about the MCP envelope and should not').toEqual([]);
  });
});
