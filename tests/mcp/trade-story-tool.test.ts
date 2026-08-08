import { describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { buildServer } from '@/mcp/server.js';
import type { App } from '@/composition.js';
import { actingWith } from '../rendering/support/fake-acting.js';
import { aTradeChart, anAuditEvent, FakeAgentsPort } from '../support/agent-fakes.js';

/**
 * The trade story, crossed to a model.
 *
 * What this boundary must not blur: the platform's three non-answers. A
 * model told "no such trade" when the read failed will conclude a trade it
 * was just shown does not exist; one told a trail is empty when the chart
 * named no position will report position management as idle. Each state
 * crosses as itself, as data, never as a tool error.
 */

async function connected(agents: FakeAgentsPort) {
  const server = buildServer({
    app: actingWith({ agents }).app as unknown as App,
    authority: { userId: 'owner', accessToken: 'tok' },
  });
  const client = new Client({ name: 'test', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

const text = (result: unknown): string =>
  ((result as { content: { text: string }[] }).content[0]?.text ?? '');

async function story(agents: FakeAgentsPort): Promise<{
  parsed: Record<string, unknown>;
  isError: boolean;
}> {
  const client = await connected(agents);
  const result = await client.callTool({
    name: 'read_trade_story',
    arguments: { agentId: 'a1', logId: 'l1' },
  });
  return {
    parsed: JSON.parse(text(result)) as Record<string, unknown>,
    isError: (result as { isError?: boolean }).isError === true,
  };
}

describe('a model reads a trade story', () => {
  it('receives the chart and the trail with prices as the strings sent', async () => {
    const agents = new FakeAgentsPort();
    agents.tradeChart = { kind: 'chart', chart: aTradeChart() };
    agents.positionAudit = { kind: 'events', events: [anAuditEvent()] };

    const { parsed, isError } = await story(agents);
    expect(isError).toBe(false);
    expect(parsed['kind']).toBe('story');

    const chart = parsed['chart'] as {
      levels: { role: string; label: string }[];
      candles: unknown[];
    };
    expect(chart.candles).toHaveLength(2);
    expect(chart.levels[0]?.label).toBe('Stop Loss');

    const audit = parsed['audit'] as { kind: string; events: { fromPrice: string }[] };
    expect(audit.kind).toBe('events');
    // The decimal string, not a re-parsed float: '0.13682960' keeps its zero.
    expect(audit.events[0]?.fromPrice).toBe('0.13682960');
  });

  it('keeps never-filled, not-found and unreadable apart, all as data', async () => {
    const noTrade = new FakeAgentsPort();
    noTrade.tradeChart = { kind: 'no-trade' };
    const a = await story(noTrade);
    expect(a.isError).toBe(false);
    expect(a.parsed['kind']).toBe('no-trade');

    const notFound = new FakeAgentsPort();
    notFound.tradeChart = { kind: 'not-found' };
    const b = await story(notFound);
    expect(b.isError).toBe(false);
    expect(b.parsed['kind']).toBe('not-found');

    const failing = new FakeAgentsPort();
    failing.tradeChart = {
      kind: 'unreadable',
      reason: 'BattleGrid did not respond',
      cause: 'unreachable',
    };
    const c = await story(failing);
    expect(c.isError).toBe(false);
    expect(c.parsed['kind']).toBe('unreadable');
    expect(c.parsed['reason']).toBe('BattleGrid did not respond');
  });

  it('a trail with no address crosses as null, not as empty', async () => {
    const agents = new FakeAgentsPort();
    agents.tradeChart = { kind: 'chart', chart: aTradeChart({ positionId: null }) };

    const { parsed } = await story(agents);
    expect(parsed['kind']).toBe('story');
    expect(parsed['audit']).toBeNull();
  });
});
