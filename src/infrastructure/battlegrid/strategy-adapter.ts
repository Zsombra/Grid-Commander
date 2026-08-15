import { mapConditions } from './condition-mapper.js';
import { mapConditionOutcomes } from './condition-outcome-mapper.js';
import type {
  SignalRule,
  Strategy,
  StrategyDetail,
  StrategyQuota,
  StrategySection,
} from '@/domain/strategy/strategy.js';
import type {
  AuthoringRefusal,
  BudgetGauge,
  CoinSelection,
  ColumnCheckOutcome,
  ColumnContract,
  ColumnControls,
  ColumnOutput,
  ColumnProposal,
  ColumnRefusal,
  CompileResult,
  ForkResult,
  LifecycleResult,
  MetricHints,
  MetricListResult,
  MetricSummary,
  MetricTransform,
  PreviewLimits,
  RenderedSection,
  ReportPreviewOutcome,
  RuleMembership,
  SignalDefinition,
  SignalExample,
  SignalListResult,
  SignalParameter,
  SignalSummary,
  StrategiesPort,
  StrategyDetailResult,
  StrategyListResult,
  TransformParameter,
  VocabularyCategory,
  VocabularyResult,
  VocabularyTemplatesResult,
  SimulatedAttribution,
  SimulationResult,
  SimulationSignal,
} from '@/ports/strategies.js';
import type { SectionTemplate, TradeLevelPolicy } from '@/domain/strategy/strategy.js';
import type { BattleGridPort } from '@/ports/battlegrid.js';
import type { DiscoveredTool } from '@/domain/capability/tool-class.js';
import { declaredValues } from './declared-values.js';
import { malformed, messageOf, unreadable } from './unreadable.js';
import { RevisionConflictError } from '@/domain/errors.js';
import { ToolRefusedError } from './mcp-adapter.js';
import type { Confirmation } from '@/domain/capability/confirmation.js';

/**
 * Strategy operations, expressed as BattleGrid tool calls.
 *
 * Everything goes through `BattleGridPort.callTool` and therefore through the
 * guard sequence — classify, scope, confirmation, audit. `apply_strategy_plan` is
 * annotated destructive by the server, so the guard requires a confirmation for
 * it whether or not this file remembers to ask.
 *
 * **The envelope trap**: four of these tools take `{ request: payload }` rather
 * than the payload directly. Getting it wrong is a validation error, not a
 * silent misbehaviour, but it is the kind of asymmetry that gets "tidied up".
 */

const TOOLS = {
  list: 'list_strategies',
  compile: 'compile_strategy_plan',
  apply: 'apply_strategy_plan',
  fork: 'fork_strategy',
  archive: 'archive_strategy',
  restore: 'restore_strategy',
  categories: 'list_strategy_categories',
  get: 'get_strategy',
  vocabulary: 'list_strategy_vocabulary',
  signals: 'list_strategy_signals',
  signalDefinition: 'get_strategy_signal_definition',
  metricHints: 'get_metric_construction_hints',
  columnContract: 'get_strategy_column_contract',
  updateRule: 'update_strategy_signal_rule',
  preview: 'preview_strategy_report',
  ruleView: 'derive_strategy_rule_view',
  simulate: 'simulate_aggregate_score',
} as const;

/** The tools that require the strict outer `{request: …}` envelope. */
const ENVELOPED = new Set<string>([TOOLS.compile, TOOLS.apply, TOOLS.updateRule]);

export class McpStrategyAdapter implements StrategiesPort {
  constructor(private readonly battlegrid: BattleGridPort) {}

  async listStrategies(params: { userId: string; accessToken: string }): Promise<StrategyListResult> {
    try {
      const payload = await this.call(params, TOOLS.list, { includeInactive: true });
      const raw = payload['strategies'];
      // Decided here, where the platform was actually read, rather than by a
      // surface counting what it was handed. The same condition the agent
      // adapter uses: no array, or an empty one.
      if (!Array.isArray(raw) || raw.length === 0) return { kind: 'empty' };
      return {
        kind: 'strategies',
        strategies: raw.map(mapStrategy),
        quota: mapQuota(payload['quota']),
      };
    } catch (err) {
      return unreadable(err);
    }
  }

  async compilePlan(params: {
    userId: string;
    accessToken: string;
    request: Readonly<Record<string, unknown>>;
  }): Promise<CompileResult> {
    try {
      const payload = await this.call(params, TOOLS.compile, params.request);
      const planToken = payload['planToken'];
      const approvedPlan = payload['approvedPlan'];
      if (typeof planToken !== 'string' || typeof approvedPlan !== 'object' || approvedPlan === null) {
        return {
          kind: 'rejected',
          reason: 'BattleGrid returned no usable plan for this request.',
          refusal: null,
        };
      }
      return {
        kind: 'compiled',
        approvedPlan: approvedPlan as Record<string, unknown>,
        reviewContext: optionalObject(payload['reviewContext']),
        planToken,
      };
    } catch (err) {
      // The compiler refusing a request is an ordinary outcome — a bad value, or
      // nothing to change. It is not a failure of the product.
      //
      // The structure comes along now. It was always on the wire —
      // `ToolRefusedError` carries the refusal body verbatim — and flattening
      // it to a string was what turned "marker {X} names no condition of this
      // strategy, nearest is {Y}" into an unexplained wall.
      const message = messageOf(err);
      return { kind: 'rejected', reason: message, refusal: mapAuthoringRefusal(message) };
    }
  }

  async applyPlan(params: {
    userId: string;
    accessToken: string;
    strategyId: string;
    plan: Readonly<Record<string, unknown>>;
    planToken: string;
    confirmation: Confirmation;
  }): Promise<Readonly<Record<string, unknown>>> {
    return this.call(
      params,
      TOOLS.apply,
      { plan: params.plan, planToken: params.planToken, confirm: true },
      // **This was the fifth dead write path.** The issuer bound
      // `strategy:<id>#<intentDigest>` and this spent against `strategy:<id>`, so
      // `consume` never matched and every apply was refused by the product before
      // it reached BattleGrid. No test saw it: `FakeStrategiesPort.applyPlan`
      // does not go through `enforce()`.
      { confirmation: params.confirmation },
    );
  }

