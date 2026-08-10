import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { loadConfig } from './config.js';
import type { PersonalConfig } from './config.js';
import { DeclaredScopes } from './domain/connection/held-scopes.js';
import { ConnectionScopes } from './infrastructure/battlegrid/connection-scopes.js';
import { CaptureSignalsCommand } from './application/use-cases/capture-signals.command.js';
import { CreateAgentCommand } from './application/use-cases/create-agent.command.js';
import { CurrentUserQuery } from './application/use-cases/current-user.query.js';
import type { ActingUser } from './application/use-cases/current-user.query.js';
import { OwnerOnlyUser } from './application/use-cases/owner-only-user.js';
import {
  CompleteConnectionCommand,
  DisconnectCommand,
  StartConnectionCommand,
} from './application/use-cases/connect.commands.js';
import { DescribeArchiveQuery, SetLifecycleCommand } from './application/use-cases/lifecycle.command.js';
import { ListAgentsQuery } from './application/use-cases/list-agents.query.js';
import { ListAuditQuery } from './application/use-cases/list-audit.query.js';
import { ReadAgentJournalQuery } from './application/use-cases/read-agent-journal.query.js';
import { ReadCatalogQuery } from './application/use-cases/read-catalog.query.js';
import { ReadVocabularyQuery } from './application/use-cases/read-vocabulary.query.js';
import { ListStrategiesQuery } from './application/use-cases/list-strategies.query.js';
import { ReadDeploymentsQuery } from './application/use-cases/read-deployments.query.js';
import {
  DescribeDeployQuery,
  DescribeUndeployQuery,
  PerformDeployCommand,
  PerformUndeployCommand,
} from './application/use-cases/deploy-agent.command.js';
import { ReadStrategyQuery } from './application/use-cases/read-strategy.query.js';
import { CompilePlanCommand } from './application/use-cases/compile-plan.command.js';
import { ApplyPlanCommand, DescribeApplyQuery } from './application/use-cases/apply-plan.command.js';
import {
  DescribeArchiveStrategyQuery,
  ForkStrategyCommand,
  SetStrategyActiveCommand,
} from './application/use-cases/strategy-lifecycle.command.js';
import { ReadSectionOptionsQuery } from './application/use-cases/read-section-options.query.js';
import { ReadSectionLibraryQuery } from './application/use-cases/read-section-library.query.js';
import { ComposeColumnQuery } from './application/use-cases/compose-column.query.js';
import { ReadSignalLibraryQuery } from './application/use-cases/read-signal-library.query.js';
import { ReadSignalQuery } from './application/use-cases/read-signal.query.js';
import { CheckColumnQuery } from './application/use-cases/check-column.query.js';
import {
  DescribeRetuneQuery,
  RetuneRuleCommand,
} from './application/use-cases/retune-rule.command.js';
import { PreviewCompositionQuery } from './application/use-cases/preview-composition.query.js';
import { TryConditionQuery } from './application/use-cases/try-condition.query.js';
import { DescribeConditionWriteQuery } from './application/use-cases/describe-condition-write.query.js';
import { SimulateAggregateQuery } from './application/use-cases/simulate-aggregate.query.js';
import { ReadMetricIndexQuery } from './application/use-cases/read-metric-index.query.js';
import { ReadMetricQuery } from './application/use-cases/read-metric.query.js';
import { DescribeEditQuery } from './application/use-cases/describe-edit.query.js';
import { ReadThoughtLogQuery } from './application/use-cases/read-thought-log.query.js';
import { ReadBudgetQuery } from './application/use-cases/read-budget.query.js';
import { ReadRiskReadingQuery } from './application/use-cases/read-risk-reading.query.js';
import { ReadTradingRecordQuery } from './application/use-cases/read-trading-record.query.js';
import { ReadTradeStoryQuery } from './application/use-cases/read-trade-story.query.js';
import { ReadPipelineQuery } from './application/use-cases/read-pipeline.query.js';
import { ReadQualificationQuery } from './application/use-cases/read-qualification.query.js';
import { ReadRecordCoverageQuery } from './application/use-cases/read-record-coverage.query.js';
import { ReadSignalHistoryQuery } from './application/use-cases/read-signal-history.query.js';
import { ReadStoppagesQuery } from './application/use-cases/read-stoppages.query.js';
import { ReadExposureQuery } from './application/use-cases/read-exposure.query.js';
import { ReadOwnEvaluationQuery } from './application/use-cases/read-own-evaluation.query.js';
import {
  DescribeRebindQuery,
  RebindAgentCommand,
} from './application/use-cases/rebind-agent.command.js';
import { ResolveAuthorityQuery } from './application/use-cases/resolve-authority.query.js';
import { UpdateAgentCommand } from './application/use-cases/update-agent.command.js';
import { WatchArenaQuery } from './application/use-cases/watch-arena.query.js';
import { ReadGameRulesQuery } from './application/use-cases/read-game-rules.query.js';
import { OpenGridSessionQuery } from './application/use-cases/open-grid-session.query.js';
import { ReadFieldQuery } from './application/use-cases/read-field.query.js';
import { ReadCompetitorQuery } from './application/use-cases/read-competitor.query.js';
import { ReadEvaluationQuery } from './application/use-cases/read-evaluation.query.js';
import {
  McpAccountAdapter,
  McpAccountStateAdapter,
} from './infrastructure/battlegrid/account-adapter.js';
import { McpMarketGridAdapter } from './infrastructure/battlegrid/market-grid-adapter.js';
import { McpExplorerAdapter } from './infrastructure/battlegrid/explorer-adapter.js';
import { McpRadarAdapter } from './infrastructure/battlegrid/radar-adapter.js';
import { McpMarketAdapter } from './infrastructure/battlegrid/market-adapter.js';
import { McpPositionsAdapter } from './infrastructure/battlegrid/positions-adapter.js';
import { McpAgentAdapter } from './infrastructure/battlegrid/agent-adapter.js';
import { McpStrategyAdapter } from './infrastructure/battlegrid/strategy-adapter.js';
import { McpBattleGridAdapter } from './infrastructure/battlegrid/mcp-adapter.js';
import { createCipher } from './infrastructure/crypto/envelope.js';
import {
  DrizzleAuditRepository,
  DrizzleConfirmationStore,
} from './infrastructure/db/repositories/drizzle-audit-repository.js';
import { DrizzleProposalStore } from './infrastructure/db/repositories/drizzle-proposal-store.js';
import { DrizzleSignalRecordStore } from './infrastructure/db/repositories/drizzle-signal-record-store.js';
import { RecordProposalCommand } from './application/use-cases/record-proposal.command.js';
import { ReadProposalsQuery } from './application/use-cases/read-proposals.query.js';
import { OpenProposalQuery } from './application/use-cases/open-proposal.query.js';
import { ResolveProposalCommand } from './application/use-cases/resolve-proposal.command.js';
import {
  DrizzleConnectionRepository,
  DrizzleTransactionStore,
} from './infrastructure/db/repositories/drizzle-connection-repository.js';
import type { CookieStore } from './infrastructure/http/cookie-session.js';
import { CookieSession } from './infrastructure/http/cookie-session.js';
import { systemClock } from './ports/clock.js';

