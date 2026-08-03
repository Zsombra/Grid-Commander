import type { Strategy, StrategyDetail, StrategyQuota } from '@/domain/strategy/strategy.js';
import type { Confirmation } from '@/domain/capability/confirmation.js';
import type {
  CoinSelection,
  ColumnCheckOutcome,
  ColumnContract,
  ColumnProposal,
  ColumnRefusal,
  CompileResult,
  LifecycleResult,
  MetricHints,
  MetricListResult,
  MetricSummary,
  ReportPreview,
  ReportPreviewOutcome,
  RuleMembership,
  SignalDefinition,
  SignalListResult,
  SignalSummary,
  StrategiesPort,
  StrategyDetailResult,
  StrategyListResult,
  VocabularyResult,
  VocabularyTemplatesResult,
  SimulationResult,
} from '@/ports/strategies.js';

/**
 * An in-memory strategy platform.
 *
 * Records every call so a test can assert the thing that matters most about this
 * capability: that compiling wrote nothing, and that what apply received was the
 * projection and not the compiler's own output.
 */
export class FakeStrategiesPort implements StrategiesPort {
  readonly calls: Array<{
    op: string;
    payload?: Readonly<Record<string, unknown>> | undefined;
    /** What the write bound its confirmation to. */
    target?: string | undefined;
  }> = [];

  strategies: Strategy[];
  quota: StrategyQuota | null = { used: 2, limit: 25, remaining: 23 };
  readable = true;
  vocabularyReadable = true;
  vocabularyTemplatesReadable = true;
  compileResult: CompileResult | null = null;
  restoreNeedsRepair = false;

  constructor(seed: readonly Strategy[] = []) {
    this.strategies = [...seed];
  }

  /** Set to hand back a detail; `null` means the strategy is not there. */
  detail: StrategyDetail | null = null;
  detailReadable = true;

  signals: SignalSummary[] = [];
  signalsReadable = true;
  /** Keyed by signal id; a listed id with no entry makes the definition read throw. */
  signalDefinitions = new Map<string, SignalDefinition>();

  async listSignals(): Promise<SignalListResult> {
    if (!this.signalsReadable) {
      return { kind: 'unreadable', reason: 'BattleGrid did not respond', cause: 'unreachable' };
    }
    return { kind: 'signals', signals: this.signals };
  }

  async signalDefinition(params: { signalId: string }): Promise<SignalDefinition> {
    const definition = this.signalDefinitions.get(params.signalId);
    if (!definition) throw new Error(`no definition staged for ${params.signalId}`);
    return definition;
  }

  /** Stage a signal in both the list and the definition store. */
  stageSignal(definition: SignalDefinition) {
    this.signals.push(definition.summary);
    this.signalDefinitions.set(definition.summary.id, definition);
  }

  metrics: MetricSummary[] = [];
  metricsReadable = true;
  /** Keyed by metric id; a listed id with no entry makes the hints read throw. */
  hints = new Map<string, MetricHints>();
  columnOutcome: ColumnCheckOutcome = { kind: 'refused', refusal: aColumnRefusal() };

  async listMetrics(): Promise<MetricListResult> {
    if (!this.metricsReadable) {
      return { kind: 'unreadable', reason: 'BattleGrid did not respond', cause: 'unreachable' };
    }
    return { kind: 'metrics', metrics: this.metrics };
  }

  async metricHints(params: { metric: string }): Promise<MetricHints> {
    const staged = this.hints.get(params.metric);
    if (!staged) throw new Error(`no hints staged for ${params.metric}`);
    return staged;
  }

  async columnContract(params: { column: ColumnProposal }): Promise<ColumnCheckOutcome> {
    this.calls.push({ op: 'column-contract', payload: { ...params.column } });
    return this.columnOutcome;
  }

  /** Stage a metric in both the index and the hints store. */
  stageMetric(hints: MetricHints) {
    this.metrics.push(hints.summary);
    this.hints.set(hints.summary.id, hints);
  }

  previewOutcome: ReportPreviewOutcome = {
    kind: 'preview',
    preview: aReportPreview(),
  };
  membership: RuleMembership[] = [];

  async previewReport(params: {
    timeframe: string;
    sections: readonly { kind: string; sectionKey: string }[];
    coinSelection: CoinSelection;
  }): Promise<ReportPreviewOutcome> {
    this.calls.push({
      op: 'preview',
      payload: { timeframe: params.timeframe, coinSelection: { ...params.coinSelection } },
    });
    return this.previewOutcome;
  }

  async deriveRuleView(): Promise<readonly RuleMembership[]> {
    return this.membership;
  }

