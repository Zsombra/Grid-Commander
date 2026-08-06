import { DescribeArchiveQuery } from '@/application/use-cases/lifecycle.command.js';
import { DescribeArchiveStrategyQuery } from '@/application/use-cases/strategy-lifecycle.command.js';
import {
  DescribeDeployQuery,
  DescribeUndeployQuery,
} from '@/application/use-cases/deploy-agent.command.js';
import { ListAgentsQuery } from '@/application/use-cases/list-agents.query.js';
import { ReadProposalsQuery } from '@/application/use-cases/read-proposals.query.js';
import { FakeProposalStore } from '../../support/proposal-fakes.js';
import { ListStrategiesQuery } from '@/application/use-cases/list-strategies.query.js';
import { ReadBudgetQuery } from '@/application/use-cases/read-budget.query.js';
import { ReadTradingRecordQuery } from '@/application/use-cases/read-trading-record.query.js';
import { ReadPipelineQuery } from '@/application/use-cases/read-pipeline.query.js';
import { ReadOwnEvaluationQuery } from '@/application/use-cases/read-own-evaluation.query.js';
import { ReadDeploymentsQuery } from '@/application/use-cases/read-deployments.query.js';
import { ReadQualificationQuery } from '@/application/use-cases/read-qualification.query.js';
import { ReadStoppagesQuery } from '@/application/use-cases/read-stoppages.query.js';
import { ReadExposureQuery } from '@/application/use-cases/read-exposure.query.js';
import { CheckColumnQuery } from '@/application/use-cases/check-column.query.js';
import { DescribeRetuneQuery, RetuneRuleCommand } from '@/application/use-cases/retune-rule.command.js';
import { PreviewCompositionQuery } from '@/application/use-cases/preview-composition.query.js';
import { SimulateAggregateQuery } from '@/application/use-cases/simulate-aggregate.query.js';
import { ReadMetricIndexQuery } from '@/application/use-cases/read-metric-index.query.js';
import { ReadMetricQuery } from '@/application/use-cases/read-metric.query.js';
import { ReadSignalLibraryQuery } from '@/application/use-cases/read-signal-library.query.js';
import { ReadSignalQuery } from '@/application/use-cases/read-signal.query.js';
import { ReadStrategyQuery } from '@/application/use-cases/read-strategy.query.js';
import { WatchArenaQuery } from '@/application/use-cases/watch-arena.query.js';
import { ReadFieldQuery } from '@/application/use-cases/read-field.query.js';
import { ReadCompetitorQuery } from '@/application/use-cases/read-competitor.query.js';
import { ReadEvaluationQuery } from '@/application/use-cases/read-evaluation.query.js';
import type { CurrentUserResult } from '@/application/use-cases/current-user.query.js';
import type { Confirmation } from '@/domain/capability/confirmation.js';
import { NOT_CONNECTED } from '@/domain/session/session.js';
import type { RadarPort, RadarReadResult } from '@/ports/radar.js';
import { FakeAgentsPort } from '../../support/agent-fakes.js';
import { SequentialRandom } from '../../support/agent-fakes.js';
import { FakeMarketGridPort } from '../../support/grid-fakes.js';
import { FakeMarketPort } from '../../support/market-fakes.js';
import { FakePositionsPort } from '../../support/position-fakes.js';
import { FakeExplorerPort } from '../../support/explorer-fakes.js';
import { FakeStrategiesPort } from '../../support/strategy-fakes.js';
import { FakeClock, FakeConfirmationStore } from '../../support/fakes.js';

/**
 * The `{ app, user }` shape `acting()` returns, assembled from the real
 * use-case classes over the suite's fakes — a composition root for tests.
 *
 * The point of wiring real queries and describes rather than stubbing `app`
 * directly: a page rendered here exercises the same application code a
 * request does, so an assertion about its heading is an assertion about the
 * product, not about a stub agreeing with itself.
 */