  async forkStrategy(params: {
    userId: string;
    accessToken: string;
    strategyId: string;
    sourceRevision: number;
    name?: string | undefined;
  }): Promise<ForkResult> {
    try {
      const payload = await this.call(params, TOOLS.fork, {
        strategyId: params.strategyId,
        sourceRevision: params.sourceRevision,
        // Only when the user chose one. Blank is not a name — the schema
        // declares minLength 1 — and an absent argument is how the platform is
        // told to use its own naming, `<parent> (fork)`.
        ...(params.name !== undefined && params.name.trim() !== ''
          ? { name: params.name }
          : {}),
      });
      return { kind: 'forked', strategy: mapStrategy(payload['strategy'] ?? payload) };
    } catch (err) {
      // The platform's answer reaches the person as its reason instead of
      // crashing the action — the same rule as `setActive` below. This arm is
      // real: a fork whose default name `<parent> (fork)` is already taken
      // answers INTERNAL_ERROR, not a clean refusal (live 2026-08-06 — see
      // openspec/backlog/forking-a-name-that-exists-is-a-500.md). Carried in
      // the platform's words, never re-diagnosed. Transport failures still
      // throw: "no answer" is not "no".
      if (err instanceof ToolRefusedError || err instanceof RevisionConflictError) {
        return { kind: 'refused', reason: err.message };
      }
      throw err;
    }
  }

  async readStrategy(params: {
    userId: string;
    accessToken: string;
    strategyId: string;
  }): Promise<StrategyDetailResult> {
    /**
     * Two calls, because the platform offers no single one.
     *
     * `get_strategy` defaults to *active visible* strategies. `includeInactive`
     * does not widen that — it **replaces** it with *owned PRIVATE, including
     * inactive*. The description says "only to load an owned PRIVATE strategy",
     * and the two modes are strictly disjoint:
     *
     *   |                    | SYSTEM     | archived PRIVATE |
     *   | default            | found      | NOT_FOUND        |
     *   | includeInactive    | NOT_FOUND  | found            |
     *
     * Verified against the live platform in all four cells. Sending
     * `includeInactive: true` unconditionally — which is what this did first —
     * made every SYSTEM strategy unreadable, and it rendered as "could not reach
     * BattleGrid" on a page where BattleGrid had answered perfectly clearly.
     *
     * So a detail page that serves both kinds must ask twice. The second call
     * happens only on a not-found, so the common read stays one round trip.
     */
    const first = await this.tryRead(params, false);
    if (first.kind !== 'missing') return first;
    return this.tryRead(params, true);
  }

  private async tryRead(
    params: { userId: string; accessToken: string; strategyId: string },
    includeInactive: boolean,
  ): Promise<StrategyDetailResult> {
    let payload: Record<string, unknown>;
    try {
      payload = await this.call(params, TOOLS.get, {
        strategyId: params.strategyId,
        ...(includeInactive ? { includeInactive: true } : {}),
      });
    } catch (err) {
      // A refusal carrying NOT_FOUND is the platform answering, not failing.
      // Read from the code the platform sent rather than from its prose — see
      // `ToolRefusedError`.
      if (err instanceof ToolRefusedError && err.code === 'NOT_FOUND') {
        return { kind: 'missing' };
      }
      return unreadable(err);
    }

    const raw = payload['strategy'];
    if (typeof raw !== 'object' || raw === null) return { kind: 'missing' };
    return {
      kind: 'strategy',
      detail: mapStrategyDetail(raw),
      // The condition array read twice on purpose: once into the shape a page
      // renders, once unread for the preview round trip. Collapsing them would
      // make what goes back to the platform depend on this product
      // understanding every form in a grammar still being rolled out.
      conditionsAsGiven: rawConditions((raw as Record<string, unknown>)['conditions']),
    };
  }

  async setActive(params: {
    userId: string;
    accessToken: string;
    strategyId: string;
    expectedRevision: number;
    active: boolean;
    confirmation?: Confirmation | undefined;
  }): Promise<LifecycleResult> {
    let payload: Record<string, unknown>;
    try {
      payload = await this.call(
        params,
        params.active ? TOOLS.restore : TOOLS.archive,
        {
          strategyId: params.strategyId,
          // Both tools require it. This sent `{ strategyId }` alone, so every
          // archive and every restore was refused for a missing argument — which
          // nothing noticed, because no write had ever reached the real platform.
          expectedRevision: params.expectedRevision,
          // Only `archive_strategy` requires it: it is the destructive one of the
          // pair. Sent where it is declared and nowhere else, rather than to both
          // for symmetry — an argument a tool does not declare is one more thing
          // that can be rejected.
          ...(params.active ? {} : { confirm: true }),
        },
        { confirmation: params.confirmation },
      );
    } catch (err) {
      /**
       * Restoring can come back needing repair — the strategy stays inactive
       * and the way forward is the RESTORE arm of the compile pipeline. A
       * distinct outcome, not an error, and it arrives on the refusal
       * channel: both tools declare an output whose only property is
       * `strategy`, so this used to be read from `payload['status']` — a key
       * that could never exist, leaving the whole repair-required surface
       * unreachable. The platform refuses as `{"code": …, "message": …}`,
       * which `ToolRefusedError` parses; the reason carried is the
       * platform's own words, not a constant.
       */
      if (
        err instanceof ToolRefusedError &&
        (err.code === 'REPAIR_REQUIRED' || err.message.includes('REPAIR_REQUIRED'))
      ) {
        return { kind: 'repair-required', reason: err.message };
      }
      // Any other answer the platform gave — a moved revision, a refusal
      // code — reaches the person as its reason instead of crashing the
      // action. Transport failures still throw: "no answer" is not "no".
      if (err instanceof ToolRefusedError || err instanceof RevisionConflictError) {
        return { kind: 'refused', reason: err.message };
      }
      throw err;
    }

    return { kind: 'changed', strategy: mapStrategy(payload['strategy'] ?? payload) };
  }

  async readVocabulary(params: { userId: string; accessToken: string }): Promise<VocabularyResult> {
    try {
      const payload = await this.call(params, TOOLS.categories, {});
      const raw = payload['categories'];
      if (!Array.isArray(raw)) return malformed('no categories returned');
      return { kind: 'vocabulary', categories: raw.map(mapCategory) };
    } catch (err) {
      return unreadable(err);
    }
  }

