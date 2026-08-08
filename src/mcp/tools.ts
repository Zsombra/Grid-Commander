import type { App } from '@/composition.js';
import type { CoinSource } from '@/application/use-cases/read-qualification.query.js';

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
  /**
   * Declares that this tool persists something, so its annotations can say so.
   *
   * Nothing on this surface writes to BattleGrid — that is what the read-only
   * guard is for. But `propose_agent_change` writes a row to *this product's*
   * store, and `readOnlyHint` means "does not modify its environment", not
   * "does not modify BattleGrid". A client using that hint to decide what needs
   * the operator's approval would be reading a false one.
   *
   * Declared rather than inferred from the tool's name, and
   * `tests/mcp/annotations.test.ts` checks each declaration against whether the
   * use-case it names is a `Command` in `composition.ts` — this codebase's own
   * word for the write side. So a second writing tool cannot inherit a read's
   * annotation by being appended to the list and left undeclared.
   */
  readonly writes?: true;
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
const optionalStr = (v: unknown): string | undefined =>
  typeof v === 'string' && v ? v : undefined;
const optionalNum = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined;
/**
 * A list of strings the model sent, or nothing.
 *
 * Nothing rather than an empty list, because to `readQualification` those are
 * different requests: an absent `coinTickers` means "choose for me" and an empty
 * one would too, but a model that sent `[]` deliberately and a model that sent
 * nothing should reach the same code either way. Non-string entries are dropped
 * rather than coerced — `"1"` is not a ticker, and screening it would spend the
 * whole call on `NOT_FOUND`.
 */
const optionalStrings = (v: unknown): readonly string[] | undefined =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : undefined;

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
 * Where the screened coins came from, said in a sentence a model will repeat.
 *
 * `read_qualification` is the only tool here whose **subject** this product may
 * choose, and the choice changes what the answer means: "none of these qualify"
 * is a finding about the agent when the agent's deployments picked the coins,
 * and a finding about our fallback when a ranked list did. The use-case already
 * carries that as `CoinSource` — this renders it, because a model paraphrasing a
 * JSON body will carry the verdicts and can skip a discriminator nested two
 * levels down, and the operator on the other end is then told their agent is
 * stuck.
 *
 * The fallback names its reason for the same purpose it does everywhere else in
 * this product: an agent deployed nowhere and an agent whose deployments could
 * not be read produce identical coins and opposite conclusions.
 *
 * A second rendering of what `ScreenedCoins` renders on the web, and
 * deliberately so — that one is JSX for a person reading a page, this is one
 * string for a model composing a sentence. Both read the same `CoinSource`,
 * which stays the only place the choice is decided.
 */
