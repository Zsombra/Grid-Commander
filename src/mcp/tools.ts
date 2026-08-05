import type { App } from '@/composition.js';

/**
 * What a model may ask this product.
 *
 * A table rather than a series of `server.tool(...)` calls, for one reason:
 * the read-only guard has to be able to read it. The whole safety argument
 * of this surface is "no tool reaches a use-case that mutates", and a
 * claim like that has to be checkable by a test rather than by reading
 * forty registration calls.
 *
 * `useCase` names a key on `App`. Every tool goes through the same
 * use-cases the web routes call — nothing here reaches a port. That is the
 * payoff of the architecture: the use-cases already are the "data frame"
 * a model needs, complete with the derivations and refusals this product
 * learned the hard way.
 */

/** The authority every read is made with. Resolved once, at boot. */
export interface Authority {
  readonly userId: string;
  readonly accessToken: string;
}

export interface ToolDefinition {
  readonly name: string;
  /**
   * What this answers, in the operator's terms.
   *
   * Written for a model that will paraphrase it to a human, so each one
   * names the states that can come back. A model that knows `unreadable`
   * is possible can say "BattleGrid did not answer" instead of inventing
   * "you have none".
   */
  readonly description: string;
  /** The `App` key this calls. Checked against `App` by the type system. */
  readonly useCase: keyof App;
  /** JSON Schema properties, or `{}` for a tool that takes only authority. */
  readonly input: Readonly<Record<string, unknown>>;
  readonly required?: readonly string[];
  /** Builds the use-case argument from the model's input plus authority. */
  readonly call: (
    app: App,
    authority: Authority,
    args: Readonly<Record<string, unknown>>,
  ) => Promise<unknown>;
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const optionalNum = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined;

const AGENT_ID = {
  agentId: { type: 'string', description: 'The agent\'s id, from list_agents.' },
} as const;

const STRATEGY_ID = {
  strategyId: { type: 'string', description: 'The strategy\'s id, from list_strategies.' },
} as const;

const LIMIT = {
  limit: { type: 'integer', minimum: 1, maximum: 50, description: 'How many rows (default 10).' },
} as const;

/**
 * The read surface, grouped as an operator asks rather than as BattleGrid
 * names things. "Why didn't it trade" is one question; on the platform it
 * spans three tools and needs the threshold-in-force distinction to answer
 * honestly. That work is already done in `readPipeline`.
 */
export const TOOLS: readonly ToolDefinition[] = [
  {
    name: 'list_agents',
    description:
      'Every trading agent on the account, with its status, what strategy it is bound to, ' +
      'and how many agent slots are used. Answers "agents", "empty" (none exist), or ' +
      '"unreadable" (BattleGrid did not answer — not the same as having none).',
    useCase: 'listAgents',
    input: {},
    call: (app, who) => app.listAgents.execute(who),
  },
  {
    name: 'read_agent_thinking',
    description:
      "One agent's decision cycles, newest first: what it reasoned, how confident it was, " +
      'and what it decided. Answers "entries", "empty" (it has not reasoned yet), or "unreadable".',
    useCase: 'readThoughtLog',
    input: { ...AGENT_ID, ...LIMIT },
    required: ['agentId'],
    call: (app, who, a) =>
      app.readThoughtLog.execute({ ...who, agentId: str(a['agentId']), limit: optionalNum(a['limit']) }),
  },
  {
    name: 'read_agent_limits',
    description:
      'How close an agent is to each ceiling that would stop it. Note that an unconfigured ' +
      'gauge reports remaining 0, which means "no cap set" — not "at the limit".',
    useCase: 'readBudget',
    input: AGENT_ID,
    required: ['agentId'],
    call: (app, who, a) => app.readBudget.execute({ ...who, agentId: str(a['agentId']) }),
  },
  {
    name: 'read_trading_record',
    description:
      'Every trade an agent closed, with net P&L after fees, slippage each side, leverage, ' +
      'the conviction it opened on, and why it closed — plus a summary computed from those ' +
      "trades. The summary is derived here, not published by BattleGrid, whose own " +
      'performance figures read zero for accounts carrying real losses.',
    useCase: 'readTradingRecord',
    input: { ...AGENT_ID, ...LIMIT },
    required: ['agentId'],
    call: (app, who, a) =>
      app.readTradingRecord.execute({ ...who, agentId: str(a['agentId']), limit: optionalNum(a['limit']) }),
  },
  {
    name: 'read_decision_pipeline',
    description:
      'Why an agent did or did not trade: how much it evaluated against how much it acted on, ' +
      'then the three places a candidate can end — stopped before evaluation (with the ' +
      "platform's reason code and its numbers), evaluated and skipped (scored against the " +
      'threshold that was in force at the time, not today\'s), or decided. Each part can be ' +
      'empty or unreadable on its own.',
    useCase: 'readPipeline',
    input: { ...AGENT_ID, ...LIMIT },
    required: ['agentId'],
    call: (app, who, a) =>
      app.readPipeline.execute({ ...who, agentId: str(a['agentId']), limit: optionalNum(a['limit']) }),
  },
  {
    name: 'read_evaluation',
    description:
      'One evaluation in full: every signal the agent consulted — including the ones that did ' +
      'not fire, which are usually most of them — with its score, bias, raw indicator readings ' +
      "and the platform's own sentence; how the aggregate was attributed; the chain from gate " +
      'to outcome; and what the decision cost to think. Get the evaluation id from ' +
      'read_decision_pipeline.',
    useCase: 'readOwnEvaluation',
    input: {
      ...AGENT_ID,
      logId: { type: 'string', description: 'The evaluation id, from read_decision_pipeline.' },
    },
    required: ['agentId', 'logId'],
    call: (app, who, a) =>
      app.readOwnEvaluation.execute({ ...who, agentId: str(a['agentId']), logId: str(a['logId']) }),
  },
  {
    name: 'read_deployments',
    description:
      'Where an agent is actually scanning — each radar deployment\'s market, timeframe and ' +
      'standing — or a plain statement that it is configured but scanning nothing.',
    useCase: 'readDeployments',
    input: AGENT_ID,
    required: ['agentId'],
    call: (app, who, a) => app.readDeployments.execute({ ...who, agentId: str(a['agentId']) }),
  },
  {
    name: 'list_strategies',
    description: 'Every strategy on the account, system and forked, with its status and revision.',
    useCase: 'listStrategies',
    input: {},
    call: (app, who) => app.listStrategies.execute(who),
  },
  {
    name: 'read_strategy',
    description:
      'One strategy: its tagline, the report sections it composes, the signals it weighs, ' +
      'the conditions that decide direction, and its revision. A condition carrying no ' +
      'verdict is a named building block referenced by the ones that do — not an absence ' +
      'of opinion. An archived strategy is listed by BattleGrid but its detail answers ' +
      'NOT_FOUND.',
    useCase: 'readStrategy',
    input: STRATEGY_ID,
    required: ['strategyId'],
    call: (app, who, a) => app.readStrategy.execute({ ...who, strategyId: str(a['strategyId']) }),
  },
  {
    name: 'read_signal_library',
    description:
      'All 82 signals a strategy rule can reference, each with what it detects and when it fires.',
    useCase: 'readSignalLibrary',
    input: {},
    call: (app, who) => app.readSignalLibrary.execute(who),
  },
  {
    name: 'read_signal',
    description:
      "One signal's authoring card: what it detects, when it fires, worked examples, and its " +
      'parameters with bounds and defaults.',
    useCase: 'readSignal',
    input: { signalId: { type: 'string', description: 'The signal id, from read_signal_library.' } },
    required: ['signalId'],
    call: (app, who, a) => app.readSignal.execute({ ...who, signalId: str(a['signalId']) }),
  },
  {
    name: 'read_metric_index',
    description: 'The 75 metrics a report column can be built from, across ten families.',
    useCase: 'readMetricIndex',
    input: {},
    call: (app, who) => app.readMetricIndex.execute(who),
  },
  {
    name: 'read_metric',
    description: "One metric's transform-authoring detail, with the formula per transform.",
    useCase: 'readMetric',
    input: { metric: { type: 'string', description: 'The metric key, from read_metric_index.' } },
    required: ['metric'],
    call: (app, who, a) => app.readMetric.execute({ ...who, metric: str(a['metric']) }),
  },
  {
    name: 'simulate_aggregate',
    description:
      'What a set of signal weightings would score, and whether it would cross a gate. ' +
      "Stateless — saves nothing. Verified to reproduce the platform's own score when fed a " +
      "real evaluation's signals unchanged. At most 20 signals; 21 is refused, not truncated.",
    useCase: 'simulateAggregate',
    input: {
      signals: {
        type: 'array',
        maxItems: 20,
        items: {
          type: 'object',
          properties: {
            label: { type: 'string' },
            score: { type: 'number', minimum: 0, maximum: 1 },
            allocation: { type: 'integer', minimum: 0, maximum: 3 },
          },
          required: ['label', 'score', 'allocation'],
        },
      },
      gate: { type: 'number', minimum: 0, maximum: 1 },
    },
    required: ['signals', 'gate'],
    call: (app, who, a) =>
      app.simulateAggregate.execute({
        ...who,
        signals: Array.isArray(a['signals'])
          ? (a['signals'] as { label: string; score: number; allocation: number }[])
          : [],
        gate: typeof a['gate'] === 'number' ? a['gate'] : 0.5,
      }),
  },
  {
    name: 'read_field',
    description:
      'The population this account competes against: the field\'s own totals, the ranked agents ' +
      'with their models and records, a per-model-vendor breakdown, and where this account ' +
      'stands. Note that BattleGrid sometimes returns fewer agents than it counts, so `shown` ' +
      'and `totalAgents` are separate numbers and must not be conflated.',
    useCase: 'readField',
    input: {
      timeframe: { type: 'string', enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'ALL_TIME'] },
      sortBy: { type: 'string', enum: ['NET_PNL', 'WIN_RATE', 'TRADE_COUNT'] },
    },
    call: (app, who, a) =>
      app.readField.execute({
        ...who,
        timeframe: (str(a['timeframe']) || 'ALL_TIME') as 'ALL_TIME',
        sortBy: (str(a['sortBy']) || 'NET_PNL') as 'NET_PNL',
      }),
  },
  {
    name: 'read_competitor',
    description:
      "One public agent's whole record: how much it evaluated against how much it acted on, " +
      'its closed trades, its evaluations, and what it is holding now. Get the id from ' +
      'read_field.',
    useCase: 'readCompetitor',
    input: { ...AGENT_ID, ...LIMIT },
    required: ['agentId'],
    call: (app, who, a) =>
      app.readCompetitor.execute({ ...who, agentId: str(a['agentId']), limit: optionalNum(a['limit']) }),
  },
  {
    name: 'watch_arena',
    description:
      'Every Market Grid session — schedule, coin pool, player count, and whether this account ' +
      'has entered. Reads only; playing stakes a real entry fee and is not offered anywhere in ' +
      'this product.',
    useCase: 'watchArena',
    input: {},
    call: (app, who) => app.watchArena.execute(who),
  },
  {
    name: 'read_audit',
    description:
      "Every write Grid-Commander has made on the operator's behalf, with the actor, the tool " +
      'and the outcome. Useful precisely because this server cannot itself write: it is how ' +
      'the operator asks what the product has done for them.',
    useCase: 'listAudit',
    input: LIMIT,
    call: (app, who, a) =>
      app.listAudit.execute({ userId: who.userId, limit: optionalNum(a['limit']) ?? 20 }),
  },
  /**
   * Proposing.
   *
   * Seven tools over one use-case, named for what an operator would ask for
   * rather than for the operation key underneath. A model looking for "stop
   * this agent trading" should find something, and `propose_agent_change` with
   * a `changes` bag is what it finds.
   *
   * None of these reaches BattleGrid. `RecordProposalCommand` holds no
   * platform port at all, so `mcp-read-only.test.ts` passes them without an
   * exemption — which is the point of deriving that guard from reachability
   * rather than from a name.
   */
  {
    name: 'propose_agent_change',
    description:
      'Propose changing an agent’s settings — trading mode, limits, position sizing, name. ' +
      'Records the intent only: BattleGrid is not contacted, nothing is reserved, and the ' +
      'agent is unchanged until a person opens the proposal in the web app and agrees to ' +
      'what it would do against the agent as it is then.',
    useCase: 'recordProposal',
    input: { ...AGENT_ID, changes: { type: 'object', description: 'The settings to change.' } },
    required: ['agentId', 'changes'],
    call: (app, who, a) =>
      app.recordProposal.execute({
        userId: who.userId,
        operation: 'edit',
        target: str(a['agentId']),
        values: { changes: a['changes'] },
      }),
  },
  {
    name: 'propose_agent_rebind',
    description:
      'Propose moving an agent onto a different strategy. This replaces the agent’s entire ' +
      'configuration with the destination strategy’s, so it is one of the largest changes ' +
      'available. Records the intent only; the consequence is stated to a person before it ' +
      'happens.',
    useCase: 'recordProposal',
    input: { ...AGENT_ID, toStrategyId: { type: 'string', description: 'Strategy to move it to.' } },
    required: ['agentId', 'toStrategyId'],
    call: (app, who, a) =>
      app.recordProposal.execute({
        userId: who.userId,
        operation: 'rebind',
        target: str(a['agentId']),
        values: { toStrategyId: str(a['toStrategyId']) },
      }),
  },
  {
    name: 'propose_agent_archive',
    description:
      'Propose archiving an agent, which stops it and frees its slot. Records the intent ' +
      'only; how many deployments this would stop is counted and shown to a person before ' +
      'they agree.',
    useCase: 'recordProposal',
    input: { ...AGENT_ID },
    required: ['agentId'],
    call: (app, who, a) =>
      app.recordProposal.execute({
        userId: who.userId,
        operation: 'archiveAgent',
        target: str(a['agentId']),
        values: {},
      }),
  },
  {
    name: 'propose_deploy',
    description:
      'Propose deploying an agent to scan a coin on a timeframe. Records the intent only. ' +
      'Whether the deployment is even possible is resolved when a person opens it, not now.',
    useCase: 'recordProposal',
    input: {
      ...AGENT_ID,
      coinId: { type: 'string', description: 'Coin ticker, e.g. BTC.' },
      timeframe: { type: 'string', description: 'A timeframe the platform accepts.' },
    },
    required: ['agentId', 'coinId', 'timeframe'],
    call: (app, who, a) =>
      app.recordProposal.execute({
        userId: who.userId,
        operation: 'deploy',
        target: str(a['agentId']),
        values: { coinId: str(a['coinId']), timeframe: str(a['timeframe']) },
      }),
  },
  {
    name: 'propose_undeploy',
    description:
      'Propose removing an agent’s radar deployment from a coin, so it stops scanning it. ' +
      'Records the intent only; open positions are counted and shown to a person first.',
    useCase: 'recordProposal',
    input: { ...AGENT_ID, coinId: { type: 'string', description: 'Coin ticker, e.g. BTC.' } },
    required: ['agentId', 'coinId'],
    call: (app, who, a) =>
      app.recordProposal.execute({
        userId: who.userId,
        operation: 'undeploy',
        target: str(a['agentId']),
        values: { coinId: str(a['coinId']) },
      }),
  },
  {
    name: 'propose_signal_retune',
    description:
      'Propose changing one signal rule’s weight or whether it is required. This reaches ' +
      'every agent bound to the strategy at once, so the blast radius is counted and shown ' +
      'to a person before they agree. Records the intent only. Use simulate_aggregate first ' +
      'to see what the re-weighting would score.',
    useCase: 'recordProposal',
    input: {
      strategyId: { type: 'string', description: 'The strategy holding the rule.' },
      signalId: { type: 'string', description: 'The signal to retune.' },
      intent: { type: 'object', description: 'allocation and/or required.' },
    },
    required: ['strategyId', 'signalId', 'intent'],
    call: (app, who, a) =>
      app.recordProposal.execute({
        userId: who.userId,
        operation: 'retuneRule',
        target: str(a['strategyId']),
        values: { signalId: str(a['signalId']), intent: a['intent'] },
      }),
  },
  {
    name: 'propose_strategy_archive',
    description:
      'Propose archiving a strategy. Records the intent only; how many agents depend on it ' +
      'is counted and shown to a person before they agree.',
    useCase: 'recordProposal',
    input: { strategyId: { type: 'string', description: 'The strategy to archive.' } },
    required: ['strategyId'],
    call: (app, who, a) =>
      app.recordProposal.execute({
        userId: who.userId,
        operation: 'archiveStrategy',
        target: str(a['strategyId']),
        values: {},
      }),
  },
];

/**
 * What this server will not do, said where a model will read it.
 *
 * A model asked to archive an agent should learn where that happens rather
 * than trying seventeen tool names. This text is part of the server's
 * instructions, not decoration.
 */
export const READ_ONLY_NOTICE =
  'This server is read-only against the operator’s BattleGrid account: it changes nothing ' +
  'there. It cannot create, change, rebind, archive, deploy, apply or disconnect anything, ' +
  'and no tool here will ever do so.\n\n' +
  'What it can do is **propose**. The propose_* tools record an intent — nothing is read ' +
  'from BattleGrid, nothing is reserved, and the account is untouched. The operator then ' +
  'opens the proposal in the Grid-Commander web app, where the product describes what the ' +
  'change would do against the account **as it is at that moment** and asks them to agree. ' +
  'Say that plainly: a recorded proposal is a suggestion awaiting a person, not a change.\n\n' +
  'Applying a compiled strategy plan cannot be proposed — its consequence is bound to a ' +
  'plan token that expires in five minutes, so it is done in the web app. Use read_audit to ' +
  'show the operator what has already been done on their behalf.';