  /**
   * All section templates the platform's vocabulary advertises.
   *
   * `list_strategy_vocabulary` requires a category argument but returns the same
   * templates regardless of which category is passed — verified against the
   * live platform. We fetch categories first to get a valid key, then fetch
   * templates once with that key.
   *
   * The same payload carries `previewExecutionLimits`, new in v9.0.0, and it is
   * taken here rather than by a second read: `preview_strategy_report` moved its
   * limits to discovery, and discovery is this call.
   */
  async listVocabularyTemplates(params: { userId: string; accessToken: string }): Promise<VocabularyTemplatesResult> {
    try {
      const catPayload = await this.call(params, TOOLS.categories, {});
      const cats = Array.isArray(catPayload['categories']) ? catPayload['categories'] : [];
      const firstCat = cats.length > 0 ? String((cats[0] as Record<string, unknown>)['category'] ?? '') : '';
      if (!firstCat) return malformed('no categories available to fetch vocabulary');

      const vocabPayload = await this.call(params, TOOLS.vocabulary, { category: firstCat });
      const raw = Array.isArray(vocabPayload['templates']) ? vocabPayload['templates'] : [];
      const templates = raw.map(mapSectionTemplate).filter((t): t is SectionTemplate => t !== null);
      return { kind: 'templates', templates, limits: mapPreviewLimits(vocabPayload) };
    } catch (err) {
      return unreadable(err);
    }
  }

  async previewReport(params: {
    userId: string;
    accessToken: string;
    timeframe: string;
    sections: readonly StrategySection[];
    coinSelection: CoinSelection;
    conditions?: readonly Readonly<Record<string, unknown>>[] | undefined;
  }): Promise<ReportPreviewOutcome> {
    try {
      const payload = await this.call(params, TOOLS.preview, {
        timeframe: params.timeframe,
        // Sent only when there is something to resolve. A strategy defining no
        // conditions sends the payload it has always sent — the argument is new
        // and the outer object is closed, so the empty case stays byte-identical
        // rather than newly exposed to a schema this product has not previewed
        // against. What is sent is the platform's own array, back whole: see
        // `StrategyDetailResult`'s `conditionsAsGiven`.
        //
        // Both shapes this argument carries — a strategy's own conditions and a
        // draft composed beside them — are held against the record by
        // `payload-conformance.test.ts`. They were exempt while the probe's walk
        // flattened this nested union to its outer branch and read a clause's
        // `column` as a violation of a set the platform does not close; the walk
        // follows nested unions now (`the-record-flattens-the-condition-union`).
        ...(params.conditions !== undefined && params.conditions.length > 0
          ? { conditions: [...params.conditions] }
          : {}),
        // A custom table goes back whole — key alone is refused (-32602:
        // `title` and `columns` are required for `kind: 'custom'`). A
        // platform section is fully named by its key and carries nothing
        // else to send.
        sections: params.sections.map((s) => ({
          kind: s.kind,
          sectionKey: s.sectionKey,
          ...(s.title !== undefined ? { title: s.title } : {}),
          ...(s.timeframe !== undefined ? { timeframe: s.timeframe } : {}),
          ...(s.columns !== undefined ? { columns: s.columns } : {}),
        })),
        coinSelection:
          params.coinSelection.mode === 'ranked'
            ? {
                mode: 'ranked',
                limit: params.coinSelection.limit,
                ...(params.coinSelection.category !== undefined
                  ? { category: params.coinSelection.category }
                  : {}),
              }
            : { mode: 'explicit', tickers: [...params.coinSelection.tickers] },
      });
      return { kind: 'preview', preview: mapReportPreview(payload) };
    } catch (err) {
      // A refused draft is this surface's content — the platform's words,
      // never flattened. Anything else keeps its nature.
      if (err instanceof ToolRefusedError) return { kind: 'refused', reason: err.message };
      throw err;
    }
  }

  /**
   * What a set of weightings would score. Stateless — nothing is saved.
   *
   * A refusal is carried as a refusal. The platform rejects more than
   * twenty signals with a validation error, and a simulator that answered
   * a number when the platform declined would be inventing the one figure
   * a user came here to trust.
   */
  async simulateAggregate(params: {
    userId: string;
    accessToken: string;
    signals: readonly SimulationSignal[];
    gate: number;
  }): Promise<SimulationResult> {
    let payload: Record<string, unknown>;
    try {
      payload = await this.call(params, TOOLS.simulate, {
        signals: params.signals.map((s) => ({
          label: s.label,
          score: s.score,
          allocation: s.allocation,
        })),
        gate: params.gate,
      });
    } catch (err) {
      return { kind: 'refused', reason: err instanceof Error ? err.message : String(err) };
    }
    const n = (v: unknown): number | null =>
      typeof v === 'number' && Number.isFinite(v) ? v : null;
    const raw = Array.isArray(payload['attributions']) ? payload['attributions'] : [];
    return {
      kind: 'simulation',
      simulation: {
        aggregateScorePercent: n(payload['aggregateScorePercent']),
        gatePercent: n(payload['gatePercent']),
        // The platform's verdict, not a comparison recomputed here. It is
        // `>=`, and re-deriving it would be a second implementation of the
        // one rule this whole surface exists to report faithfully.
        wouldRoute: payload['wouldRoute'] === true,
        attributions: raw
          .map((r: unknown) => {
            const a = (r ?? {}) as Record<string, unknown>;
            const label = typeof a['label'] === 'string' && a['label'] ? a['label'] : null;
            if (label === null) return null;
            return {
              label,
              scorePercent: n(a['scorePercent']),
              allocation: n(a['allocation']),
              attributionPercent: n(a['attributionPercent']),
            };
          })
          .filter((a): a is SimulatedAttribution => a !== null),
      },
    };
  }

  async deriveRuleView(params: {
    userId: string;
    accessToken: string;
    sections: readonly StrategySection[];
  }): Promise<readonly RuleMembership[]> {
    const payload = await this.call(params, TOOLS.ruleView, {
      sections: params.sections.map((s) => ({ kind: s.kind, sectionKey: s.sectionKey })),
    });
    const raw = payload['rules'];
    if (!Array.isArray(raw)) throw new StrategyPayloadError('rules');
    return raw.map((entry) => {
      const r = (entry ?? {}) as Record<string, unknown>;
      const signalId = typeof r['signalId'] === 'string' && r['signalId'] ? r['signalId'] : null;
      if (signalId === null) throw new StrategyPayloadError('signalId');
      return {
        signalId,
        inReport: r['inReport'] === true,
        status: String(r['status'] ?? 'UNKNOWN'),
        defaultAllocation: num(r['reportDefaultAllocation']),
      };
    });
  }