/**
 * Where the application is assembled.
 *
 * One module rather than a framework hook, because Next.js offers several
 * places to do this and none of them is *one* place. A module is boring,
 * obvious to a reader, and — importantly — fails at import when configuration is
 * missing, which is the behaviour the requirement asks for: the application must
 * not start with a value it invented. See design W-E.
 *
 * Nothing here decides anything. Every dependency it wires is independently
 * tested with a fake; the only claim worth making about this file is that it is
 * the sole route to BattleGrid, which is asserted structurally.
 */

const random = {
  token: (bytes: number): string => randomBytes(bytes).toString('base64url'),
  codeChallengeS256: (verifier: string): string =>
    createHash('sha256').update(verifier).digest('base64url'),
};

/** Built once. Reused across requests; the pool is the expensive part. */
let cached: Infrastructure | null = null;

interface Infrastructure {
  readonly connections: DrizzleConnectionRepository;
  readonly transactions: DrizzleTransactionStore;
  readonly audit: DrizzleAuditRepository;
  readonly confirmations: DrizzleConfirmationStore;
  readonly proposals: DrizzleProposalStore;
  readonly signalRecord: DrizzleSignalRecordStore;
  readonly battlegrid: McpBattleGridAdapter;
  readonly agents: McpAgentAdapter;
  readonly strategies: McpStrategyAdapter;
  readonly radar: McpRadarAdapter;
  readonly market: McpMarketAdapter;
  readonly positions: McpPositionsAdapter;
  readonly grid: McpMarketGridAdapter;
  readonly explorer: McpExplorerAdapter;
  readonly sessionSecret: string;
  readonly secureCookies: boolean;
  /** Set when this deployment holds the owner's own credential. */
  readonly personal: PersonalConfig | undefined;
  /** One trivial database round trip; resolves nothing else. */
  readonly health: () => Promise<void>;
}

