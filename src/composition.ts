import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { loadConfig } from './config.js';
import { CreateAgentCommand } from './application/use-cases/create-agent.command.js';
import { CurrentUserQuery } from './application/use-cases/current-user.query.js';
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
import { AskAssistantCommand } from './application/use-cases/ask-assistant.command.js';
import { ListStrategiesQuery } from './application/use-cases/list-strategies.query.js';
import { CompilePlanCommand } from './application/use-cases/compile-plan.command.js';
import { ApplyPlanCommand, DescribeApplyQuery } from './application/use-cases/apply-plan.command.js';
import {
  DescribeArchiveStrategyQuery,
  ForkStrategyCommand,
  SetStrategyActiveCommand,
} from './application/use-cases/strategy-lifecycle.command.js';
import {
  DescribeRebindQuery,
  RebindAgentCommand,
} from './application/use-cases/rebind-agent.command.js';
import { ResolveAuthorityQuery } from './application/use-cases/resolve-authority.query.js';
import { UpdateAgentCommand } from './application/use-cases/update-agent.command.js';
import { McpAgentAdapter } from './infrastructure/battlegrid/agent-adapter.js';
import { McpStrategyAdapter } from './infrastructure/battlegrid/strategy-adapter.js';
import { McpBattleGridAdapter } from './infrastructure/battlegrid/mcp-adapter.js';
import { createCipher } from './infrastructure/crypto/envelope.js';
import {
  DrizzleAuditRepository,
  DrizzleConfirmationStore,
} from './infrastructure/db/repositories/drizzle-audit-repository.js';
import {
  DrizzleConnectionRepository,
  DrizzleTransactionStore,
} from './infrastructure/db/repositories/drizzle-connection-repository.js';
import { NotConfiguredAssistant } from './infrastructure/assistant/not-configured.js';
import type { AssistantPort } from './ports/assistant.js';
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
  readonly battlegrid: McpBattleGridAdapter;
  readonly agents: McpAgentAdapter;
  readonly strategies: McpStrategyAdapter;
  readonly assistant: AssistantPort;
  readonly sessionSecret: string;
  readonly secureCookies: boolean;
}

function infrastructure(): Infrastructure {
  if (cached) return cached;

  const config = loadConfig();
  const db = drizzle(new Pool({ connectionString: config.databaseUrl }));
  const cipher = createCipher(config.tokenEncryptionKey);

  const connections = new DrizzleConnectionRepository(db, cipher, randomUUID);
  const audit = new DrizzleAuditRepository(db, systemClock, randomUUID);
  const confirmations = new DrizzleConfirmationStore(db, systemClock);

  const battlegrid = new McpBattleGridAdapter({
    config: config.battlegrid,
    audit,
    confirmations,
    connections,
    fetch: globalThis.fetch,
  });

  cached = {
    connections,
    transactions: new DrizzleTransactionStore(db, systemClock),
    audit,
    confirmations,
    battlegrid,
    agents: new McpAgentAdapter(battlegrid),
    strategies: new McpStrategyAdapter(battlegrid),
    // Which model answers is a deployment decision (A-D). Until one is chosen,
    // the assistant says so rather than pretending.
    assistant: new NotConfiguredAssistant(),
    sessionSecret: config.sessionSecret,
    secureCookies: config.secureCookies,
  };
  return cached;
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

  return {
    sessions,
    currentUser: new CurrentUserQuery(sessions, i.connections, authority),

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
    describeRebind: new DescribeRebindQuery(i.agents, i.confirmations, random, systemClock),
    rebindAgent: new RebindAgentCommand(i.agents),
    describeArchive: new DescribeArchiveQuery(i.agents, i.confirmations, random, systemClock),
    setLifecycle: new SetLifecycleCommand(i.agents),
    readJournal: new ReadAgentJournalQuery(i.agents),

    listStrategies: new ListStrategiesQuery(i.strategies),
    readVocabulary: new ReadVocabularyQuery(i.strategies),
    // Two use cases, not one with a flag. Compiling writes nothing; applying
    // writes to every bound agent at once.
    compilePlan: new CompilePlanCommand(i.strategies),
    describeApply: new DescribeApplyQuery(i.confirmations, random, systemClock),
    applyPlan: new ApplyPlanCommand(i.strategies),
    forkStrategy: new ForkStrategyCommand(i.strategies),
    describeArchiveStrategy: new DescribeArchiveStrategyQuery(i.confirmations, random, systemClock),
    setStrategyActive: new SetStrategyActiveCommand(i.strategies),

    // The assistant's read-only toolset is derived inside the use case, from
    // the live discovered set. Nothing here can widen it.
    askAssistant: new AskAssistantCommand(i.battlegrid, i.assistant),
  };
}

export type App = ReturnType<typeof app>;
