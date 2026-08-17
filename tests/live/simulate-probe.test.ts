import { describe, expect, it } from 'vitest';
import { McpBattleGridAdapter } from '@/infrastructure/battlegrid/mcp-adapter.js';
import { McpAgentAdapter } from '@/infrastructure/battlegrid/agent-adapter.js';
import { McpStrategyAdapter } from '@/infrastructure/battlegrid/strategy-adapter.js';
import { ReadPipelineQuery } from '@/application/use-cases/read-pipeline.query.js';
import { ReadOwnEvaluationQuery } from '@/application/use-cases/read-own-evaluation.query.js';
import { SimulateAggregateQuery } from '@/application/use-cases/simulate-aggregate.query.js';
import { SIMULATION_SIGNAL_CAP } from '@/ports/strategies.js';
import { DeclaredScopes } from '@/domain/connection/held-scopes.js';
import { FakeAuditStore, FakeClock, FakeConfirmationStore } from '../support/fakes.js';

/**
 * The what-if calculator, checked against reality.
 *
 *     BATTLEGRID_API_KEY=bg_live_… npx vitest run tests/live/simulate-probe.test.ts
 *
 * This probe exists to answer the question that gated building the surface
 * at all: does the simulator model what the pipeline actually runs? It
 * feeds a real evaluation's own triggered signals and effective allocations
 * back in, unchanged, and asserts the returned aggregate matches the score
 * the platform recorded for it.
 *
 * If BattleGrid ever changes the aggregation, this fails — which is the
 * point. A what-if that has quietly stopped agreeing with the pipeline is
 * worse than none, because it looks exactly like one that works.
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

live('the simulator reproduces the pipeline', () => {
  it('re-scores a real evaluation to its own recorded score', { timeout: 300_000 }, async () => {
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
    const strategies = new McpStrategyAdapter(battlegrid);
    const simulate = new SimulateAggregateQuery(strategies);
    const readEvaluation = new ReadOwnEvaluationQuery(agents);

    const roster = await agents.listAgents(who);
    if (roster.kind !== 'agents') throw new Error(`roster ${roster.kind}`);

    for (const agent of roster.agents) {
      const p = await new ReadPipelineQuery(agents).execute({ ...who, agentId: agent.id, limit: 5 });
      if (p.evaluations.kind !== 'entries') continue;

      for (const row of p.evaluations.entries) {
        const detail = await readEvaluation.execute({ ...who, agentId: agent.id, logId: row.id });
        if (detail.kind !== 'evaluation') continue;
        const fired = detail.evaluation.signals.filter((s) => s.triggered);
        if (fired.length === 0 || fired.length > SIMULATION_SIGNAL_CAP) {
          // eslint-disable-next-line no-console
          console.log(`  ${String(row.coinTicker)}: ${fired.length} fired — outside the simulator's range, skipping`);
          continue;
        }

        // The evaluation's own gate, as it was in force when this ran.
        const gate = row.minAggregateScore ?? 0.5;
        const result = await simulate.execute({
          ...who,
          signals: fired.map((s) => ({
            label: s.signalId.slice(0, 60),
            score: Math.min(1, Math.max(0, (s.scorePercent ?? 0) / 100)),
            allocation: s.effectiveAllocation ?? 1,
          })),
          gate,
        });
        if (result.kind !== 'simulation') throw new Error(`refused: ${result.reason}`);

        const real = detail.evaluation.aggregateScorePercent;
        const simulated = result.simulation.aggregateScorePercent;
        // eslint-disable-next-line no-console
        console.log(
          `  ${String(row.coinTicker)}: ${fired.length} fired · platform scored ${String(real)}% · ` +
            `simulator ${String(simulated)}% · gate ${String(result.simulation.gatePercent)}% · ` +
            `wouldRoute=${result.simulation.wouldRoute}`,
        );

        // Unchanged in, unchanged out. Both are the platform's own rounding
        // to a whole percent, so they must agree exactly.
        expect(
          simulated,
          'feeding an evaluation its own weightings must reproduce its own score',
        ).toBe(real);
        expect(result.simulation.attributions).toHaveLength(fired.length);
        return;
      }
    }
    throw new Error('no evaluation on this account was within the simulator’s range');
  });
});