export class RenderRadarPort implements RadarPort {
  timeframes: readonly string[] = ['15m', '1h'];
  result: RadarReadResult = { kind: 'deployments', deployments: [] };
  async listDeployments(): Promise<RadarReadResult> {
    return this.result;
  }
  async deploymentTimeframes(): Promise<readonly string[]> {
    return this.timeframes;
  }
  async upsertDeployment(_: { confirmation: Confirmation }): Promise<{ revision: number }> {
    throw new Error('rendering never performs');
  }
  async deleteDeployment(_: { confirmation: Confirmation }): Promise<{ deleted: boolean }> {
    throw new Error('rendering never performs');
  }
}

export function actingWith({
  agents = new FakeAgentsPort([]),
  strategies = new FakeStrategiesPort(),
  radar = new RenderRadarPort(),
  grid = new FakeMarketGridPort(),
  explorer = new FakeExplorerPort(),
  proposals = new FakeProposalStore(),
  market = new FakeMarketPort(),
  positions = new FakePositionsPort(),
}: {
  agents?: FakeAgentsPort;
  strategies?: FakeStrategiesPort;
  radar?: RenderRadarPort;
  grid?: FakeMarketGridPort;
  explorer?: FakeExplorerPort;
  proposals?: FakeProposalStore;
  market?: FakeMarketPort;
  positions?: FakePositionsPort;
} = {}) {
  const clock = new FakeClock();
  const confirmations = new FakeConfirmationStore(clock);
  const random = new SequentialRandom();

  const app = {
    listAgents: new ListAgentsQuery(agents),
    readProposals: new ReadProposalsQuery(proposals, clock),
    readDeployments: new ReadDeploymentsQuery(radar),
    readBudget: new ReadBudgetQuery(agents),
    readTradingRecord: new ReadTradingRecordQuery(agents),
    readPipeline: new ReadPipelineQuery(agents),
    readQualification: new ReadQualificationQuery(agents, radar, market),
    readStoppages: new ReadStoppagesQuery(agents),
    readExposure: new ReadExposureQuery(positions, agents),
    readOwnEvaluation: new ReadOwnEvaluationQuery(agents),
    describeArchive: new DescribeArchiveQuery(agents, confirmations, random, clock),
    describeDeploy: new DescribeDeployQuery(radar, confirmations, random, clock),
    describeUndeploy: new DescribeUndeployQuery(radar, confirmations, random, clock),
    readStrategy: new ReadStrategyQuery(strategies),
    listStrategies: new ListStrategiesQuery(strategies),
    describeArchiveStrategy: new DescribeArchiveStrategyQuery(confirmations, random, clock),
    watchArena: new WatchArenaQuery(grid),
    readField: new ReadFieldQuery(explorer),
    readCompetitor: new ReadCompetitorQuery(explorer),
    readEvaluation: new ReadEvaluationQuery(explorer),
    readSignalLibrary: new ReadSignalLibraryQuery(strategies),
    readSignal: new ReadSignalQuery(strategies),
    readMetricIndex: new ReadMetricIndexQuery(strategies),
    readMetric: new ReadMetricQuery(strategies),
    checkColumn: new CheckColumnQuery(strategies),
    describeRetune: new DescribeRetuneQuery(strategies, confirmations, random, clock),
    retuneRule: new RetuneRuleCommand(strategies),
    previewComposition: new PreviewCompositionQuery(strategies),
    simulateAggregate: new SimulateAggregateQuery(strategies),
  };

  const user: CurrentUserResult = {
    kind: 'acting',
    authority: { userId: 'owner', battlegridSubject: null, accessToken: 'tok' },
  };

  return { app, user, agents, strategies, radar, grid, explorer, market, positions, confirmations };
}

/** The other gate every page has: what an unauthenticated request sees. */
export const notConnected: CurrentUserResult = {
  kind: 'not-connected',
  message: NOT_CONNECTED,
};
