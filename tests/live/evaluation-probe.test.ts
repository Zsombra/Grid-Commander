import { describe, expect, it } from 'vitest';
import { McpBattleGridAdapter } from '@/infrastructure/battlegrid/mcp-adapter.js';
import { McpExplorerAdapter } from '@/infrastructure/battlegrid/explorer-adapter.js';
import { ReadEvaluationQuery } from '@/application/use-cases/read-evaluation.query.js';
import { DeclaredScopes } from '@/domain/connection/held-scopes.js';
import { FakeAuditStore, FakeClock, FakeConfirmationStore } from '../support/fakes.js';

/**
 * One evaluation's scorecard, read live through the product path.
 *
 *     BATTLEGRID_API_KEY=bg_live_… npx vitest run tests/live/evaluation-probe.test.ts
 *
 * Walks the same path a reader does — field → competitor → evaluation —
 * and watches the behaviour the surface is built around: some listed
 * evaluations publish no detail. On 2026-08-03 that was 4 of 20, every one
 * of them `FAILED`. The probe **reports** the split rather than asserting
 * it: a correlation over twenty rows is a pattern, not a contract, and the
 * page is built to survive either answer.
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

live('an evaluation answers through the product path', () => {
  it('reads a real scorecard, dismissed signals and all', { timeout: 300_000 }, async () => {
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

    const field = await explorer.readField({
      ...who,
      timeframe: 'ALL_TIME',
      sortBy: 'NET_PNL',
      limit: 100,
    });
    if (field.kind !== 'field') throw new Error(`field ${field.reason}`);
    const own = new Set(field.field.ownAgents.map((a) => a.agentId));
    const rival = field.field.agents.find((a) => !own.has(a.agentId));
    if (!rival) throw new Error('the field listed no agent belonging to someone else');

    const listed = await explorer.readCompetitorEvaluations({
      ...who,
      agentId: rival.agentId,
      limit: 10,
    });
    if (listed.kind !== 'value') throw new Error(`evaluations ${listed.kind}`);

    // eslint-disable-next-line no-console
    console.log(`  ${rival.agentName}: ${listed.value.length} evaluations listed`);

    const query = new ReadEvaluationQuery(explorer);
    let published = 0;
    let unpublished = 0;
    let deepest: { coin: string; consulted: number; fired: number } | null = null;

    for (const e of listed.value) {
      const detail = await query.execute({ ...who, agentId: rival.agentId, logId: e.id });
      if (detail.kind === 'none') {
        unpublished += 1;
        // eslint-disable-next-line no-console
        console.log(`    ${String(e.coinTicker).padEnd(9)} ${String(e.terminalStatus).padEnd(9)} no detail published`);
        continue;
      }
      if (detail.kind === 'unreadable') throw new Error(`detail unreadable: ${detail.reason}`);
      published += 1;
      const fired = detail.value.signals.filter((s) => s.triggered).length;
      // eslint-disable-next-line no-console
      console.log(
        `    ${String(e.coinTicker).padEnd(9)} ${String(e.terminalStatus).padEnd(9)} ` +
          `${detail.value.signals.length} consulted, ${fired} fired, ` +
          `${detail.value.attributions.length} attributed → ${String(detail.value.chain.decision)}`,
      );
      if (deepest === null) {
        deepest = {
          coin: String(e.coinTicker),
          consulted: detail.value.signals.length,
          fired,
        };
        const dismissed = detail.value.signals.find((s) => !s.triggered);
        if (dismissed) {
          // eslint-disable-next-line no-console
          console.log(`      dismissed: ${dismissed.signalId} — ${String(dismissed.details)}`);
        }
        // The whole reason this surface exists: what it looked at and let go.
        expect(
          detail.value.signals.length,
          'the scorecard carries more than the signals that fired',
        ).toBeGreaterThan(fired);
      }
    }

    // eslint-disable-next-line no-console
    console.log(`  ${published} published, ${unpublished} not — of ${listed.value.length} listed`);
    expect(published, 'at least one evaluation should publish its detail').toBeGreaterThan(0);
  });
});