function infrastructure(): Infrastructure {
  if (cached) return cached;

  const config = loadConfig();
  const db = drizzle(new Pool({ connectionString: config.databaseUrl }));
  const cipher = createCipher(config.tokenEncryptionKey);

  const connections = new DrizzleConnectionRepository(db, cipher, randomUUID);
  const audit = new DrizzleAuditRepository(db, systemClock, randomUUID);
  const confirmations = new DrizzleConfirmationStore(db, systemClock);
  const proposals = new DrizzleProposalStore(db);
  const signalRecord = new DrizzleSignalRecordStore(db, randomUUID);

  const battlegrid = new McpBattleGridAdapter({
    config: config.battlegrid,
    audit,
    confirmations,
    // Where "what may this credential do" is answered. A delegated grant is read
    // from the connection BattleGrid issued; a personal key carries a
    // declaration the operator made. Two sources, one guard — see HeldScopes.
    heldScopes: config.personal
      ? new DeclaredScopes(config.personal.scopes)
      : new ConnectionScopes(connections),
    // And where "what can this user do about it" is answered. Same shape, same
    // reason: a delegated grant can be obtained again, a configured key can only
    // be replaced by the person who configured it. Fixed here so that no failure
    // path has to work it out.
    remedy: config.personal ? 'repair-the-key' : 'reconnect',
    fetch: globalThis.fetch,
  });

  cached = {
    connections,
    transactions: new DrizzleTransactionStore(db, systemClock),
    audit,
    confirmations,
    proposals,
    signalRecord,
    battlegrid,
    agents: new McpAgentAdapter(battlegrid),
    strategies: new McpStrategyAdapter(battlegrid),
    radar: new McpRadarAdapter(battlegrid),
    market: new McpMarketAdapter(battlegrid),
    positions: new McpPositionsAdapter(battlegrid),
    grid: new McpMarketGridAdapter(battlegrid),
    explorer: new McpExplorerAdapter(battlegrid),
    sessionSecret: config.sessionSecret,
    secureCookies: config.secureCookies,
    personal: config.personal,
    health: async () => {
      await db.execute(sql`select 1`);
    },
  };
  return cached;
}

/**
 * The health probe's whole world: is the process up, and does its database
 * answer. Deliberately not part of `app()` — a health check that resolves a
 * session fails for the wrong reason, so this path never touches cookies.
 */
export async function checkHealth(): Promise<void> {
  await infrastructure().health();
}

/**
 * The use cases a request may reach, bound to that request's cookie store.
 *
 * Everything a route needs, and nothing a route could use to reach BattleGrid
 * another way.
 */