  async updateSignalRule(params: {
    userId: string;
    accessToken: string;
    strategyId: string;
    expectedRevision: number;
    signalId: string;
    allocation: number;
    required: boolean;
    ruleParams?: Readonly<Record<string, unknown>> | undefined;
    confirmation: Confirmation;
  }): Promise<Readonly<Record<string, unknown>>> {
    return this.call(
      params,
      TOOLS.updateRule,
      {
        strategyId: params.strategyId,
        expectedRevision: params.expectedRevision,
        signalId: params.signalId,
        allocation: params.allocation,
        required: params.required,
        // Declared optional; sent only when the signal declares parameters —
        // an argument a tool does not expect is one more thing to reject.
        ...(params.ruleParams !== undefined ? { params: params.ruleParams } : {}),
      },
      { confirmation: params.confirmation },
    );
  }

  async listMetrics(params: { userId: string; accessToken: string }): Promise<MetricListResult> {
    try {
      // Unlike `templates` (identical for every category), the vocabulary's
      // `metrics` key IS narrowed by the category argument — established live
      // 2026-08-01: ten categories, 75 distinct metrics between them. The
      // full index is the union, read category by category.
      const catPayload = await this.call(params, TOOLS.categories, {});
      const cats = Array.isArray(catPayload['categories']) ? catPayload['categories'] : [];
      const keys = cats
        .map((c) => String(((c ?? {}) as Record<string, unknown>)['category'] ?? ''))
        .filter((k) => k.length > 0);
      if (keys.length === 0) return malformed('no categories available to fetch vocabulary');

      // Ten independent reads, merged in category order so the index is
      // deterministic. Concurrency is capped at four: fully sequential was
      // measured at ~35s live, and a ten-wide burst drew intermittent 504s
      // from the platform's gateway (2026-08-01) — this is the width that
      // did neither.
      const payloads: Record<string, unknown>[] = new Array<Record<string, unknown>>(keys.length);
      for (let start = 0; start < keys.length; start += 4) {
        const chunk = keys.slice(start, start + 4);
        const answers = await Promise.all(
          chunk.map((category) => this.call(params, TOOLS.vocabulary, { category })),
        );
        answers.forEach((payload, i) => {
          payloads[start + i] = payload;
        });
      }
      const seen = new Set<string>();
      const metrics = [];
      for (const payload of payloads) {
        const raw = Array.isArray(payload['metrics']) ? payload['metrics'] : [];
        for (const entry of raw) {
          const metric = mapMetricSummary(entry);
          if (seen.has(metric.id)) continue;
          seen.add(metric.id);
          metrics.push(metric);
        }
      }
      if (metrics.length === 0) return malformed('no metrics in the vocabulary');
      return { kind: 'metrics', metrics };
    } catch (err) {
      return unreadable(err);
    }
  }

  async metricHints(params: {
    userId: string;
    accessToken: string;
    metric: string;
  }): Promise<MetricHints> {
    const payload = await this.call(params, TOOLS.metricHints, { metric: params.metric });
    const m = payload['metric'];
    if (typeof m !== 'object' || m === null) throw new StrategyPayloadError('metric');
    const metric = m as Record<string, unknown>;
    const transforms = (Array.isArray(metric['transforms']) ? metric['transforms'] : []).map(
      mapMetricTransform,
    );
    return { summary: mapMetricSummary(metric), transforms };
  }

  async columnContract(params: {
    userId: string;
    accessToken: string;
    column: ColumnProposal;
  }): Promise<ColumnCheckOutcome> {
    const c = params.column;
    const args = {
      column: {
        metric: c.metric,
        transformId: c.transformId,
        timeframe: c.timeframe,
        ...(c.chainedTransformId !== undefined ? { chainedTransformId: c.chainedTransformId } : {}),
        ...(c.window !== undefined ? { window: c.window } : {}),
        ...(c.offset !== undefined ? { offset: c.offset } : {}),
        ...(c.side !== undefined ? { side: c.side } : {}),
        ...(c.inputs !== undefined ? { inputs: c.inputs.map((metric) => ({ metric })) } : {}),
        ...(c.bars !== undefined ? { bars: c.bars } : {}),
        ...(c.ordering !== undefined ? { ordering: c.ordering } : {}),
      },
    };
    try {
      const payload = await this.call(params, TOOLS.columnContract, args);
      const contract = payload['contract'];
      if (typeof contract !== 'object' || contract === null) throw new StrategyPayloadError('contract');
      return { kind: 'contract', contract: mapColumnContract(contract as Record<string, unknown>) };
    } catch (err) {
      // The validator's refusal is this surface's content — a structured
      // lesson in the column grammar, never flattened into a failure.
      if (err instanceof ToolRefusedError) {
        return { kind: 'refused', refusal: mapColumnRefusal(err.message) };
      }
      throw err;
    }
  }

  /**
   * The enumerated column controls, out of the *discovered* schema of the tool
   * that validates a column — the same discovery every session already
   * performs. Nothing here bakes in today's four relative timeframes, thirteen
   * absolute ones, two `bars` values or four `ordering` values; a deployment
   * that moves any of them moves this product with it.
   *
   * `declaredValues` rather than a hand-walk: `column.timeframe` is an `anyOf`
   * whose two branches pin `rel` and `abs` at the same path, and a walk taking
   * the first branch would report half the declaration — the exact failure the
   * brain-preset walk was written for.
   *
   * Empty on a discovery that failed. A declaration that could not be read is
   * not a platform with no timeframes, and the surfaces withhold the control
   * and say so rather than offering a guess.
   */
  async columnControls(params: {
    userId: string;
    accessToken: string;
  }): Promise<ColumnControls> {
    let tools: readonly DiscoveredTool[];
    try {
      tools = await this.battlegrid.discoverTools(params.accessToken);
    } catch {
      return { relativeTimeframes: [], absoluteTimeframes: [], bars: [], ordering: [], sides: [] };
    }
    const contract = tools.find((t) => t.name === TOOLS.columnContract);
    return {
      relativeTimeframes: declaredValues(contract, 'column.timeframe.rel'),
      absoluteTimeframes: declaredValues(contract, 'column.timeframe.abs'),
      bars: declaredValues(contract, 'column.bars'),
      ordering: declaredValues(contract, 'column.ordering'),
      sides: declaredValues(contract, 'column.side'),
    };
  }