  /** Set per test. The platform's own arithmetic, stubbed. */
  simulation: SimulationResult = {
    kind: 'simulation',
    simulation: {
      aggregateScorePercent: 65,
      gatePercent: 50,
      wouldRoute: true,
      attributions: [
        { label: 'rsi_overbought', scorePercent: 100, allocation: 1, attributionPercent: 22 },
      ],
    },
  };

  async simulateAggregate(): Promise<SimulationResult> {
    return this.simulation;
  }

  /** Set to make the rule write refuse with this message. */
  ruleWriteRefusal: string | null = null;

  async updateSignalRule(params: {
    strategyId: string;
    expectedRevision: number;
    signalId: string;
    allocation: number;
    required: boolean;
    ruleParams?: Readonly<Record<string, unknown>> | undefined;
    confirmation: Confirmation;
  }): Promise<Readonly<Record<string, unknown>>> {
    this.calls.push({
      op: 'update-rule',
      payload: {
        strategyId: params.strategyId,
        expectedRevision: params.expectedRevision,
        signalId: params.signalId,
        allocation: params.allocation,
        required: params.required,
        ...(params.ruleParams !== undefined ? { params: params.ruleParams } : {}),
      },
      target: params.confirmation.target,
    });
    if (this.ruleWriteRefusal) throw new Error(this.ruleWriteRefusal);
    const current = this.strategies.find((s) => s.id === params.strategyId);
    if (current) {
      this.strategies = this.strategies.map((s) =>
        s.id === params.strategyId ? { ...s, revision: s.revision + 1 } : s,
      );
    }
    return { strategy: { id: params.strategyId, revision: (current?.revision ?? 0) + 1 } };
  }

  async readStrategy(): Promise<StrategyDetailResult> {
    if (!this.detailReadable) {
      return { kind: 'unreadable', reason: 'BattleGrid did not respond', cause: 'unreachable' };
    }
    return this.detail ? { kind: 'strategy', detail: this.detail } : { kind: 'missing' };
  }

  async listStrategies(): Promise<StrategyListResult> {
    if (!this.readable) return { kind: 'unreadable', reason: 'BattleGrid did not respond', cause: 'unreachable' };
    return { kind: 'strategies', strategies: this.strategies, quota: this.quota };
  }

  async compilePlan(params: {
    request: Readonly<Record<string, unknown>>;
  }): Promise<CompileResult> {
    // Compiling is recorded so a test can prove it happened *and* that nothing
    // moved as a result.
    this.calls.push({ op: 'compile', payload: params.request });
    return this.compileResult ?? { kind: 'rejected', reason: 'no compile result configured' };
  }

  async applyPlan(params: {
    strategyId: string;
    plan: Readonly<Record<string, unknown>>;
    planToken: string;
    confirmation: Confirmation;
  }): Promise<Readonly<Record<string, unknown>>> {
    this.calls.push({ op: 'apply', payload: params.plan, target: params.confirmation.target });
    const current = this.strategies.find((s) => s.id === params.strategyId);
    if (current) {
      this.strategies = this.strategies.map((s) =>
        s.id === params.strategyId ? { ...s, revision: s.revision + 1 } : s,
      );
    }
    return { strategy: { id: params.strategyId }, appliedImpact: { boundAgentCount: current?.boundAgentCount ?? 0 } };
  }

  async forkStrategy(params: { strategyId: string; sourceRevision: number }): Promise<Strategy> {
    this.calls.push({ op: 'fork', payload: { ...params } });
    const source = this.strategies.find((s) => s.id === params.strategyId);
    const fork: Strategy = {
      id: `${params.strategyId}-fork`,
      name: `${source?.name ?? 'Strategy'} (fork)`,
      tagline: source?.tagline ?? null,
      description: source?.description ?? null,
      revision: 1,
      scope: 'PRIVATE',
      timeframe: source?.timeframe ?? '1h',
      isActive: true,
      boundAgentCount: 0,
      forkedFromStrategyId: params.strategyId,
    };
    this.strategies = [...this.strategies, fork];
    return fork;
  }

  async setActive(params: { strategyId: string; active: boolean }): Promise<LifecycleResult> {
    this.calls.push({ op: `lifecycle:${params.active ? 'restore' : 'archive'}` });
    if (params.active && this.restoreNeedsRepair) {
      return { kind: 'repair-required', reason: 'REPAIR_REQUIRED' };
    }
    this.strategies = this.strategies.map((s) =>
      s.id === params.strategyId ? { ...s, isActive: params.active } : s,
    );
    const changed = this.strategies.find((s) => s.id === params.strategyId)!;
    return { kind: 'changed', strategy: changed };
  }