export function app(cookies: CookieStore) {
  const i = infrastructure();
  const sessions = new CookieSession({
    cookies,
    secret: i.sessionSecret,
    clock: systemClock,
    secure: i.secureCookies,
  });

  const authority = new ResolveAuthorityQuery(i.connections, i.connections, i.battlegrid, systemClock);

  /**
   * Who a request acts for.
   *
   * Two implementations, picked here and never branched on downstream. A
   * personal deployment holds the owner's credential and authenticates nobody;
   * a delegated one resolves a session and refreshes a grant. Every route calls
   * `currentUser` and cannot tell which it got, which is the point.
   */
  const currentUser: ActingUser = i.personal
    ? new OwnerOnlyUser(i.personal.apiKey, new McpAccountAdapter(i.battlegrid))
    : new CurrentUserQuery(sessions, i.connections, authority);

  return {
    sessions,
    currentUser,
    // Null on a delegated deployment. The surface uses it to disclose that a
    // deployment authenticates nobody, which is true only of the personal one.
    personal: i.personal ?? null,

    startConnection: new StartConnectionCommand(i.battlegrid, i.transactions, random, systemClock),
    completeConnection: new CompleteConnectionCommand(
      i.battlegrid,
      i.transactions,
      i.connections,
      random,
      systemClock,
    ),
    // Disconnecting revokes upstream, so it needs the live token — and it must
    // come from the one place that refreshes, or a disconnect after an idle
    // period would present an expired token and leave the grant alive.
    disconnect: new DisconnectCommand(i.battlegrid, i.connections, {
      accessTokenFor: async (userId) => (await authority.execute(userId)).accessToken,
    }),

    listAudit: new ListAuditQuery(i.audit),

    listAgents: new ListAgentsQuery(i.agents),
    createAgent: new CreateAgentCommand(i.agents),
    readCatalog: new ReadCatalogQuery(i.agents),
    updateAgent: new UpdateAgentCommand(i.agents),
    readThoughtLog: new ReadThoughtLogQuery(i.agents),
    readBudget: new ReadBudgetQuery(i.agents),
    // The same agent, asked what its settings are *against*. Two ports: three
    // readings come from the agents surface, and the fourth — the account
    // balance an exposure cap is measured against — is an account-level fact
    // that no agent read carries.
    readRiskReading: new ReadRiskReadingQuery(i.agents, new McpAccountStateAdapter(i.battlegrid)),
    readTradingRecord: new ReadTradingRecordQuery(i.agents),
    readTradeStory: new ReadTradeStoryQuery(i.agents),
    readPipeline: new ReadPipelineQuery(i.agents),
    readOwnEvaluation: new ReadOwnEvaluationQuery(i.agents),
    readDeployments: new ReadDeploymentsQuery(i.radar),
    // Three ports because the question needs three answers: the gates come
    // from the agent, the coins from the radar, and the fallback coins from
    // the market. The use-case is the only place that knows all three.
    readQualification: new ReadQualificationQuery(i.agents, i.radar, i.market),
    // Same rows `readPipeline` reads as one of three stages, asked a different
    // question: not what happened lately, but what keeps happening.
    readStoppages: new ReadStoppagesQuery(i.agents),
    // What it is holding, and what it could not get to the exchange. The
    // funnel half needs no new read — the counts were always there.
    // The clock is what turns a priced-at stamp into "4 minutes ago"; this is
    // the only place in the product that names a real one.
    readExposure: new ReadExposureQuery(i.positions, i.agents, systemClock),
    // Deploy and undeploy follow the same split: the describe reads the radar
    // fresh, states the consequence, and mints the token the perform spends.
    // Recording what a model suggests. Deliberately holds no BattleGrid port:
    // it cannot read a consequence or mint a confirmation, and a test asserts
    // that by construction rather than by behaviour.
    recordProposal: new RecordProposalCommand(i.proposals, random, systemClock),
    readProposals: new ReadProposalsQuery(i.proposals, systemClock),
    openProposal: new OpenProposalQuery(
      i.proposals,
      i.agents,
      // Its own instance rather than the one on `app`: the describe run when a
      // proposal is opened is the same class doing the same thing, and reaching
      // sideways into the object under construction would make the wiring
      // depend on declaration order.
      new DescribeEditQuery(i.agents, i.confirmations, random, systemClock),
      systemClock,
    ),
    resolveProposal: new ResolveProposalCommand(i.proposals),

    // The recorder. A command that writes only to this product's own store —
    // every platform call on its path is a read (DL-004), and the clock is
    // injected because coverage derives gaps from the times it stamps.
    captureSignals: new CaptureSignalsCommand(i.market, i.radar, i.signalRecord, systemClock),
    readSignalHistory: new ReadSignalHistoryQuery(i.signalRecord),
    readRecordCoverage: new ReadRecordCoverageQuery(i.signalRecord, systemClock),

    describeDeploy: new DescribeDeployQuery(i.radar, i.confirmations, random, systemClock),
    performDeploy: new PerformDeployCommand(i.radar),
    describeUndeploy: new DescribeUndeployQuery(i.radar, i.confirmations, random, systemClock),
    performUndeploy: new PerformUndeployCommand(i.radar),
    // Mints the confirmation `updateAgent` consumes. Separate objects on
    // purpose: the thing that performs the write must not be the thing that
    // authorises it.
    describeEdit: new DescribeEditQuery(i.agents, i.confirmations, random, systemClock),
    describeRebind: new DescribeRebindQuery(i.agents, i.strategies, i.confirmations, random, systemClock),
    rebindAgent: new RebindAgentCommand(i.agents, i.strategies),
    describeArchive: new DescribeArchiveQuery(i.agents, i.confirmations, random, systemClock),
    setLifecycle: new SetLifecycleCommand(i.agents),
    readJournal: new ReadAgentJournalQuery(i.agents),

    listStrategies: new ListStrategiesQuery(i.strategies),
    readStrategy: new ReadStrategyQuery(i.strategies),
    readVocabulary: new ReadVocabularyQuery(i.strategies),
    readSectionOptions: new ReadSectionOptionsQuery(i.strategies),
    // What a section *contains*, asked without a strategy — the contents are
    // vocabulary, and only membership is a strategy's own.
    readSectionLibrary: new ReadSectionLibraryQuery(i.strategies),
    composeColumn: new ComposeColumnQuery(i.strategies),
    readSignalLibrary: new ReadSignalLibraryQuery(i.strategies),
    readSignal: new ReadSignalQuery(i.strategies),
    readMetricIndex: new ReadMetricIndexQuery(i.strategies),
    readMetric: new ReadMetricQuery(i.strategies),
    checkColumn: new CheckColumnQuery(i.strategies),
    // The scorecard write follows the same split as every other: the
    // describe states the blast radius and mints; the perform spends.
    describeRetune: new DescribeRetuneQuery(i.strategies, i.confirmations, random, systemClock),
    retuneRule: new RetuneRuleCommand(i.strategies),
    previewComposition: new PreviewCompositionQuery(i.strategies),
    // The drafting half of the same question, and read-only for the same
    // reason: it asks the platform to resolve a condition that does not exist
    // yet. It saves nothing; saving is the describe below, a separate act.
    tryCondition: new TryConditionQuery(i.strategies),
    // Saving one. Its own instances of the compile and the apply describe,
    // rather than the ones on `app`: reaching sideways into the object under
    // construction would make the wiring depend on declaration order — the
    // same reasoning `openProposal` records. Both are stateless.
    describeConditionWrite: new DescribeConditionWriteQuery(
      i.strategies,
      new CompilePlanCommand(i.strategies),
      new DescribeApplyQuery(i.confirmations, random, systemClock),
    ),
    simulateAggregate: new SimulateAggregateQuery(i.strategies),
    // Two use cases, not one with a flag. Compiling writes nothing; applying
    // writes to every bound agent at once.
    compilePlan: new CompilePlanCommand(i.strategies),
    describeApply: new DescribeApplyQuery(i.confirmations, random, systemClock),
    applyPlan: new ApplyPlanCommand(i.strategies),
    forkStrategy: new ForkStrategyCommand(i.strategies),
    describeArchiveStrategy: new DescribeArchiveStrategyQuery(i.confirmations, random, systemClock),
    setStrategyActive: new SetStrategyActiveCommand(i.strategies),

    watchArena: new WatchArenaQuery(i.grid),
    // The rulebook and one session, read apart from the arena list: the first
    // is one unscoped call, the second is three calls about a session the user
    // asked for, and neither belongs in a fan-out over fifty rows.
    readGameRules: new ReadGameRulesQuery(i.grid),
    openGridSession: new OpenGridSessionQuery(i.grid),
    readField: new ReadFieldQuery(i.explorer),
    readCompetitor: new ReadCompetitorQuery(i.explorer),
    readEvaluation: new ReadEvaluationQuery(i.explorer),
  };
}

export type App = ReturnType<typeof app>;
