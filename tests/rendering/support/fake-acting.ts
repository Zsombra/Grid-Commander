import type { Remedy } from '@/domain/connection/remedy.js';
import { CreateAgentCommand } from '@/application/use-cases/create-agent.command.js';
import { DescribeArchiveQuery } from '@/application/use-cases/lifecycle.command.js';
import {
  DescribeArchiveStrategyQuery,
  ForkStrategyCommand,
} from '@/application/use-cases/strategy-lifecycle.command.js';
import {
  DescribeDeployQuery,
  DescribeUndeployQuery,
} from '@/application/use-cases/deploy-agent.command.js';
import { ReadFleetSpendQuery } from '@/application/use-cases/read-fleet-spend.query.js';
import { ReadFeasibilityReplyQuery } from '@/application/use-cases/read-feasibility-reply.query.js';
import { InMemoryFeasibilityReplies } from '../../support/feasibility-fakes.js';
import { ListAgentsQuery } from '@/application/use-cases/list-agents.query.js';
import { ReadProposalsQuery } from '@/application/use-cases/read-proposals.query.js';
import { OpenProposalQuery } from '@/application/use-cases/open-proposal.query.js';
import { DescribeEditQuery } from '@/application/use-cases/describe-edit.query.js';
import { ReadForwardReturnsQuery } from '@/application/use-cases/read-forward-returns.query.js';
import { ReadRegimeContextQuery } from '@/application/use-cases/read-regime-context.query.js';
import { ReadRecordCoverageQuery } from '@/application/use-cases/read-record-coverage.query.js';
import { ReadSignalHistoryQuery } from '@/application/use-cases/read-signal-history.query.js';
import { FakeProposalStore } from '../../support/proposal-fakes.js';
import { InMemorySignalRecordStore } from '../../support/recording-fakes.js';
import { ListStrategiesQuery } from '@/application/use-cases/list-strategies.query.js';
import { ReadBudgetQuery } from '@/application/use-cases/read-budget.query.js';
import { ReadLossShapeQuery } from '@/application/use-cases/read-loss-shape.query.js';
import { ReadRiskReadingQuery } from '@/application/use-cases/read-risk-reading.query.js';
import { ReadWagerAuthorityQuery } from '@/application/use-cases/read-wager-authority.query.js';
import { DescribeTrimRecordQuery, TrimRecordCommand } from '@/application/use-cases/trim-record.command.js';
import { ReadCatalogQuery } from '@/application/use-cases/read-catalog.query.js';
import { ReadTradingRecordQuery } from '@/application/use-cases/read-trading-record.query.js';
import { ReadTradeStoryQuery } from '@/application/use-cases/read-trade-story.query.js';
import { ReadPipelineQuery } from '@/application/use-cases/read-pipeline.query.js';
import { ReadApprovalQueueQuery } from '@/application/use-cases/read-approval-queue.query.js';
import { ReadAnswerAuthorityQuery } from '@/application/use-cases/read-answer-authority.query.js';
import { DescribeDecisionAnswerQuery } from '@/application/use-cases/describe-decision-answer.query.js';
import { AnswerDecisionCommand } from '@/application/use-cases/answer-decision.command.js';
import { DeclaredScopes } from '@/domain/connection/held-scopes.js';
import type { Scope } from '@/domain/connection/scope.js';
import { ReadOwnEvaluationQuery } from '@/application/use-cases/read-own-evaluation.query.js';
import { ReadDeploymentsQuery } from '@/application/use-cases/read-deployments.query.js';
import { ReadQualificationQuery } from '@/application/use-cases/read-qualification.query.js';
import { ReadStoppagesQuery } from '@/application/use-cases/read-stoppages.query.js';
import { ReadExposureQuery } from '@/application/use-cases/read-exposure.query.js';
import { CheckColumnQuery } from '@/application/use-cases/check-column.query.js';
import { ComposeColumnQuery } from '@/application/use-cases/compose-column.query.js';
import { ReadSectionLibraryQuery } from '@/application/use-cases/read-section-library.query.js';
import { DescribeRetuneQuery, RetuneRuleCommand } from '@/application/use-cases/retune-rule.command.js';
import { PreviewCompositionQuery } from '@/application/use-cases/preview-composition.query.js';
import { TryConditionQuery } from '@/application/use-cases/try-condition.query.js';
import { DescribeConditionWriteQuery } from '@/application/use-cases/describe-condition-write.query.js';
import { CompilePlanCommand } from '@/application/use-cases/compile-plan.command.js';
import { DescribeApplyQuery } from '@/application/use-cases/apply-plan.command.js';
import { SimulateAggregateQuery } from '@/application/use-cases/simulate-aggregate.query.js';
import { ReadMetricIndexQuery } from '@/application/use-cases/read-metric-index.query.js';
import { ReadMetricQuery } from '@/application/use-cases/read-metric.query.js';
import { ReadSignalLibraryQuery } from '@/application/use-cases/read-signal-library.query.js';
import { ReadSignalQuery } from '@/application/use-cases/read-signal.query.js';
import { ReadStrategyQuery } from '@/application/use-cases/read-strategy.query.js';
import { WatchArenaQuery } from '@/application/use-cases/watch-arena.query.js';
import { ReadGameRulesQuery } from '@/application/use-cases/read-game-rules.query.js';
import { OpenGridSessionQuery } from '@/application/use-cases/open-grid-session.query.js';
import { ReadFieldQuery } from '@/application/use-cases/read-field.query.js';
import { ReadCompetitorQuery } from '@/application/use-cases/read-competitor.query.js';
import { ReadEvaluationQuery } from '@/application/use-cases/read-evaluation.query.js';
import type { CurrentUserResult } from '@/application/use-cases/current-user.query.js';
import type { Confirmation } from '@/domain/capability/confirmation.js';
import { NOT_CONNECTED } from '@/domain/session/session.js';
import type { RadarPort, RadarReadResult } from '@/ports/radar.js';
import { FakeAccountStatePort, FakeAgentsPort } from '../../support/agent-fakes.js';
import { SequentialRandom } from '../../support/agent-fakes.js';
import { FakeMarketGridPort } from '../../support/grid-fakes.js';
import { FakeMarketPort } from '../../support/market-fakes.js';
import { FakePositionsPort } from '../../support/position-fakes.js';
import { FakeExplorerPort } from '../../support/explorer-fakes.js';
import { FakeStrategiesPort } from '../../support/strategy-fakes.js';
import { FakeClock, FakeConfirmationStore, NO_PAUSE_REPORTED } from '../../support/fakes.js';

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
  result: RadarReadResult = { kind: 'deployments', pause: NO_PAUSE_REPORTED, deployments: [] };
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
  accountState = new FakeAccountStatePort(),
  strategies = new FakeStrategiesPort(),
  radar = new RenderRadarPort(),
  grid = new FakeMarketGridPort(),
  explorer = new FakeExplorerPort(),
  proposals = new FakeProposalStore(),
  market = new FakeMarketPort(),
  positions = new FakePositionsPort(),
  signalRecord = new InMemorySignalRecordStore(),
  /**
   * When the page is being rendered. Injectable because a surface can now say
   * how old its figures are — "priced 4 minutes ago" — and a test that let
   * that read the wall clock would assert a different sentence every run.
   */
  clock = new FakeClock(),
  /**
   * Which deployment this is, said the way the product says it.
   *
   * `reconnect` by default because the delegated deployment is the one nearly
   * every page test is about. A surface that offers a remedy has to know which
   * one exists here, and a fake that omitted it would let the personal branch
   * pass by never being rendered.
   */
  remedy = 'reconnect' as Remedy,
  /**
   * What the connection may do, for the surfaces that gate on it.
   *
   * `['mcp:read']` by default because that is the product's standing posture —
   * the state every user is in until they deliberately step up. A default that
   * held wager authority would render the answer controls on every page test
   * and let the gate rot unnoticed.
   */
  heldScopes = ['mcp:read'] as readonly Scope[],
  /**
   * The reply an agent edit came back with, waiting to be shown once.
   *
   * Empty by default: the advisory arrives only on a write, so *nothing* is
   * the state every ordinary page load is in, and a fake that always held one
   * would make the panel look like a permanent fixture of the page. Declared
   * after `clock` so it can stamp its replies from the same one the read
   * measures their age against — two clocks here would make every planted
   * reply stale at an hour nobody chose.
   */
  feasibilityReply = new InMemoryFeasibilityReplies(clock),
}: {
  agents?: FakeAgentsPort;
  accountState?: FakeAccountStatePort;
  strategies?: FakeStrategiesPort;
  radar?: RenderRadarPort;
  grid?: FakeMarketGridPort;
  explorer?: FakeExplorerPort;
  proposals?: FakeProposalStore;
  market?: FakeMarketPort;
  positions?: FakePositionsPort;
  signalRecord?: InMemorySignalRecordStore;
  feasibilityReply?: InMemoryFeasibilityReplies;
  clock?: FakeClock;
  remedy?: Remedy;
  heldScopes?: readonly Scope[];
} = {}) {
  const confirmations = new FakeConfirmationStore(clock);
  const random = new SequentialRandom();

  const app = {
    remedy,
    listAgents: new ListAgentsQuery(agents),
    readFleetSpend: new ReadFleetSpendQuery(agents),
    readProposals: new ReadProposalsQuery(proposals, clock),
    openProposal: new OpenProposalQuery(
      proposals,
      agents,
      new DescribeEditQuery(agents, confirmations, random, clock),
      clock,
    ),
    readDeployments: new ReadDeploymentsQuery(radar, clock),
    readBudget: new ReadBudgetQuery(agents),
    readLossShape: new ReadLossShapeQuery(agents),
    readRiskReading: new ReadRiskReadingQuery(agents, accountState),
    readWagerAuthority: new ReadWagerAuthorityQuery(accountState),
    // The edit and create forms both refuse to render without it — a form
    // whose submission is certain to fail is worse than none.
    readCatalog: new ReadCatalogQuery(agents),
    // The create action, over the same fakes — wired so a test can walk the
    // submit itself, not only the render (the #177 lesson, applied forward).
    createAgent: new CreateAgentCommand(agents),
    readTradingRecord: new ReadTradingRecordQuery(agents),
    readTradeStory: new ReadTradeStoryQuery(agents),
    readPipeline: new ReadPipelineQuery(agents),
    // Answering a proposed trade: the queue, the authority it needs, the
    // describe that mints the confirmation, and the command that spends it.
    readApprovalQueue: new ReadApprovalQueueQuery(agents, clock),
    readAnswerAuthority: new ReadAnswerAuthorityQuery(new DeclaredScopes(heldScopes)),
    describeDecisionAnswer: new DescribeDecisionAnswerQuery(agents, confirmations, random, clock),
    answerDecision: new AnswerDecisionCommand(agents),
    readQualification: new ReadQualificationQuery(agents, radar, market),
    readStoppages: new ReadStoppagesQuery(agents),
    // No platform read behind it — it collects what the apply action set down
    // a redirect ago (#291). Wired beside the port itself so a test can walk
    // the write and the render, not only one of them.
    feasibilityReply,
    readFeasibilityReply: new ReadFeasibilityReplyQuery(feasibilityReply, clock),
    readExposure: new ReadExposureQuery(positions, agents, clock),
    readOwnEvaluation: new ReadOwnEvaluationQuery(agents),
    describeArchive: new DescribeArchiveQuery(agents, confirmations, random, clock),
    describeDeploy: new DescribeDeployQuery(radar, confirmations, random, clock),
    describeUndeploy: new DescribeUndeployQuery(radar, confirmations, random, clock),
    readStrategy: new ReadStrategyQuery(strategies),
    listStrategies: new ListStrategiesQuery(strategies),
    describeArchiveStrategy: new DescribeArchiveStrategyQuery(confirmations, random, clock),
    // The fork action, over the same fakes — wired so a test can walk the
    // submit itself, not only the render (the same reason createAgent is).
    forkStrategy: new ForkStrategyCommand(strategies),
    watchArena: new WatchArenaQuery(grid),
    readGameRules: new ReadGameRulesQuery(grid),
    openGridSession: new OpenGridSessionQuery(grid),
    readField: new ReadFieldQuery(explorer),
    readCompetitor: new ReadCompetitorQuery(explorer),
    readEvaluation: new ReadEvaluationQuery(explorer),
    readSignalLibrary: new ReadSignalLibraryQuery(strategies),
    readSignal: new ReadSignalQuery(strategies),
    readMetricIndex: new ReadMetricIndexQuery(strategies),
    readMetric: new ReadMetricQuery(strategies),
    checkColumn: new CheckColumnQuery(strategies),
    readSectionLibrary: new ReadSectionLibraryQuery(strategies),
    composeColumn: new ComposeColumnQuery(strategies),
    describeRetune: new DescribeRetuneQuery(strategies, confirmations, random, clock),
    retuneRule: new RetuneRuleCommand(strategies),
    previewComposition: new PreviewCompositionQuery(strategies),
    tryCondition: new TryConditionQuery(strategies),
    // The write half of the same layer. Wired from the real classes for the
    // reason the rest of this harness is: a page rendered here runs the
    // application code a request runs, including the compile that decides
    // whether there is anything to confirm.
    describeConditionWrite: new DescribeConditionWriteQuery(
      strategies,
      new CompilePlanCommand(strategies),
      new DescribeApplyQuery(confirmations, random, clock),
    ),
    simulateAggregate: new SimulateAggregateQuery(strategies),
    readSignalHistory: new ReadSignalHistoryQuery(signalRecord),
    describeTrimRecord: new DescribeTrimRecordQuery(signalRecord, confirmations, random, clock),
    trimRecord: new TrimRecordCommand(signalRecord, confirmations),
    readRecordCoverage: new ReadRecordCoverageQuery(signalRecord, clock),
    readForwardReturns: new ReadForwardReturnsQuery(signalRecord),
    readRegimeContext: new ReadRegimeContextQuery(signalRecord, market),
  };

  const user: CurrentUserResult = {
    kind: 'acting',
    authority: { userId: 'owner', battlegridSubject: null, accessToken: 'tok' },
  };

  return {
    app,
    user,
    agents,
    strategies,
    radar,
    grid,
    explorer,
    market,
    positions,
    signalRecord,
    confirmations,
    clock,
  };
}

/** The other gate every page has: what an unauthenticated request sees. */
export const notConnected: CurrentUserResult = {
  kind: 'not-connected',
  message: NOT_CONNECTED,
};