  async listSignals(params: { userId: string; accessToken: string }): Promise<SignalListResult> {
    try {
      const payload = await this.call(params, TOOLS.signals, {});
      const raw = payload['signals'];
      if (!Array.isArray(raw)) return malformed('no signals returned');
      return { kind: 'signals', signals: raw.map(mapSignalSummary) };
    } catch (err) {
      return unreadable(err);
    }
  }

  async signalDefinition(params: {
    userId: string;
    accessToken: string;
    signalId: string;
  }): Promise<SignalDefinition> {
    const payload = await this.call(params, TOOLS.signalDefinition, { signalId: params.signalId });
    const sig = payload['signal'];
    if (typeof sig !== 'object' || sig === null) throw new StrategyPayloadError('signal');
    return mapSignalDefinition(sig as Record<string, unknown>);
  }

  // -- internals ---------------------------------------------------------

  private async call(
    who: { userId: string; accessToken: string },
    tool: string,
    payload: Readonly<Record<string, unknown>>,
    extras: { confirmation?: Confirmation | undefined } = {},
  ): Promise<Record<string, unknown>> {
    const result = await this.battlegrid.callTool({
      userId: who.userId,
      accessToken: who.accessToken,
      tool,
      // The envelope trap. `account` never goes inside `request`, and request
      // fields are never flattened beside it.
      args: ENVELOPED.has(tool) ? { request: payload } : payload,
      // The pair, split onto the two wire-level fields the guard reads. **One
      // place** — this is where a target could once again be composed by hand,
      // and a second mapping is the defect this change exists to remove.
      target: extras.confirmation?.target,
      confirmationToken: extras.confirmation?.token,
    });
    // Already the payload: the adapter unwrapped the MCP envelope. There was
    // an `asObject` here that returned `{}` for anything it did not recognise,
    // which is precisely how an unread envelope became "you have no agents".
    return result.content as Record<string, unknown>;
  }
}

export class StrategyPayloadError extends Error {
  constructor(field: string) {
    super(`BattleGrid returned a strategy with no usable "${field}"`);
  }
}

function mapStrategy(raw: unknown): Strategy {
  const s = (raw ?? {}) as Record<string, unknown>;

  // An id and a revision are not display fields. The id becomes `strategyId` on
  // a destructive apply and the revision becomes `expectedRevision` on a compile
  // and `sourceRevision` on a fork. Defaulting either would send a value nobody
  // read into an operation that reconfigures a fleet — the shape three earlier
  // production gates caught in three other layers. Refuse instead.
  const id = typeof s['id'] === 'string' && s['id'].length > 0 ? s['id'] : null;
  if (id === null) throw new StrategyPayloadError('id');

  const revision = typeof s['revision'] === 'number' ? s['revision'] : null;
  if (revision === null) throw new StrategyPayloadError('revision');

  return {
    id,
    name: String(s['name'] ?? '(unnamed)'),
    tagline: typeof s['tagline'] === 'string' ? s['tagline'] : null,
    description: typeof s['description'] === 'string' ? s['description'] : null,
    revision,
    scope: s['scope'] === 'SYSTEM' ? 'SYSTEM' : 'PRIVATE',
    // Display only — it never reaches a request, which composes its own.
    timeframe: typeof s['timeframe'] === 'string' ? s['timeframe'] : 'unknown',
    isActive: s['isActive'] !== false,
    // The platform's count. Deriving it by grouping agents would be a second
    // opinion, wrong whenever an agent moved between the two reads. See S-F.
    boundAgentCount: typeof s['boundAgentCount'] === 'number' ? s['boundAgentCount'] : 0,
    forkedFromStrategyId:
      typeof s['forkedFromStrategyId'] === 'string' ? s['forkedFromStrategyId'] : null,
  };
}

function mapQuota(raw: unknown): StrategyQuota | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const q = raw as Record<string, unknown>;
  const limit = q['limit'];
  // No limit, no capacity to report. Zeroes would read as "you have none left",
  // a specific claim nobody made — the defect three gates have now caught.
  if (typeof limit !== 'number') return null;
  const used = typeof q['used'] === 'number' ? q['used'] : 0;
  return {
    limit,
    used,
    remaining: typeof q['remaining'] === 'number' ? q['remaining'] : Math.max(0, limit - used),
  };
}

function mapCategory(raw: unknown): VocabularyCategory {
  const c = (raw ?? {}) as Record<string, unknown>;
  const category = String(c['category'] ?? '');
  return {
    category,
    label: String(c['label'] ?? category),
    purpose: String(c['purpose'] ?? ''),
    metricCount: typeof c['metricCount'] === 'number' ? c['metricCount'] : 0,
    ...(typeof c['whenToUse'] === 'string' ? { whenToUse: c['whenToUse'] } : {}),
    ...(typeof c['bestPractices'] === 'string' ? { bestPractices: c['bestPractices'] } : {}),
    ...(typeof c['commonMisuses'] === 'string' ? { commonMisuses: c['commonMisuses'] } : {}),
    ...(typeof c['examples'] === 'string' ? { examples: c['examples'] } : {}),
  };
}

/**
 * Maps one raw vocabulary template entry to a `SectionTemplate`.
 *
 * Two variants: entries with `sectionKey` are platform-native sections; entries
 * with `templateKey` are custom composites. Entries with neither are skipped —
 * they have no identity the edit page could use.
 *
 * **The name is read from `label` or from `title`.** The entry was mapped in
 * July against a payload carrying `label`; the surface record captured on
 * 2026-08-06 (server v11.0.0) shows the first template as
 * `{columns, kind, sectionKey, title}` — no `label` at all — so a mapper reading
 * only `label` renders the section checklist as a column of empty checkboxes.
 * Both are read rather than one replaced by the other: which key a deployment
 * sends is the platform's to change, and this product has now been wrong about
 * that twice.
 *
 * **The columns come through.** They were being dropped: `templates[]` carries
 * the thirteen-column definition of the section on every edit-page load, and
 * three keys of it were kept. Same shape as the two mapper gaps in `HANDOFF.md`
 * — the data was already on the wire.
 */
