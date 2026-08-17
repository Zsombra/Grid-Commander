import { describe, expect, it } from 'vitest';
import { McpAgentAdapter } from '@/infrastructure/battlegrid/agent-adapter.js';
import { ReadFleetSpendQuery } from '@/application/use-cases/read-fleet-spend.query.js';
import type { BattleGridPort, ToolCallRequest } from '@/ports/battlegrid.js';
import { FakeAgentsPort } from '../support/agent-fakes.js';

/**
 * The platform's own fleet total, read and never rivalled.
 *
 * The fixture values mirror the live read of 2026-08-11 (#129): a $1.34 total
 * across 3 active agents, at the moment the meter's recovery was measured.
 */

const who = { userId: 'owner', accessToken: 'tok' };

const answers = (content: unknown): BattleGridPort =>
  ({
    callTool: async (_req: ToolCallRequest) => ({ content }),
  }) as unknown as BattleGridPort;

describe('the hub summary, mapped', () => {
  it('carries the total and the active count', async () => {
    const adapter = new McpAgentAdapter(answers({ summary: { totalCost24hUsd: 1.34, activeAgents: 3 } }));
    expect(await adapter.readFleetSpend(who)).toEqual({
      kind: 'spend',
      totalCost24hUsd: 1.34,
      activeAgents: 3,
    });
  });

  it('carries a missing figure as null, never as zero', async () => {
    // Zero is a spend; null is the absence of one. The distinction the whole
    // spend saga (#96) turned on.
    const adapter = new McpAgentAdapter(answers({ summary: { activeAgents: 3 } }));
    const result = await adapter.readFleetSpend(who);
    expect(result).toEqual({ kind: 'spend', totalCost24hUsd: null, activeAgents: 3 });
  });

  it('reads an answer without a summary as unreadable, not as a fleet that spent nothing', async () => {
    const adapter = new McpAgentAdapter(answers({ rows: [] }));
    const result = await adapter.readFleetSpend(who);
    expect(result.kind).toBe('unreadable');
  });
});

describe('the query passes the platform’s answer through', () => {
  it('answers with the total', async () => {
    const agents = new FakeAgentsPort([]);
    const result = await new ReadFleetSpendQuery(agents).execute(who);
    expect(result).toEqual({ kind: 'spend', totalCost24hUsd: 1.34, activeAgents: 3 });
  });

  it('passes an unreadable through with its cause', async () => {
    const agents = new FakeAgentsPort([]);
    agents.fleetSpend = { kind: 'unreadable', reason: 'BattleGrid did not respond', cause: 'unreachable' };
    const result = await new ReadFleetSpendQuery(agents).execute(who);
    expect(result).toEqual({ kind: 'unreadable', reason: 'BattleGrid did not respond', cause: 'unreachable' });
  });
});
