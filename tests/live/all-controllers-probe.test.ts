import { describe, expect, it } from 'vitest';
import { McpBattleGridAdapter } from '@/infrastructure/battlegrid/mcp-adapter.js';
import { McpAgentAdapter } from '@/infrastructure/battlegrid/agent-adapter.js';
import { McpStrategyAdapter } from '@/infrastructure/battlegrid/strategy-adapter.js';
import { McpRadarAdapter } from '@/infrastructure/battlegrid/radar-adapter.js';
import { McpMarketAdapter } from '@/infrastructure/battlegrid/market-adapter.js';
import { McpPositionsAdapter } from '@/infrastructure/battlegrid/positions-adapter.js';
import { McpMarketGridAdapter } from '@/infrastructure/battlegrid/market-grid-adapter.js';
import { McpExplorerAdapter } from '@/infrastructure/battlegrid/explorer-adapter.js';

import { ListAgentsQuery } from '@/application/use-cases/list-agents.query.js';
import { ReadCatalogQuery } from '@/application/use-cases/read-catalog.query.js';
import { ReadThoughtLogQuery } from '@/application/use-cases/read-thought-log.query.js';
import { ReadBudgetQuery } from '@/application/use-cases/read-budget.query.js';
import { ReadTradingRecordQuery } from '@/application/use-cases/read-trading-record.query.js';
import { ReadPipelineQuery } from '@/application/use-cases/read-pipeline.query.js';
import { ReadOwnEvaluationQuery } from '@/application/use-cases/read-own-evaluation.query.js';
import { ReadDeploymentsQuery } from '@/application/use-cases/read-deployments.query.js';
import { ReadQualificationQuery } from '@/application/use-cases/read-qualification.query.js';
import { ReadStoppagesQuery } from '@/application/use-cases/read-stoppages.query.js';
import { ReadExposureQuery } from '@/application/use-cases/read-exposure.query.js';
import { ReadAgentJournalQuery } from '@/application/use-cases/read-agent-journal.query.js';
import { ListStrategiesQuery } from '@/application/use-cases/list-strategies.query.js';
import { ReadStrategyQuery } from '@/application/use-cases/read-strategy.query.js';
import { ReadVocabularyQuery } from '@/application/use-cases/read-vocabulary.query.js';
import { ReadSectionOptionsQuery } from '@/application/use-cases/read-section-options.query.js';
import { ReadSignalLibraryQuery } from '@/application/use-cases/read-signal-library.query.js';
import { ReadSignalQuery } from '@/application/use-cases/read-signal.query.js';
import { ReadMetricIndexQuery } from '@/application/use-cases/read-metric-index.query.js';
import { ReadMetricQuery } from '@/application/use-cases/read-metric.query.js';
import { PreviewCompositionQuery } from '@/application/use-cases/preview-composition.query.js';
import { WatchArenaQuery } from '@/application/use-cases/watch-arena.query.js';
import { ReadFieldQuery } from '@/application/use-cases/read-field.query.js';
import { ReadCompetitorQuery } from '@/application/use-cases/read-competitor.query.js';
import { DeclaredScopes } from '@/domain/connection/held-scopes.js';
import { FakeAuditStore, FakeClock, FakeConfirmationStore } from '../support/fakes.js';

/**
 * Every read controller, against one live account, in one run.
 *
 *     BATTLEGRID_API_KEY=bg_live_… npx vitest run tests/live/all-controllers-probe.test.ts
 *
 * The per-feature probes each prove one thing deeply. This proves a different
 * property: that **the whole read surface answers on the same account at the
 * same moment**, and it prints what each controller returned so two accounts
 * can be diffed by eye.
 *
 * It exists because a walk of the second account found things no single-feature
 * probe would: `get_agent_performance` reporting correctly where the first
 * account reported zeros, an agent holding a live position that no surface
 * renders, and a stop that had moved away from the one every page shows. All
 * three were invisible while every existing probe stayed green, because every
 * existing probe ran against an account where those paths were empty.
 *
 * **Reads only.** No describe is invoked — a describe mints a confirmation,
 * which writes to this product's own store, and a survey has no business
 * doing that. Commands are absent by construction rather than by skipping.
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

function world() {
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
  const radar = new McpRadarAdapter(battlegrid);
  const market = new McpMarketAdapter(battlegrid);
  const grid = new McpMarketGridAdapter(battlegrid);
  const explorer = new McpExplorerAdapter(battlegrid);
  const positions = new McpPositionsAdapter(battlegrid);
  return { agents, strategies, radar, market, grid, explorer, positions };
}

/** What a controller answered, in one line, whatever shape it returned. */
function describeResult(value: unknown): string {
  if (value === null || value === undefined) return String(value);
  if (Array.isArray(value)) return `[${value.length}]`;
  if (typeof value !== 'object') return String(value);
  const o = value as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof o['kind'] === 'string') parts.push(o['kind']);
  for (const [k, v] of Object.entries(o)) {
    if (k === 'kind') continue;
    if (Array.isArray(v)) parts.push(`${k}[${v.length}]`);
    else if (v && typeof v === 'object' && typeof (v as Record<string, unknown>)['kind'] === 'string')
      parts.push(`${k}=${String((v as Record<string, unknown>)['kind'])}`);
    else if (typeof v === 'number' || typeof v === 'boolean') parts.push(`${k}=${String(v)}`);
    else if (typeof v === 'string' && v.length < 24) parts.push(`${k}=${v}`);
  }
  return parts.join(' ') || '{}';
}

