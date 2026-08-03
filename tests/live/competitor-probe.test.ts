import { describe, expect, it } from 'vitest';
import { McpBattleGridAdapter } from '@/infrastructure/battlegrid/mcp-adapter.js';
import { McpExplorerAdapter } from '@/infrastructure/battlegrid/explorer-adapter.js';
import { ReadCompetitorQuery } from '@/application/use-cases/read-competitor.query.js';
import { ReadFieldQuery } from '@/application/use-cases/read-field.query.js';
import { DeclaredScopes } from '@/domain/connection/held-scopes.js';
import { FakeAuditStore, FakeClock, FakeConfirmationStore } from '../support/fakes.js';

/**
 * One competitor's public record, read live through the product path.
 *
 *     BATTLEGRID_API_KEY=bg_live_… npx vitest run tests/live/competitor-probe.test.ts
 *
 * The competitor is taken from the field rather than hard-coded, so the
 * probe keeps working as the leaderboard changes — and so it proves the
 * thing that matters: that a row in `/explorer` opens.
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

live('a competitor answers through the product path', () => {
  it('opens the top agent in the field', { timeout: 300_000 }, async () => {
    const clock = new FakeClock();
    const battlegrid = new McpBattleGridAdapter({
      config,
      audit: new FakeAuditStore(clock),
      confirmations: new FakeConfirmationStore(clock),
      heldScopes: new DeclaredScopes(['mcp:read']),
      remedy: 'repair-the-key',
      fetch: globalThis.fetch,
    });
    const explorer = new McpExplorerAdapter(battlegrid);

    const view = await new ReadFieldQuery(explorer).execute({
      ...who,
      timeframe: 'ALL_TIME',
      sortBy: 'NET_PNL',
      limit: 100,
    });
    if (view.field.kind !== 'field') throw new Error(`field ${view.field.reason}`);
    // Someone else's agent, not one of ours — this is the public read.
    const own = new Set(view.field.field.ownAgents.map((a) => a.agentId));
    const rival = view.field.field.agents.find((a) => !own.has(a.agentId));
    if (!rival) throw new Error('the field listed no agent belonging to someone else');

    // eslint-disable-next-line no-console
    console.log(`  opening #${String(rival.rank)} ${rival.agentName} (${String(rival.ownerDisplayName)})`);

    const c = await new ReadCompetitorQuery(explorer).execute({
      ...who,
      agentId: rival.agentId,
      limit: 5,
    });

    const state = (r: { kind: string }) => r.kind;
    // eslint-disable-next-line no-console
    console.log(
      `  funnel=${state(c.funnel)} open=${state(c.open)} trades=${state(c.trades)} evaluations=${state(c.evaluations)}`,
    );

    if (c.funnel.kind === 'value') {
      const f = c.funnel.value;
      // eslint-disable-next-line no-console
      console.log(
        `    ${String(f.totalEvaluations)} evaluations → ${String(f.totalDecisions)} decisions → ` +
          `${String(f.enterDecisions)} entered → ${String(f.executed)} executed ` +
          `(${String(f.failed)} failed, ${String(f.expired)} expired)`,
      );
      // eslint-disable-next-line no-console
      console.log(
        `    fill ${String(f.fillRatePercent)}% · avg score ${String(f.avgAggregateScorePercent)}% · ` +
          `${String(f.winCount)}W/${String(f.lossCount)}L · net ${String(f.totalNetPnl?.toFixed(2))}`,
      );
      // The two counters the mapper exists to keep apart.
      // eslint-disable-next-line no-console
      console.log(
        `    skip decisions=${String(f.skipDecisions)} vs SKIPPED terminal=${String(f.skippedTerminal)}`,
      );
      expect(f.totalEvaluations, 'a ranked agent has evaluated something').not.toBeNull();
    }

    if (c.trades.kind === 'value') {
      const t = c.trades.value[0];
      // eslint-disable-next-line no-console
      console.log(
        `    trade: ${String(t?.coinTicker)} ${String(t?.direction)} ${String(t?.netPnl?.toFixed(4))} ` +
          `isWin=${String(t?.isWin)} ${String(t?.closeReason)} (${String(c.trades.total)} total)`,
      );
      // The flag is the platform's, and the surface prints it rather than
      // re-deriving a verdict from the figure.
      expect(t?.isWin === null || typeof t?.isWin === 'boolean').toBe(true);
    }

    if (c.evaluations.kind === 'value') {
      const e = c.evaluations.value[0];
      // eslint-disable-next-line no-console
      console.log(
        `    evaluation: ${String(e?.coinTicker)} ${String(e?.aggregateScorePercent)}% vs ` +
          `${String(e?.minAggregateScorePercent)}% → ${String(e?.terminalStatus)} via ${String(e?.signalSource)}`,
      );
    }

    if (c.open.kind === 'value') {
      // eslint-disable-next-line no-console
      console.log(
        `    holding: ${String(c.open.value.openPositionCount)} position(s), ` +
          `${String(c.open.value.unrealizedPnl)} unrealized` +
          (c.open.value.positionsUnmodelled.length > 0
            ? '  ← a live position exists: its row shape can now be observed, see open-position-rows-are-unobserved'
            : ''),
      );
    }
  });
});