function mapSectionTemplate(raw: unknown): SectionTemplate | null {
  const t = (raw ?? {}) as Record<string, unknown>;
  const named = [t['label'], t['title']].find((v) => typeof v === 'string' && v.length > 0);
  const label = typeof named === 'string' ? named : '';
  const category = typeof t['category'] === 'string' ? t['category'] : undefined;
  // Carried whole, opaque. Absent stays absent: a template that published no
  // columns and one that renders none are different claims.
  const columns = Array.isArray(t['columns'])
    ? { columns: t['columns'] as readonly Readonly<Record<string, unknown>>[] }
    : {};

  if (typeof t['sectionKey'] === 'string' && t['sectionKey'].length > 0) {
    return {
      kind: 'platform',
      sectionKey: t['sectionKey'],
      label,
      ...(category ? { category } : {}),
      ...columns,
    };
  }
  if (typeof t['templateKey'] === 'string' && t['templateKey'].length > 0) {
    return {
      kind: 'custom',
      templateKey: t['templateKey'],
      label,
      ...(category ? { category } : {}),
      ...columns,
    };
  }
  return null;
}

/**
 * An optional nested object on a payload that was already read successfully.
 *
 * Empty is a truthful answer here, unlike for an envelope: `reviewContext`
 * carries advisory notes about a compiled plan, and a plan with none is
 * ordinary. This was called `asObject` and shared its name with the function
 * that silently turned an unread MCP envelope into "you have no agents" — the
 * name is different now so the two are never confused again.
 */
function optionalObject(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

/**
 * A whole strategy, from `get_strategy`.
 *
 * Reuses `mapStrategy` for the summary rather than re-deriving it: the roster
 * and the detail page must agree about a strategy's name, scope and bound-agent
 * count, and two mappers is how they stop agreeing.
 */
function mapStrategyDetail(raw: unknown): StrategyDetail {
  const s = (raw ?? {}) as Record<string, unknown>;

  return {
    summary: mapStrategy(s),
    sections: mapSections(s['sections']),
    marketReadText: typeof s['marketReadText'] === 'string' ? s['marketReadText'] : null,
    thresholds: {
      minAggregateScore: num(s['minAggregateScore']),
      minRequiredCount: num(s['minRequiredCount']),
      minAtrPct: num(s['minAtrPct']),
    },
    tradeLevelPolicy: mapTradeLevelPolicy(s),
    signalRules: mapSignalRules(s['signalRules']),
    conditions: mapConditions(s['conditions']),
    // Not defaulted to zero. Zero means "nothing is open under this"; absent
    // means the platform did not say, and a surface that shows a confident 0 for
    // an unknown is inviting a change nobody priced.
    openPositionCount: typeof s['openPositionCount'] === 'number' ? s['openPositionCount'] : 0,
    cadence: typeof s['cadence'] === 'string' ? s['cadence'] : null,
    regimeAutoDerive: s['regimeAutoDerive'] === true,
    regimeTimeframe: typeof s['regimeTimeframe'] === 'string' ? s['regimeTimeframe'] : null,
  };
}

function mapTradeLevelPolicy(s: Record<string, unknown>): TradeLevelPolicy | null {
  const maxStop = s['maxStopLossPct'];
  const minAtr = s['minStopLossAtrMultiple'];
  const minRR = s['minRiskRewardRatio'];
  if (typeof maxStop !== 'number' || typeof minAtr !== 'number' || typeof minRR !== 'number') {
    return null;
  }
  return { maxStopLossPct: maxStop, minStopLossAtrMultiple: minAtr, minRiskRewardRatio: minRR };
}

function mapSections(raw: unknown): readonly StrategySection[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => (entry ?? {}) as Record<string, unknown>)
    .filter((e) => typeof e['sectionKey'] === 'string')
    .map((e) => ({
      kind: typeof e['kind'] === 'string' ? e['kind'] : 'unknown',
      sectionKey: e['sectionKey'] as string,
      // A custom table's definition, kept whole — the preview tool needs it
      // back verbatim and a key alone will not do.
      ...(typeof e['title'] === 'string' ? { title: e['title'] } : {}),
      ...(typeof e['timeframe'] === 'string' ? { timeframe: e['timeframe'] } : {}),
      ...(Array.isArray(e['columns'])
        ? { columns: e['columns'] as readonly Readonly<Record<string, unknown>>[] }
        : {}),
    }));
}

/**
 * The signal rules, kept in the order the platform gave them.
 *
 * A rule with no `signalId` is dropped rather than given a placeholder: the id
 * is what the rule *is*, and a row reading "(unknown signal): weight 3" tells a
 * user something is being weighted without telling them what.
 */
function mapSignalRules(raw: unknown): readonly SignalRule[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => (entry ?? {}) as Record<string, unknown>)
    .filter((e) => typeof e['signalId'] === 'string' && (e['signalId'] as string).length > 0)
    .map((e) => ({
      signalId: e['signalId'] as string,
      allocation: typeof e['allocation'] === 'number' ? e['allocation'] : 0,
      required: e['required'] === true,
      // Opaque on purpose — the shape belongs to the signal, not to us.
      params: optionalObject(e['params']),
    }));
}

/** Null rather than 0 for an absent threshold: "no minimum" and "unstated" differ. */
function num(value: unknown): number | null {
  return typeof value === 'number' ? value : null;
}

/**
 * The condition payload, kept as the platform sent it.
 *
 * Only the entries that are objects, because only those can be sent back — a
 * string or a null in that array is not a condition the platform would accept
 * returned to it. Nothing inside is inspected: the point of this copy is that
 * it survives a grammar this product does not fully model.
 */
function rawConditions(raw: unknown): readonly Readonly<Record<string, unknown>>[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null,
  );
}

