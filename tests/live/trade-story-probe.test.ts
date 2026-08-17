import { describe, expect, it } from 'vitest';
import { McpBattleGridAdapter } from '@/infrastructure/battlegrid/mcp-adapter.js';
import { McpAgentAdapter } from '@/infrastructure/battlegrid/agent-adapter.js';
import { ReadTradeStoryQuery } from '@/application/use-cases/read-trade-story.query.js';
import { DeclaredScopes } from '@/domain/connection/held-scopes.js';
import { FakeAuditStore, FakeClock, FakeConfirmationStore } from '../support/fakes.js';

/**
 * A settled trade's story, read live through the product path — reads only.
 *
 *     BATTLEGRID_API_KEY=bg_live_… npx vitest run tests/live/trade-story-probe.test.ts
 *
 * Finds a settled outcome, follows its evaluation id to the chart, and the
 * chart's positionId to the audit trail — the same join the page performs.
 * Asserts the shape of whatever the platform serves rather than demanding a
 * repriced stop: whether trailing acted on the newest trade is the market's
 * business, and the probe prints which branch it saw.
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

live('a settled trade tells its story through the product path', () => {
  it('reads the chart and the trail off a real outcome', { timeout: 300_000 }, async (ctx) => {
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

    const query = new ReadTradeStoryQuery(agents);
    for (const agent of roster.agents) {
      const outcomes = await agents.readTradeOutcomes({ ...who, agentId: agent.id, limit: 3 });
      if (outcomes.kind !== 'outcomes') continue;

      for (const outcome of outcomes.outcomes) {
        if (outcome.signalLogId === null) continue;
        const story = await query.execute({
          ...who,
          agentId: agent.id,
          logId: outcome.signalLogId,
        });
        // eslint-disable-next-line no-console
        console.log(`  ${agent.displayName} · ${outcome.coinTicker}: story ${story.kind}`);
        if (story.kind !== 'story') continue;

        const c = story.chart;
        // eslint-disable-next-line no-console
        console.log(
          `    chart: ${String(c.candles.length)} candles (${String(c.timeframe)}) · ` +
            `levels ${c.levels.map((l) => `${String(l.label)}@${String(l.price)}`).join(', ')} · ` +
            `markers ${c.markers.map((m) => m.role).join(', ')} · frozen ${String(c.snapshotCapturedAt)}`,
        );
        expect(c.candles.length, 'a READY chart carries its candles').toBeGreaterThan(0);
        expect(c.levels.length, 'the placed levels arrive').toBeGreaterThan(0);

        if (story.audit === null) {
          // eslint-disable-next-line no-console
          console.log('    trail: the chart named no position');
        } else if (story.audit.kind === 'events') {
          const kinds = story.audit.events.map((e) => e.kind);
          const reprices = story.audit.events.filter((e) => e.fromPrice !== null);
          // eslint-disable-next-line no-console
          console.log(`    trail: ${kinds.join(' → ')}`);
          for (const r of reprices) {
            // eslint-disable-next-line no-console
            console.log(
              `      ${String(r.kind)}: ${String(r.fromPrice)} → ${String(r.toPrice)} ` +
                `(${String(r.triggerDeltaPct)}%, ${String(r.repriceSource)}, improved=${String(r.improved)})`,
            );
            // The wire sends decimal strings; the port must not have floated them.
            expect(r.fromPrice).toMatch(/^\d+\.\d+$/);
          }
          expect(story.audit.events.length).toBeGreaterThan(0);
        } else {
          // eslint-disable-next-line no-console
          console.log(
            `    trail: ${story.audit.kind}` +
              (story.audit.kind === 'unreadable' ? ` — ${story.audit.reason}` : ''),
          );
        }
        return;
      }
    }
    // eslint-disable-next-line no-console
    console.log('  no settled outcome with an evaluation id on this account');
    ctx.skip();
  });
});