function whereTheCoinsCameFrom(source: CoinSource): string {
  const screening = `Screening ${source.coins.join(', ')}`;
  /**
   * A cap that truncates in silence reads as "we covered everything". The
   * number left out is the use-case's to count — it knows what the platform
   * screens per call, and writing that limit here would be a second copy of a
   * figure BattleGrid owns.
   */
  const dropped =
    source.dropped > 0
      ? ` ${String(source.dropped)} more were left out: BattleGrid screens a limited number of ` +
        'coins in one call.'
      : '';

  if (source.kind === 'requested') return `${screening} — the coins you asked about.${dropped}`;
  if (source.kind === 'deployments') {
    return `${screening} — the coins this agent is deployed on.${dropped}`;
  }
  const why =
    source.because === 'not-deployed'
      ? 'this agent is deployed nowhere'
      : "this agent's deployments could not be read, so what it watches is unknown";
  return (
    `${screening} — Grid-Commander chose these, because ${why}. They are the platform's top ` +
    `movers by ${source.metric} over ${source.interval}, and this agent may never have looked ` +
    `at them.${dropped} Say that before reporting any verdict: these are not known to be coins ` +
    'this agent watches, so a verdict of “would not take it” is not evidence the agent is stuck.'
  );
}

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
    name: 'read_trade_story',
    description:
      'How one completed trade unfolded: the frozen candle series with the stop and target ' +
      'as placed and the entry and exit marked, then the order-lifecycle trail — placements, ' +
      'fills, and every reprice with both prices and whether the platform judged the move an ' +
      'improvement. Says when an evaluation never became a trade, when no such evaluation ' +
      'exists on the agent, and when the story or its trail could not be read — each ' +
      'distinctly. Trail prices are decimal strings as the platform sends them.',
    useCase: 'readTradeStory',
    input: {
      ...AGENT_ID,
      logId: { type: 'string', description: 'The evaluation id, from read_trading_record or read_decision_pipeline.' },
    },
    required: ['agentId', 'logId'],
    call: (app, who, a) =>
      app.readTradeStory.execute({ ...who, agentId: str(a['agentId']), logId: str(a['logId']) }),
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
      'standing — or a plain statement that it is configured but scanning nothing. An agent ' +
      'that is not ACTIVE still holds its slots and is reported as holding them without ' +
      'scanning, never as on duty; where every agent a deployment names is out of that ' +
      'lifecycle, the market is reported as deployed and unscanned. Answers "deployed", ' +
      '"not-deployed", "unreadable", or "no-such-agent" for an id this account does not hold.',
    useCase: 'readDeployments',
    input: AGENT_ID,
    required: ['agentId'],
    /**
     * The roster read is not incidental here — it is the half of the answer
     * the radar does not carry.
     *
     * A slot looks identical whether the agent in it is active or archived, so
     * standing cannot be derived from the radar alone (live 2026-08-06:
     * `SP500@15m` holding only `Volatilis[ARCHIVED]`). The web surfaces have
     * already read the roster on the page they render; a model has sent an id
     * and nothing else, so this reads it here rather than letting the tool ask
     * a question it cannot answer honestly.
     *
     * A roster that will not answer costs the whole call, deliberately: an
     * `unreadable` naming the lifecycle as the missing piece is honest, and
     * standing computed against a lifecycle nobody read is the defect this
     * change removes.
     */
    call: async (app, who, a) => {
      const agentId = str(a['agentId']);
      const { roster } = await app.listAgents.execute(who);
      if (roster.kind === 'unreadable') {
        return {
          kind: 'unreadable',
          reason:
            `The roster could not be read, so this agent's lifecycle is unknown and whether ` +
            `it is scanning cannot be stated: ${roster.reason}`,
          cause: roster.cause,
        };
      }
      const agents = roster.kind === 'agents' ? roster.agents : [];
      const agent = agents.find((x) => x.id === agentId);
      if (!agent) {
        /**
         * Its own answer rather than an `unreadable`. The roster was read and
         * this account does not hold that agent — neither `refused` nor
         * `unreachable` describes that, and borrowing one would tell a model
         * to retry or to check its authority over a mistyped id.
         */
        return {
          kind: 'no-such-agent',
          agentId,
          reason: `No agent on this account has the id "${agentId}". list_agents has the ids.`,
        };
      }
      return app.readDeployments.execute({ ...who, agent, roster: agents });
    },
  },
  /**
   * The only tool here that asks about now.
   *
   * Everything else on this surface is retrospective — what an agent decided,
   * what stopped it, what it closed — so a model asked "why is my agent not
   * trading" has to reason forward from backward evidence. The platform will
   * simply answer: it scores the agent's gates against live coins, spends no
   * decision, and the agent does not act.
   *
   * `coinTickers` declares no `maxItems`. The platform caps how many coins one
   * call screens, and `readQualification` applies that cap by **dropping the
   * surplus and reporting how many** rather than by refusing — a limit in the
   * schema would tell a client the call fails when it does not, and would be a
   * second copy of a number BattleGrid owns and has moved before.
   */
  {
    name: 'read_qualification',
    description:
      'Whether an agent would take a coin right now, and what is stopping it — the only ' +
      'forward-looking read here, and it costs the agent no decision. Per coin: whether it ' +
      'qualifies, long and short kept apart because they disagree, and every gate as a measured ' +
      'value beside the threshold it is judged against. Which coins were screened is part of ' +
      'the answer and not background: name coinTickers and they are yours, omit it and the ' +
      'product screens the coins the agent is deployed on, or a ranked list from the platform ' +
      'when the agent is deployed nowhere. Always report where the coins came from — “none of ' +
      'these qualify” is a finding about the agent only when the agent’s own coins were the ' +
      'ones screened.',
    useCase: 'readQualification',
    input: {
      ...AGENT_ID,
      coinTickers: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Tickers to screen, e.g. ["BTC","ETH"]. Omit to let the product choose — it says ' +
          'which coins it chose and why. One unknown ticker makes BattleGrid refuse the whole ' +
          'screening, so a guessed symbol costs the good ones too.',
      },
    },
    required: ['agentId'],
    call: async (app, who, a) => {
      const screening = await app.readQualification.execute({
        ...who,
        agentId: str(a['agentId']),
        coinTickers: optionalStrings(a['coinTickers']),
      });
      /**
       * "Nothing could be screened" is already a sentence about this product's
       * inability to pick a subject, and it is not a verdict about the agent.
       * Passed through as it is.
       */
      if (screening.kind === 'no-coins') return screening;
      /**
       * Provenance first, and ahead of the verdicts in the serialised body —
       * the one requirement of this tool that a plain pass-through would fail.
       * `source` still travels intact beneath it, because a model that wants to
       * act on the fallback needs the reason as a value and not as prose.
       */
      return {
        kind: screening.kind,
        screening: whereTheCoinsCameFrom(screening.source),
        source: screening.source,
        result: screening.result,
      };
    },
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
      'Every signal a strategy rule can reference, each with what it detects and when it fires.',
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
    description:
      'Every metric a report column can be built from, grouped into the families the ' +
      'platform defines.',
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
      "real evaluation's signals unchanged. Over the schema's limit the call is refused " +
      'rather than truncated — the schema states the limit itself.',
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
  /**
   * The signal record.
   *
   * Both tools read this product's own store, not BattleGrid — the record the
   * capture CLI grows. They are the boundary the coverage requirement crosses
   * for a model: a gap must arrive as a gap, because a model reading a hole in
   * the data and calling it a quiet market would be manufacturing evidence.
   */
  {
    name: 'read_signal_history',
    description:
      "One coin's recorded signal history, from Grid-Commander's own store — not a live " +
      'BattleGrid read. Captures newest first, each with its capture time, the price at that ' +
      'moment, the aggregate score, dominant bias, how many of the evaluated signals ' +
      'triggered, which platform generation answered, and why those coins were being ' +
      'recorded. Failed capture attempts appear as themselves, with reasons — a hole in ' +
      'this record means nothing recorded, never that the signals were quiet. Pass signalId ' +
      'to also get that one signal\'s reading at each capture, with the price beside it. ' +
      '`empty` means this coin has never been captured; `unreadable` means the record did ' +
      'not answer, which says nothing about what it holds.',
    useCase: 'readSignalHistory',
    input: {
      coinTicker: { type: 'string', description: 'The coin, e.g. "BTC".' },
      signalId: {
        type: 'string',
        // No example id: signal ids are platform vocabulary, read at runtime
        // and never written into source — the rule that held when a metric
        // was removed from every enum in one deployment.
        description: "One signal's id, exactly as read_signal_library lists it — optional.",
      },
      interval: {
        type: 'string',
        description: 'Narrow to captures at one interval, e.g. "4h" — optional.',
      },
      ...LIMIT,
    },
    required: ['coinTicker'],
    call: (app, who, a) =>
      app.readSignalHistory.execute({
        userId: who.userId,
        coinTicker: str(a['coinTicker']),
        signalId: optionalStr(a['signalId']),
        interval: optionalStr(a['interval']),
        limit: optionalNum(a['limit']),
      }),
  },
  {
    name: 'read_record_coverage',
    description:
      "What the signal record holds and how continuous it is, from Grid-Commander's own " +
      'store: per coin and interval, when recording started, the latest capture, how many ' +
      'captures exist, failed attempts counted apart, and the gaps — spans where nothing ' +
      'recorded, stated so they cannot be mistaken for calm. Coins that were attempted and ' +
      'never once captured are listed too, as are runs that covered nothing, with reasons. ' +
      '`never-recorded` means recording has not started and the answer says how to start ' +
      'it; `unreadable` means the record did not answer, which is not the same as empty.',
    useCase: 'readRecordCoverage',
    input: {},
    call: (app, who) => app.readRecordCoverage.execute({ userId: who.userId }),
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
      'Every Market Grid session — schedule, coin pool, entry fee, prize pool, how many more ' +
      'players it needs, and whether this account has entered. Reads only; playing stakes a ' +
      'real entry fee and is not offered anywhere in this product.',
    useCase: 'watchArena',
    input: {},
    call: (app, who) => app.watchArena.execute(who),
  },
  {
    name: 'read_game_rules',
    description:
      'What Market Grid is, in BattleGrid’s own numbers: the grid shape and how many coins a ' +
      'game calls, the window it is scored over, the entry fee, what a right call multiplies, ' +
      'what the captain pick is worth, what a wrong one costs, and whether a jackpot rides on ' +
      'it. The economics live on the game preset rather than on any one session.',
    useCase: 'readGameRules',
    input: {},
    call: (app, who) => app.readGameRules.execute(who),
  },
  {
    name: 'read_grid_session',
    description:
      'One Market Grid session: its schedule and status, whether this account entered it, and ' +
      'the state of its results. Before settlement BattleGrid answers that results are ' +
      'published afterwards — a state, not an error. After settlement this product reports ' +
      'that results exist and does not read them: that payload has never been observed, and ' +
      'nothing here is inferred from a declaration. Get the id from watch_arena.',
    useCase: 'openGridSession',
    input: {
      sessionId: { type: 'string', description: 'The session id, from watch_arena.' },
    },
    required: ['sessionId'],
    call: (app, who, a) => app.openGridSession.execute({ ...who, sessionId: str(a['sessionId']) }),
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
   * One tool so far, named for what an operator would ask for rather than for
   * the operation key underneath. A model looking for "stop this agent
   * trading" should find something, and `propose_agent_change` with a
   * `changes` bag is what it finds.
   *
   * DL-1 decided seven operations proposable. Only `edit` has its describe
   * wired in `OpenProposalQuery`, and a proposal that cannot be opened is a row
   * a human finds unusable — so the other six are absent here rather than
   * recordable-and-stuck. `checkProposal` tells a model they are coming.
   *
   * None of these reaches BattleGrid. `RecordProposalCommand` holds no
   * platform port at all, so `mcp-read-only.test.ts` passes them without an
   * exemption — which is the point of deriving that guard from reachability
   * rather than from a name.
   */
  {
    name: 'propose_agent_change',
    description:
      'Propose changing an agent’s settings. `changes` uses the agent’s own field names: ' +
      'displayName, brain, tradingConfig (which holds tradingMode and the money limits), ' +
      'arenaChallengeEnabled, overlayText. A field the agent does not own — anything the ' +
      'bound strategy owns, like signalRules or timeframe — is reported back as not ' +
      'accepted rather than silently sent. Records the intent only: BattleGrid is not ' +
      'contacted, nothing is reserved, and the agent is unchanged until a person opens ' +
      'the proposal in the web app and agrees to what it would do against the agent as it ' +
      'is then.',
    useCase: 'recordProposal',
    writes: true,
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
