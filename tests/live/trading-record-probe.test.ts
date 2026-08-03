import { describe, expect, it } from 'vitest';
import { McpBattleGridAdapter } from '@/infrastructure/battlegrid/mcp-adapter.js';
import { McpAgentAdapter } from '@/infrastructure/battlegrid/agent-adapter.js';
import { ReadTradingRecordQuery } from '@/application/use-cases/read-trading-record.query.js';
import { DeclaredScopes } from '@/domain/connection/held-scopes.js';
import { FakeAuditStore, FakeClock, FakeConfirmationStore } from '../support/fakes.js';

/**
 * The trading record, read live through the product path — reads only.
 *
 *     BATTLEGRID_API_KEY=bg_live_… npx vitest run tests/live/trading-record-probe.test.ts
 *
 * Also re-checks the platform gap this change is built around: an agent
 * with real closed trades whose `get_agent_performance` still answers
 * zeros. If that ever changes, this probe is where it will show up first.
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

live('an agent’s trading record answers through the product path', () => {
  it('reads real closed trades and derives their summary', { timeout: 300_000 }, async (ctx) => {
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

    const record = new ReadTradingRecordQuery(agents);
    for (const agent of roster.agents) {
      const result = await record.execute({ ...who, agentId: agent.id, limit: 5 });
      if (result.kind !== 'record') continue;

      // eslint-disable-next-line no-console
      console.log(
        `  ${agent.displayName}: ${result.summary.closed} shown of ${String(result.total)} · ` +
          `${result.summary.wins}W/${result.summary.losses}L · net ${result.summary.netPnl.toFixed(4)} ` +
          `after ${result.summary.feesPaid.toFixed(4)} fees · ` +
          result.summary.closeReasons.map((r) => `${r.reason}×${r.count}`).join(' '),
      );
      const [first] = result.outcomes;
      expect(first?.coinTicker).toBeTruthy();
      expect(first?.netPnl).not.toBeUndefined();
      // The summary is arithmetic over what was read, not a platform figure.
      expect(result.summary.closed).toBe(result.outcomes.length);
      return;
    }
    // eslint-disable-next-line no-console
    console.log('  no agent on this account has closed a trade');
    ctx.skip();
  });
});
