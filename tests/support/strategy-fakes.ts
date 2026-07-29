import type { Strategy, StrategyQuota } from '@/domain/strategy/strategy.js';
import type {
  CompileResult,
  LifecycleResult,
  StrategiesPort,
  StrategyListResult,
  VocabularyResult,
} from '@/ports/strategies.js';

/**
 * An in-memory strategy platform.
 *
 * Records every call so a test can assert the thing that matters most about this
 * capability: that compiling wrote nothing, and that what apply received was the
 * projection and not the compiler's own output.
 */
export class FakeStrategiesPort implements StrategiesPort {
  readonly calls: Array<{ op: string; payload?: Readonly<Record<string, unknown>> }> = [];

  strategies: Strategy[];
  quota: StrategyQuota | null = { used: 2, limit: 25, remaining: 23 };
  readable = true;
  vocabularyReadable = true;
  compileResult: CompileResult | null = null;
  restoreNeedsRepair = false;

  constructor(seed: readonly Strategy[] = []) {
    this.strategies = [...seed];
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
    confirmationToken: string;
  }): Promise<Readonly<Record<string, unknown>>> {
    this.calls.push({ op: 'apply', payload: params.plan });
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