  async readVocabulary(): Promise<VocabularyResult> {
    if (!this.vocabularyReadable) return { kind: 'unreadable', reason: 'catalog unavailable', cause: 'unreachable' };
    return {
      kind: 'vocabulary',
      categories: [
        { category: 'momentum', label: 'Momentum', purpose: 'Directional impulse.', metricCount: 10 },
        { category: 'trend', label: 'Trend', purpose: 'Direction and persistence.', metricCount: 10 },
      ],
    };
  }

  async listVocabularyTemplates(): Promise<VocabularyTemplatesResult> {
    if (!this.vocabularyTemplatesReadable) {
      return { kind: 'unreadable', reason: 'vocabulary unavailable', cause: 'unreachable' };
    }
    return {
      kind: 'templates',
      templates: [
        { kind: 'platform', sectionKey: 'includeRsi', label: 'RSI', category: 'momentum' },
        { kind: 'platform', sectionKey: 'includeMacd', label: 'MACD', category: 'momentum' },
        { kind: 'platform', sectionKey: 'includeMovingAverages', label: 'Moving Averages', category: 'trend' },
      ],
    };
  }
}

export function aStrategy(overrides: Partial<Strategy> = {}): Strategy {
  return {
    id: 's1',
    name: 'Midway (fork)',
    tagline: 'Intel-driven precision strike',
    description: 'Balanced — VWAP deviation signal.',
    revision: 1,
    scope: 'PRIVATE',
    timeframe: '1h',
    isActive: true,
    boundAgentCount: 0,
    forkedFromStrategyId: null,
    ...overrides,
  };
}

/** A detail wrapping a summary — what `readStrategy` answers with. */
export function aDetail(summary: Strategy = aStrategy()): StrategyDetail {
  return {
    summary,
    sections: [],
    marketReadText: null,
    thresholds: { minAggregateScore: null, minRequiredCount: null, minAtrPct: null },
    signalRules: [],
    openPositionCount: 0,
    cadence: null,
    regimeAutoDerive: false,
    regimeTimeframe: null,
  };
}

/** Shaped from the real compile response. */
export function anApprovedPlan(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    operation: 'UPDATE',
    expiresAt: '2026-07-28T01:08:50.257Z',
    expectedRevision: 1,
    proposedRevision: 2,
    authoringCatalogDigest: '2d35afc7',
    postState: {
      id: 's1',
      name: 'Midway (fork)',
      description: 'Balanced.',
      tagline: 'Changed',
      timeframe: '1h',
      regimeAutoDerive: true,
      regimeTimeframe: '4h',
      marketReadText: 'Read the tape.',
      sections: [],
      minAggregateScore: 0.5,
      minRequiredCount: 0,
      minAtrPct: 0.5,
      // Required by the live apply schema; observed in the real postState
      // 2026-07-31 (empty on a strategy with no conditions authored).
      conditions: [],
      conditionVerdicts: [],
      isActive: true,
    },
    explicitRuleOverrides: [],
    viability: { viable: true },
    mismatches: [{ code: 'ACTIVE_SIGNAL_MODULE_NOT_IN_REPORT', message: 'advisory' }],
    diff: { changedAxes: ['IDENTITY'] },
    bindingImpact: { boundAgentCount: 0 },
    ...overrides,
  };
}

/** Shaped from the live `list_strategy_signals` entry of 2026-08-01. */
export function aSignal(overrides: Partial<SignalSummary> = {}): SignalSummary {
  return {
    id: 'rsi_oversold',
    module: 'RSI',
    direction: 'LONG',
    name: 'Oversold',
    description: 'RSI-14 falls below 30 — price in oversold territory',
    ...overrides,
  };
}

/** Shaped from the live `get_strategy_signal_definition` payload of 2026-08-01. */
export function aSignalDefinition(overrides: Partial<SignalDefinition> = {}): SignalDefinition {
  return {
    summary: aSignal(),
    moduleName: 'RSI',
    moduleDescription: 'Relative Strength Index — momentum oscillator on 0–100.',
    detects: 'RSI has fallen into oversold territory.',
    fires: 'Triggers when RSI(14) drops below the threshold.',
    exampleSetup: 'Threshold = 30',
    examples: [
      { scenario: 'RSI = 27', outcome: 'fires, Bullish, score 0.10' },
      { scenario: 'RSI = 32', outcome: 'does not fire' },
    ],
    bestFor: 'Mean-reversion entries inside ranges.',
    watchOut: 'In strong downtrends RSI can stay <30 for many bars.',
    parameters: [
      {
        key: 'threshold',
        description: 'RSI oversold boundary in 0–100 index points.',
        min: 1,
        max: 50,
        defaultValue: 30,
      },
    ],
    indicators: ['RSI(14)'],
    ...overrides,
  };
}

