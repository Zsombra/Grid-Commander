import type { Strategy, StrategyDetail, StrategyQuota } from '@/domain/strategy/strategy.js';
import type { Confirmation } from '@/domain/capability/confirmation.js';
import type {
  CompileResult,
  LifecycleResult,
  SignalDefinition,
  SignalListResult,
  SignalSummary,
  StrategiesPort,
  StrategyDetailResult,
  StrategyListResult,
  VocabularyResult,
  VocabularyTemplatesResult,
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