/** The preview payload, shaped live 2026-08-01 on Dunkirk's composition. */
function mapReportPreview(payload: Record<string, unknown>) {
  const sections: RenderedSection[] = (
    Array.isArray(payload['renderedSections']) ? payload['renderedSections'] : []
  ).map((entry) => {
    const s = (entry ?? {}) as Record<string, unknown>;
    const sectionKey = typeof s['sectionKey'] === 'string' && s['sectionKey'] ? s['sectionKey'] : null;
    if (sectionKey === null) throw new StrategyPayloadError('sectionKey');

    /**
     * v9.0.0 moved the rendered body one level down.
     *
     *   v5: `{sectionKey, title, text}`
     *   v9: `{sectionKey, section: {title, text}}`
     *
     * This read `s['text']` and `String(… ?? '')` turned the now-absent field
     * into an empty string, so `/strategies/[id]/preview` rendered five
     * sections headed by their raw section key with no body — the entire point
     * of that page, gone, and nothing failed.
     *
     * Nothing caught it because `renderedSections` is still called
     * `renderedSections`: the rename is *inside* the row, and
     * `preview_strategy_report` is one of the tools the surface probe cannot
     * call (it needs a composite `coinSelection`), so it has no observed shape
     * for any guard to compare against. The tools the probe cannot reach are
     * exactly where a silent shape change hides.
     */
    const nested = (s['section'] ?? null) as Record<string, unknown> | null;
    if (nested === null || typeof nested !== 'object') throw new StrategyPayloadError('section');
    // Named rather than defaulted. An absent body is a payload this product
    // does not understand, and rendering it as blank is how the last one hid.
    if (typeof nested['text'] !== 'string') throw new StrategyPayloadError('section.text');
    return {
      sectionKey,
      title:
        typeof nested['title'] === 'string' && nested['title'] ? nested['title'] : sectionKey,
      text: nested['text'],
    };
  });
  // `budgetUsage` is a record of platform-named gauges. Names pass through
  // as given — enumerating them here would go stale the day one is added.
  const budgetRaw = (payload['budgetUsage'] ?? {}) as Record<string, unknown>;
  const budget: BudgetGauge[] = Object.entries(budgetRaw)
    .map(([name, gauge]) => {
      const g = (gauge ?? {}) as Record<string, unknown>;
      return { name, used: num(g['used']), cap: num(g['cap']) };
    })
    .filter((g): g is BudgetGauge => g.used !== null && g.cap !== null);
  return {
    sections,
    // No `estimatedTokenCount`: v9 moved it into `budget` as `estimatedTokens`,
    // used against cap. Reading the old key returned null on every preview.
    tokenCountModel:
      typeof payload['tokenCountModel'] === 'string' ? payload['tokenCountModel'] : null,
    budget,
    // Read since 2026-08-06, produced by the platform since the condition layer
    // arrived. It answers empty unless conditions were sent to resolve.
    conditionOutcomes: mapConditionOutcomes(payload['conditionOutcomes']),
  };
}

/**
 * A metric as the vocabulary's index lists it, and as the hints tool heads
 * its answer — the two payloads share this shape (live, 2026-08-01).
 */
function mapMetricSummary(raw: unknown): MetricSummary {
  const m = (raw ?? {}) as Record<string, unknown>;
  const id = typeof m['metric'] === 'string' && m['metric'].length > 0 ? m['metric'] : null;
  if (id === null) throw new StrategyPayloadError('metric');
  const native = (m['nativeOutput'] ?? {}) as Record<string, unknown>;
  const range = Array.isArray(native['range']) && native['range'].length === 2 ? native['range'] : null;
  const transformIds = Array.isArray(m['transformIds'])
    ? m['transformIds'].filter((t): t is string => typeof t === 'string')
    : Array.isArray(m['transforms'])
      ? m['transforms']
          .map((t) => ((t ?? {}) as Record<string, unknown>)['id'])
          .filter((t): t is string => typeof t === 'string')
      : [];
  return {
    id,
    label: typeof m['label'] === 'string' ? m['label'] : id,
    family: String(m['family'] ?? 'other'),
    unit: typeof native['unit'] === 'string' ? native['unit'] : null,
    precision: num(native['precision']),
    range: range ? [num(range[0]) ?? 0, num(range[1]) ?? 0] : null,
    timeframeMode: typeof m['timeframeMode'] === 'string' ? m['timeframeMode'] : null,
    transformIds,
  };
}

function mapMetricTransform(raw: unknown): MetricTransform {
  const t = (raw ?? {}) as Record<string, unknown>;
  const id = typeof t['id'] === 'string' && t['id'].length > 0 ? t['id'] : null;
  if (id === null) throw new StrategyPayloadError('transform id');
  const authoring = (t['authoring'] ?? {}) as Record<string, unknown>;
  const text = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);

  const params = (authoring['parameters'] ?? {}) as Record<string, unknown>;
  const parameters: TransformParameter[] = Object.entries(params).map(([key, prop]) => {
    const p = (prop ?? {}) as Record<string, unknown>;
    return {
      key,
      required: p['required'] === true,
      defaultValue: p['defaultValue'] !== undefined && p['defaultValue'] !== null ? String(p['defaultValue']) : null,
      description: text(p['description']),
    };
  });

  return {
    id,
    label: text(t['label']) ?? id,
    parameters,
    calculationSummary: text(authoring['calculationSummary']),
    formula: text(authoring['formula']),
    nullBehavior: text(authoring['nullBehavior']),
    operandRequired: t['operandRequired'] === true,
    chainSuccessors: Array.isArray(t['chainSuccessors'])
      ? t['chainSuccessors'].filter((s): s is string => typeof s === 'string')
      : [],
  };
}

function mapColumnContract(raw: Record<string, unknown>): ColumnContract {
  const text = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);
  const outputs: ColumnOutput[] = (Array.isArray(raw['outputs']) ? raw['outputs'] : []).map(
    (entry) => {
      const o = (entry ?? {}) as Record<string, unknown>;
      const outputType = (o['outputType'] ?? {}) as Record<string, unknown>;
      return {
        header: text(o['header']) ?? '(unnamed)',
        meaning: text(o['meaning']),
        unit: text(outputType['unit']),
        nullable: o['nullable'] === true,
      };
    },
  );
  const timeframe = (raw['timeframe'] ?? {}) as Record<string, unknown>;
  return {
    formula: text(raw['formula']),
    calculationSummary: text(raw['calculationSummary']),
    nullBehavior: text(raw['nullBehavior']),
    nullSentinel: text(raw['nullSentinel']),
    outputs,
    effectiveParameters:
      typeof raw['effectiveParameters'] === 'object' && raw['effectiveParameters'] !== null
        ? (raw['effectiveParameters'] as Record<string, unknown>)
        : {},
    requiresSectionTimeframe: timeframe['requiresSectionTimeframe'] === true,
  };
}

