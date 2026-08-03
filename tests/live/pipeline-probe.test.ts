import { describe, expect, it } from 'vitest';
import { McpBattleGridAdapter } from '@/infrastructure/battlegrid/mcp-adapter.js';
import { McpAgentAdapter } from '@/infrastructure/battlegrid/agent-adapter.js';
import { ReadPipelineQuery } from '@/application/use-cases/read-pipeline.query.js';
import { DeclaredScopes } from '@/domain/connection/held-scopes.js';
import { FakeAuditStore, FakeClock, FakeConfirmationStore } from '../support/fakes.js';

/**
 * The decision pipeline, read live through the product path — reads only.
 *
 *     BATTLEGRID_API_KEY=bg_live_… npx vitest run tests/live/pipeline-probe.test.ts
 *
 * Proves the three stages map against today's platform and that they stay
 * independent: the probe reports each stage's own outcome rather than
 * failing on the first one that is empty.
 */

const KEY = process.env['BATTLEGRID_API_KEY'];
const live = KEY ? describe : describe.skip;

const config = {
  clientId: '',
  mcpUrl: 'https://mcp.battlegrid.trade/mcp',
  authorizeUrl: 'https://mcp.battlegrid.trade/authorize',
  tokenUrl: 'https://mcp.battlegrid.trade/token',
  revokeUrl: 'https://mcp.battlegrid.trade/revoke',
  redirectUri: '',
};

const who = { userId: 'owner', accessToken: KEY as string };

live('the decision pipeline answers through the product path', () => {
  it('reads all three stages for a real agent', { timeout: 300_000 }, async () => {
    const clock = new FakeClock();
    const battlegrid = new McpBattleGridAdapter({
      config,
      audit: new FakeAuditStore(clock),
      confirmations: new FakeConfirmationStore(clock),
      heldScopes: new DeclaredScopes(['mcp:read']),
      remedy: 'repair-the-key',
      fetch: globalThis.fetch,
    });
    const agents = new McpAgentAdapter(battlegrid);
    const roster = await agents.listAgents(who);
    if (roster.kind !== 'agents') throw new Error(`roster ${roster.kind}`);

    const pipeline = new ReadPipelineQuery(agents);
    // The roster carries throwaway probe agents with no history at all;
    // scan until one with a pipeline turns up rather than judging the first
    // four (which found only probe leftovers on the first run).
    let sawSomething = false;
    for (const agent of roster.agents) {
      const p = await pipeline.execute({ ...who, agentId: agent.id, limit: 3 });
      const count = (s: { kind: string; entries?: readonly unknown[] }) =>
        s.kind === 'entries' ? String(s.entries?.length) : s.kind;
      // eslint-disable-next-line no-console
      console.log(
        `  ${agent.displayName}: blocks=${count(p.blocks)} evaluations=${count(p.evaluations)} decisions=${count(p.decisions)}`,
      );
      if (p.blocks.kind === 'entries') {
        sawSomething = true;
        const b = p.blocks.entries[0];
        // eslint-disable-next-line no-console
        console.log(`    block: ${b?.reasonCode} at ${b?.gateStage} — ${JSON.stringify(b?.reasonDetail)}`);
        expect(b?.reasonCode).toBeTruthy();
      }
      if (p.evaluations.kind === 'entries') {
        sawSomething = true;
        const e = p.evaluations.entries[0];
        // eslint-disable-next-line no-console
        console.log(
          `    evaluation: ${String(e?.coinTicker)} scored ${String(e?.aggregateScore)} vs ${String(e?.minAggregateScore)} → ${String(e?.terminalStatus)}`,
        );
      }
      if (p.decisions.kind === 'entries') {
        sawSomething = true;
        const d = p.decisions.entries[0];
        // eslint-disable-next-line no-console
        console.log(`    decision: ${d?.decision} ${String(d?.coinTicker)} — ${String(d?.reasoning).slice(0, 90)}…`);
        expect(d?.decision).toBeTruthy();
      }
      if (sawSomething) break;
    }
    expect(sawSomething, 'at least one agent should have pipeline history').toBe(true);
  });
});
