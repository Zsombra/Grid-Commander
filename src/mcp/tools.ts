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
];

/**
 * What this server will not do, said where a model will read it.
 *
 * A model asked to archive an agent should learn where that happens rather
 * than trying seventeen tool names. This text is part of the server's
 * instructions, not decoration.
 */
export const READ_ONLY_NOTICE =
  'This server is read-only. It cannot create, change, rebind, archive, deploy, apply, or ' +
  'disconnect anything, and no tool here will ever do so. Changes to agents, strategies and ' +
  'deployments are made in the Grid-Commander web app, where each one names its consequence ' +
  'and is agreed to by a person before it happens. If the operator asks for a change, tell ' +
  'them that, and use read_audit to show them what has already been done.';