/**
 * The validator's refusal, structure preserved. The detail arrives as the
 * refusal's JSON text; a refusal that does not parse still keeps its
 * message — degraded, never discarded.
 */
function mapColumnRefusal(detail: string): ColumnRefusal {
  let body: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(detail);
    if (typeof parsed === 'object' && parsed !== null) body = parsed as Record<string, unknown>;
  } catch {
    /* keep the raw text as the message below */
  }
  const details = (body['details'] ?? {}) as Record<string, unknown>;
  const domain = (details['allowedDomain'] ?? {}) as Record<string, unknown>;
  return {
    message: typeof body['message'] === 'string' ? body['message'] : detail,
    authoringCode: typeof details['authoringCode'] === 'string' ? details['authoringCode'] : null,
    path: Array.isArray(details['path'])
      ? details['path'].filter((p): p is string | number => typeof p === 'string' || typeof p === 'number')
      : [],
    received: details['receivedValue'] !== undefined ? JSON.stringify(details['receivedValue']) : null,
    allowedValues: Array.isArray(domain['values'])
      ? domain['values'].filter((v): v is string => typeof v === 'string')
      : [],
    allowedRule: typeof domain['rule'] === 'string' ? domain['rule'] : null,
  };
}

/**
 * The platform's structured account of a refusal, or null when it did not give
 * one.
 *
 * Sibling of `mapColumnRefusal`, which reads the same envelope for the column
 * checker's `allowedDomain`. Kept apart rather than merged: that one flattens
 * the domain into values and a rule because the column surface renders those,
 * and this one carries `context` whole because which of its keys matter depends
 * on the code. Merging them would mean one shape guessing at both readers.
 *
 * Null on anything that is not the documented shape — prose, a transport
 * failure, a body that will not parse. The message survives regardless; it is
 * returned beside this, not through it.
 */
function mapAuthoringRefusal(detail: string): AuthoringRefusal | null {
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(detail);
    if (typeof parsed !== 'object' || parsed === null) return null;
    body = parsed as Record<string, unknown>;
  } catch {
    return null;
  }
  const details = body['details'];
  if (typeof details !== 'object' || details === null) return null;
  const d = details as Record<string, unknown>;
  const context = d['context'];
  return {
    message: typeof body['message'] === 'string' ? body['message'] : detail,
    authoringCode: typeof d['authoringCode'] === 'string' ? d['authoringCode'] : null,
    path: Array.isArray(d['path'])
      ? d['path'].filter((p): p is string | number => typeof p === 'string' || typeof p === 'number')
      : [],
    context:
      typeof context === 'object' && context !== null ? (context as Record<string, unknown>) : {},
  };
}

/**
 * A signal as the library lists it — shaped from the live payload of
 * 2026-08-01. The id is what a rule references and what the detail route
 * takes; a row without one is the refuse-whole-read case, same rule as
 * everywhere else in this file.
 */
function mapSignalSummary(raw: unknown): SignalSummary {
  const s = (raw ?? {}) as Record<string, unknown>;
  const id = typeof s['signalId'] === 'string' && s['signalId'].length > 0 ? s['signalId'] : null;
  if (id === null) throw new StrategyPayloadError('signalId');
  const display = (s['display'] ?? {}) as Record<string, unknown>;
  return {
    id,
    module: String(s['module'] ?? 'OTHER'),
    direction: String(s['direction'] ?? ''),
    name: typeof display['displayName'] === 'string' ? display['displayName'] : id,
    description: String(display['description'] ?? ''),
  };
}

function mapSignalDefinition(sig: Record<string, unknown>): SignalDefinition {
  const moduleDisplay = (sig['moduleDisplay'] ?? {}) as Record<string, unknown>;
  const info = (sig['info'] ?? {}) as Record<string, unknown>;
  const text = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);

  const examples: SignalExample[] = (Array.isArray(info['examples']) ? info['examples'] : [])
    .map((entry) => (entry ?? {}) as Record<string, unknown>)
    .filter((e) => typeof e['scenario'] === 'string' && typeof e['outcome'] === 'string')
    .map((e) => ({ scenario: e['scenario'] as string, outcome: e['outcome'] as string }));

  // The parameter list is the schema's properties joined with `defaultParams`.
  // Empty is a real state — some signals take no parameters at all.
  const schema = (sig['paramSchemaJson'] ?? {}) as Record<string, unknown>;
  const properties = (schema['properties'] ?? {}) as Record<string, unknown>;
  const defaults = (sig['defaultParams'] ?? {}) as Record<string, unknown>;
  const parameters: SignalParameter[] = Object.entries(properties).map(([key, prop]) => {
    const p = (prop ?? {}) as Record<string, unknown>;
    return {
      key,
      description: text(p['description']),
      min: num(p['minimum']),
      max: num(p['maximum']),
      defaultValue: num(defaults[key]),
    };
  });

  const indicators = (Array.isArray(sig['indicators']) ? sig['indicators'] : [])
    .map((entry) => {
      const i = (entry ?? {}) as Record<string, unknown>;
      const meta = (i['meta'] ?? {}) as Record<string, unknown>;
      return text(meta['label']) ?? text(i['key']);
    })
    .filter((label): label is string => label !== null);

  return {
    summary: mapSignalSummary(sig),
    moduleName: text(moduleDisplay['displayName']) ?? String(sig['module'] ?? ''),
    moduleDescription: text(moduleDisplay['description']),
    detects: text(info['detects']),
    fires: text(info['fires']),
    exampleSetup: text(info['exampleSetup']),
    examples,
    bestFor: text(info['bestFor']),
    watchOut: text(info['watchOut']),
    parameters,
    indicators,
  };
}

/**
 * The preview ceilings, or `null`.
 *
 * Both numbers or neither. A half-read limit — a deadline with no size cap —
 * would be shown to an author as the whole constraint, and composing against
 * half a ceiling is worse than composing against none.
 */
function mapPreviewLimits(payload: Record<string, unknown>): PreviewLimits | null {
  const raw = payload['previewExecutionLimits'];
  if (typeof raw !== 'object' || raw === null) return null;
  const l = raw as Record<string, unknown>;
  const maxResultBytes = num(l['maxResultBytes']);
  const deadlineMs = num(l['deadlineMs']);
  if (maxResultBytes === null || deadlineMs === null) return null;
  return { maxResultBytes, deadlineMs };
}