/** Shaped from the live vocabulary `metrics` entry of 2026-08-01. */
export function aMetric(overrides: Partial<MetricSummary> = {}): MetricSummary {
  return {
    id: 'RSI14',
    label: 'RSI (14)',
    family: 'momentum',
    unit: 'oscillator',
    precision: 1,
    range: [0, 100],
    timeframeMode: 'candle',
    transformIds: ['value', 'trajectory', 'classifyZone', 'spread', 'rank'],
    ...overrides,
  };
}

/** Shaped from the live `get_metric_construction_hints` payload of 2026-08-01. */
export function aMetricHints(overrides: Partial<MetricHints> = {}): MetricHints {
  return {
    summary: aMetric(),
    transforms: [
      {
        id: 'value',
        label: 'Value',
        parameters: [
          {
            key: 'offset',
            required: false,
            defaultValue: '0',
            description: 'Bars before the latest value; 0 selects the current resolved value.',
          },
        ],
        calculationSummary: 'Select one value at the requested offset.',
        formula: 'output = base[t - offset]',
        nullBehavior: 'Returns null when the requested slot is absent or the source value is null.',
        operandRequired: false,
        chainSuccessors: [],
      },
      {
        id: 'spread',
        label: 'Spread vs metric',
        parameters: [
          {
            key: 'inputs',
            required: true,
            defaultValue: null,
            description: 'Exactly one candle-backed operand metric.',
          },
        ],
        calculationSummary: 'Measure the signed percentage gap between the base and one operand metric.',
        formula: 'output = (base - inputs[0]) / inputs[0] × 100',
        nullBehavior: 'Returns null when either operand is null or the second operand is zero.',
        operandRequired: true,
        chainSuccessors: ['trajectory', 'aggregate'],
      },
    ],
    ...overrides,
  };
}

/** Shaped from the live column contract of 2026-08-01 (RSI14/value/anchor). */
export function aColumnContract(overrides: Partial<ColumnContract> = {}): ColumnContract {
  return {
    formula: 'output = RSI14[t - 0]',
    calculationSummary: 'Select one value at the requested offset.',
    nullBehavior: 'Returns null when the requested slot is absent or the source value is null.',
    nullSentinel: '—',
    outputs: [
      {
        header: 'RSI14',
        meaning: 'RSI14: latest value.',
        unit: 'oscillator',
        nullable: true,
      },
    ],
    effectiveParameters: { offset: 0, window: null },
    requiresSectionTimeframe: true,
    ...overrides,
  };
}

/** Shaped from the live teaching refusal of 2026-08-01 (spread with a CLOSE operand). */
export function aColumnRefusal(overrides: Partial<ColumnRefusal> = {}): ColumnRefusal {
  return {
    message:
      "spread operand 'CLOSE' is not a legal relational operand for base 'RSI14' — it must declare a numeric output in the base's OWN unit",
    authoringCode: 'REPORT_COLUMN_OPERAND_UNSUPPORTED',
    path: ['column', 'inputs', 0, 'metric'],
    received: '"CLOSE"',
    allowedValues: ['ADX', 'CCI20', 'MFI14', 'RSI7', 'STOCH_D', 'STOCH_K'],
    allowedRule: null,
    ...overrides,
  };
}

/** Shaped from the live `preview_strategy_report` payload of 2026-08-01 (Dunkirk). */
export function aReportPreview(overrides: Partial<ReportPreview> = {}): ReportPreview {
  return {
    sections: [
      {
        sectionKey: 'includePriceAction',
        title: 'Price Action',
        text: 'Schema: 1h candles. last: the last traded price (live, not a bar close).',
      },
      {
        sectionKey: 'includeRsi',
        title: 'RSI',
        text: 'RSI(14) on 1h closes. rsi14: latest value.',
      },
    ],
    estimatedTokenCount: 1393,
    tokenCountModel: 'o200k_base',
    budget: [
      { name: 'sections', used: 5, cap: 32 },
      { name: 'distinctTimeframes', used: 3, cap: 8 },
    ],
    ...overrides,
  };
}

/** Shaped from the live `derive_strategy_rule_view` row of 2026-08-01. */
export function aMembership(overrides: Partial<RuleMembership> = {}): RuleMembership {
  return {
    signalId: 'rsi_oversold',
    inReport: true,
    status: 'IN_REPORT',
    defaultAllocation: 2,
    ...overrides,
  };
}