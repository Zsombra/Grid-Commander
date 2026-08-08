import { describe, expect, it } from 'vitest';
import { McpBattleGridAdapter } from '@/infrastructure/battlegrid/mcp-adapter.js';
import { McpAgentAdapter } from '@/infrastructure/battlegrid/agent-adapter.js';
import { ReadPipelineQuery } from '@/application/use-cases/read-pipeline.query.js';
import { ReadOwnEvaluationQuery } from '@/application/use-cases/read-own-evaluation.query.js';
import { DeclaredScopes } from '@/domain/connection/held-scopes.js';
import { FakeAuditStore, FakeClock, FakeConfirmationStore } from '../support/fakes.js';

/**
 * The user's own evaluation, read live through the product path.
 *
 *     BATTLEGRID_API_KEY=bg_live_… npx vitest run tests/live/own-evaluation-probe.test.ts
 *
 * This is the probe that proves the asymmetry is closed: the same depth the
 * explorer shows about a stranger, shown about an agent this account owns —
 * plus the cost, which the public projection nulls and no competitor page
 * can ever carry.
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

live('an owned evaluation answers through the product path', () => {
  it('reads the scorecard and what the thinking cost', { timeout: 300_000 }, async () => {
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
    const query = new ReadOwnEvaluationQuery(agents);

    // Scan for one of our agents that has actually evaluated something —
    // the roster carries throwaway probe leftovers with no history.
    for (const agent of roster.agents) {
      const p = await pipeline.execute({ ...who, agentId: agent.id, limit: 5 });
      if (p.evaluations.kind !== 'entries') continue;

      // eslint-disable-next-line no-console
      console.log(`  ${agent.displayName}: ${p.evaluations.entries.length} evaluations`);
      if (p.funnel.kind === 'funnel') {
        const f = p.funnel.funnel;
        // eslint-disable-next-line no-console
        console.log(
          `    funnel: ${String(f.totalEvaluations)} evaluations → ${String(f.totalDecisions)} decisions → ` +
            `${String(f.enterDecisions)} entered · fill ${String(f.fillRatePercent)} · ` +
            `skip decisions=${String(f.skipDecisions)} vs SKIPPED terminal=${String(f.skippedTerminal)}`,
        );
      } else {
        // eslint-disable-next-line no-console
        console.log(`    funnel: ${p.funnel.kind}`);
      }

      const first = p.evaluations.entries[0];
      if (!first) continue;
      const detail = await query.execute({ ...who, agentId: agent.id, logId: first.id });
      if (detail.kind !== 'evaluation') {
        // eslint-disable-next-line no-console
        console.log(`    detail: ${detail.kind}`);
        continue;
      }

      const e = detail.evaluation;
      const fired = e.signals.filter((s) => s.triggered).length;
      // eslint-disable-next-line no-console
      console.log(
        `    ${String(e.coinTicker)}: ${e.signals.length} consulted, ${fired} fired, ` +
          `${e.attributions.length} attributed → ${String(e.chain.decision)} (${String(e.chain.attemptResult)})`,
      );
      const dismissed = e.signals.find((s) => !s.triggered);
      if (dismissed) {
        // eslint-disable-next-line no-console
        console.log(`      dismissed: ${dismissed.signalId} — ${String(dismissed.details)}`);
      }
      // eslint-disable-next-line no-console
      console.log(
        e.cost
          ? `      cost: ${String(e.cost.modelDisplayName)} · $${String(e.cost.costUsd)} · ${String(e.cost.durationMs)}ms · ${String(e.cost.billingType)}`
          : '      cost: not reported',
      );

      // The asymmetry this change exists to close: the scorecard carries
      // more than the signals that fired.
      expect(
        e.signals.length,
        'an owned evaluation carries every signal consulted, not only those that fired',
      ).toBeGreaterThan(fired);
      /**
       * The thing no public read can give — when the platform still has it.
       *
       * This asserted not-null unconditionally and failed twice on
       * 2026-08-08. A raw discrimination read settled why: BattleGrid serves
       * `ownerView` (the billing join) only for *fresh* evaluations —
       * populated at ~30 minutes of age, null on every sibling older than
       * ~2 hours, on the same agent in the same minute. So the honest
       * assertion is conditional: a reported cost must map whole, and an
       * unreported one must read as unreported — never as zero, and never
       * as this probe's failure, because the age of the newest evaluation
       * is the account's business, not the product's.
       */
      if (e.cost) {
        expect(e.cost.costUsd, 'a reported cost maps whole').not.toBeNull();
        expect(e.cost.modelDisplayName, 'a reported cost names its model').toBeTruthy();
        // eslint-disable-next-line no-console
        console.log('      ownerView: reported — the transient window was open');
      } else {
        // eslint-disable-next-line no-console
        console.log(
          '      ownerView: unreported — the platform nulls the billing join as evaluations age',
        );
      }
      return;
    }
    throw new Error('no agent on this account has an evaluation to read');
  });
});