/**
 * Results, collected rather than asserted one by one.
 *
 * A controller that throws is a finding, not a reason to abandon the walk —
 * the whole point is the full picture, and stopping at the first failure is
 * how a survey turns into a single-feature probe.
 */
const rows: Array<{ name: string; result: string; failed: boolean }> = [];

async function walk(name: string, run: () => Promise<unknown>): Promise<unknown> {
  try {
    const value = await run();
    rows.push({ name, result: describeResult(value), failed: false });
    return value;
  } catch (err) {
    rows.push({ name, result: `THREW ${err instanceof Error ? err.message : String(err)}`, failed: true });
    return null;
  }
}

live('every read controller, against one account', () => {
  it('answers, and says what it answered', { timeout: 900_000 }, async () => {
    const { agents, strategies, radar, market, grid, explorer, positions } = world();

    // -- the roster, and the subject everything per-agent uses ---------------
    const roster = (await walk('listAgents', () =>
      new ListAgentsQuery(agents).execute(who),
    )) as { roster: { kind: string; agents?: readonly { id: string; displayName: string; status: string }[] } } | null;

    const owned = roster?.roster.kind === 'agents' ? (roster.roster.agents ?? []) : [];
    const subject = owned.find((a) => a.status === 'ACTIVE') ?? owned[0];
    if (!subject) throw new Error('no agent on this account to walk');
    // eslint-disable-next-line no-console
    console.log(`\n  subject: ${subject.displayName} (${subject.id})\n`);

    const forAgent = { ...who, agentId: subject.id };

    await walk('readCatalog', () => new ReadCatalogQuery(agents).execute(who));
    await walk('readThoughtLog (agent)', () =>
      new ReadThoughtLogQuery(agents).execute({ ...forAgent, limit: 3 }),
    );
    await walk('readThoughtLog (account)', () =>
      new ReadThoughtLogQuery(agents).execute({ ...who, limit: 3 }),
    );
    await walk('readBudget', () => new ReadBudgetQuery(agents).execute(forAgent));
    await walk('readTradingRecord', () =>
      new ReadTradingRecordQuery(agents).execute({ ...forAgent, limit: 5 }),
    );
    await walk('readJournal', () => new ReadAgentJournalQuery(agents).execute({ ...forAgent, limit: 5 }));
    await walk('readStoppages', () => new ReadStoppagesQuery(agents).execute(forAgent));
    await walk('readExposure', () => new ReadExposureQuery(positions, agents).execute(forAgent));
    await walk('readDeployments', () => new ReadDeploymentsQuery(radar).execute(forAgent));
    await walk('readDeployments.summary', () => new ReadDeploymentsQuery(radar).summary(who));
    await walk('readQualification', () =>
      new ReadQualificationQuery(agents, radar, market).execute(forAgent),
    );

    const pipeline = (await walk('readPipeline', () =>
      new ReadPipelineQuery(agents).execute({ ...forAgent, limit: 5 }),
    )) as { evaluations: { kind: string; entries?: readonly { id: string }[] } } | null;

    // Only reachable when the agent has actually evaluated something — which is
    // exactly the difference between the two accounts this probe exists to see.
    const logId = pipeline?.evaluations.kind === 'entries' ? pipeline.evaluations.entries?.[0]?.id : undefined;
    if (logId) {
      await walk('readOwnEvaluation', () =>
        new ReadOwnEvaluationQuery(agents).execute({ ...forAgent, logId }),
      );
    } else {
      rows.push({ name: 'readOwnEvaluation', result: 'SKIPPED — no evaluation to open', failed: false });
    }

    // -- strategies ---------------------------------------------------------
    const listed = (await walk('listStrategies', () =>
      new ListStrategiesQuery(strategies).execute(who),
    )) as { listings?: readonly { strategy: { id: string } }[] } | null;
    // `listings[i].strategy.id`, not `listings[i].id`. The first version of
    // this probe read one level short and **silently walked four fewer
    // controllers** — a survey whose gaps are invisible is the thing it exists
    // to prevent, so every skip is now a printed row.
    const strategyId = listed?.listings?.[0]?.strategy.id;

    if (!strategyId) {
      rows.push({ name: 'readStrategy', result: 'SKIPPED — no strategy listed', failed: false });
    }
    if (strategyId) {
      await walk('readStrategy', () => new ReadStrategyQuery(strategies).execute({ ...who, strategyId }));
      await walk('readSectionOptions', () =>
        new ReadSectionOptionsQuery(strategies).execute({ ...who, strategyId }),
      );
      await walk('previewComposition', () =>
        new PreviewCompositionQuery(strategies).execute({
          ...who,
          strategyId,
          coinSelection: { mode: 'ranked' as const, limit: 3 },
        }),
      );
    }

    await walk('readVocabulary', () => new ReadVocabularyQuery(strategies).execute(who));

    const library = (await walk('readSignalLibrary', () =>
      new ReadSignalLibraryQuery(strategies).execute(who),
    )) as { kind: string; modules?: readonly { signals: readonly { id: string }[] }[] } | null;
    const signalId = library?.modules?.[0]?.signals?.[0]?.id;
    if (signalId) {
      await walk('readSignal', () => new ReadSignalQuery(strategies).execute({ ...who, signalId }));
    } else {
      rows.push({ name: 'readSignal', result: 'SKIPPED — no signal in the library', failed: false });
    }

    const metrics = (await walk('readMetricIndex', () =>
      new ReadMetricIndexQuery(strategies).execute(who),
    )) as { kind: string; families?: readonly { metrics: readonly { id: string }[] }[] } | null;
    const metric = metrics?.families?.[0]?.metrics?.[0]?.id;
    if (metric) {
      await walk('readMetric', () => new ReadMetricQuery(strategies).execute({ ...who, metric }));
    } else {
      rows.push({ name: 'readMetric', result: 'SKIPPED — no metric in the index', failed: false });
    }

    // -- the field, and the arena ------------------------------------------
    await walk('watchArena', () => new WatchArenaQuery(grid).execute(who));

    const field = (await walk('readField', () =>
      new ReadFieldQuery(explorer).execute({ ...who, timeframe: 'ALL_TIME', sortBy: 'NET_PNL', limit: 5 }),
    )) as { field: { kind: string; field?: { agents: readonly { agentId: string }[] } } } | null;
    // `kind: 'field'` wrapping a `Field` that holds the rows — again one level
    // deeper than the first version assumed, and again a silent skip.
    const rivalId =
      field?.field.kind === 'field' ? field.field.field?.agents?.[0]?.agentId : undefined;
    if (rivalId) {
      await walk('readCompetitor', () =>
        new ReadCompetitorQuery(explorer).execute({ ...who, agentId: rivalId, limit: 3 }),
      );
    } else {
      rows.push({ name: 'readCompetitor', result: 'SKIPPED — no rival in the field', failed: false });
    }

    // -- the report ---------------------------------------------------------
    // eslint-disable-next-line no-console
    console.log('\n  controller                       answered');
    // eslint-disable-next-line no-console
    console.log('  ' + '-'.repeat(74));
    for (const r of rows) {
      // eslint-disable-next-line no-console
      console.log(`  ${r.name.padEnd(30)} ${r.result.slice(0, 120)}`);
    }

    const threw = rows.filter((r) => r.failed);
    // eslint-disable-next-line no-console
    console.log(`\n  ${rows.length} controllers walked, ${threw.length} threw\n`);

    /**
     * A read controller must never throw at a route. Every one of them returns
     * a named state — `unreadable`, `none`, `empty` — precisely so a page can
     * render something true instead of a stack trace, and this is the assertion
     * that the property holds against a real platform rather than a fake.
     */
    expect(
      threw.map((r) => `${r.name}: ${r.result}`),
      'a read controller that throws has no state for a page to render',
    ).toEqual([]);
    /**
     * Every controller accounted for, walked or skipped **by name**. The count
     * is the guard against the failure this probe had on its first outing:
     * reading an id one level too shallow, taking the `if`, and reporting a
     * clean run over four controllers it never called.
     */
    expect(rows.length, 'every controller is walked or named as skipped').toBe(26);
  });
});
