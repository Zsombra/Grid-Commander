import type { Agent, SlotUsage } from '@/domain/agent/agent.js';
import type { Brain } from '@/domain/agent/brain.js';
import type { Catalog, CatalogResult } from '@/domain/agent/catalog.js';
import type { TradingConfig } from '@/domain/agent/trading-config.js';
import type {
  AgentsPort,
  BudgetResult,
  EntryDecision,
  EvaluationResult,
  FunnelResult,
  GateBlock,
  JournalResult,
  RosterResult,
  SignalEvaluation,
  StageResult,
  ThoughtLogResult,
  TradeOutcome,
  TradeOutcomesResult,
} from '@/ports/agents.js';
import type { Budget } from '@/domain/agent/budget.js';
import type { ThoughtEntry } from '@/domain/agent/thought.js';
import type { Confirmation } from '@/domain/capability/confirmation.js';

/**
 * An in-memory agent platform.
 *
 * Enforces the two rules a real BattleGrid enforces and a naive double would
 * not: `expectedRevision` must match, and a successful mutation bumps it. A
 * double that ignored the revision would let every concurrency test pass
 * without the code carrying one.
 */
export class FakeAgentsPort implements AgentsPort {
  readonly agents = new Map<string, Agent>();
  /** Every mutating call, in order, exactly as it arrived. */
  readonly calls: Array<{
    op: string;
    agentId?: string | undefined;
    revision?: number | undefined;
    token?: string | undefined;
    /** What the write bound its confirmation to. The pair is the point. */
    target?: string | undefined;
  }> = [];

  catalog: Catalog = defaultCatalog();
  catalogReadable = true;
  rosterReadable = true;
  journalEntries: JournalResult = { kind: 'empty' };
  slots: SlotUsage | null = { limit: 3, used: 0, remaining: 3, rankName: 'Recruit III' };

  constructor(seed: readonly Agent[] = []) {
    for (const a of seed) this.agents.set(a.id, a);
    if (this.slots) {
      this.slots = { ...this.slots, used: seed.length, remaining: this.slots.limit - seed.length };
    }
  }

  async listAgents(): Promise<RosterResult> {
    if (!this.rosterReadable) return { kind: 'unreadable', reason: 'BattleGrid did not respond', cause: 'unreachable' };
    const agents = [...this.agents.values()];
    if (agents.length === 0) return { kind: 'empty', slots: this.slots };
    return { kind: 'agents', agents, slots: this.slots };
  }

  async getAgent(params: { agentId: string }): Promise<Agent> {
    const found = this.agents.get(params.agentId);
    if (!found) throw new Error(`no such agent: ${params.agentId}`);
    return found;
  }

  async readCatalog(): Promise<CatalogResult> {
    if (!this.catalogReadable) return { kind: 'unreadable', reason: 'catalog unavailable' };
    return { kind: 'catalog', catalog: this.catalog };
  }

  /** Every create payload, in order. */
  readonly created: Array<{
    displayName: string;
    brain: Brain;
    strategyId: string;
    tradingConfig: TradingConfig | null;
  }> = [];

  async createAgent(params: {
    displayName: string;
    brain: Brain;
    strategyId: string;
    tradingConfig: TradingConfig | null;
    arenaChallengeEnabled?: boolean | undefined;
  }): Promise<Agent> {
    this.calls.push({ op: 'create' });
    // The whole payload, kept. `tradingConfig` was `null` on every create for
    // the life of the product and nothing recorded it, so nothing could assert
    // on it.
    this.created.push(params);
    const id = `a${this.agents.size + 1}`;
    const agent: Agent = {
      id,
      revision: 1,
      displayName: params.displayName,
      status: 'ACTIVE',
      binding: {
        strategyId: params.strategyId,
        strategyName: 'Seeded Strategy',
        strategyRevision: 1,
        state: 'BOUND',
      },
      brain: params.brain,
      tradingConfig: params.tradingConfig,
      arenaChallengeEnabled: params.arenaChallengeEnabled ?? false,
      overlayText: null,
      performance: null,
      permissions: { canEdit: true, canArchive: true, canEditOverlay: true },
    };
    this.agents.set(id, agent);
    return agent;
  }

  async updateAgent(params: {
    agentId: string;
    expectedRevision: number;
    changes: Readonly<Record<string, unknown>>;
    confirmation: Confirmation;
  }): Promise<Agent> {
    this.calls.push({
      op: 'update',
      agentId: params.agentId,
      revision: params.expectedRevision,
      token: params.confirmation.token,
      // Recorded rather than checked here. This fake is not the guard — the guard
      // is `enforce()`, and a fake that quietly accepted any target would be the
      // fixture-modelling-an-impossible-platform mistake that hid the apply-plan
      // defect for the life of the project.
      target: params.confirmation.target,
    });
    const current = this.expect(params.agentId, params.expectedRevision);
    const next: Agent = {
      ...current,
      revision: current.revision + 1,
      ...(typeof params.changes['displayName'] === 'string'
        ? { displayName: params.changes['displayName'] }
        : {}),
      ...(params.changes['tradingConfig']
        ? { tradingConfig: { fields: params.changes['tradingConfig'] as Record<string, unknown> } }
        : {}),
    };
    this.agents.set(next.id, next);
    return next;
  }

  async rebindAgent(params: {
    agentId: string;
    strategyId: string;
    expectedRevision: number;
    confirmation: Confirmation;
  }): Promise<Agent> {
    this.calls.push({
      op: 'rebind',
      agentId: params.agentId,
      revision: params.expectedRevision,
      token: params.confirmation?.token,
    });
    const current = this.expect(params.agentId, params.expectedRevision);
    const next: Agent = {
      ...current,
      revision: current.revision + 1,
      binding: {
        strategyId: params.strategyId,
        strategyName: 'Rebound Strategy',
        strategyRevision: 1,
        state: 'BOUND',
      },
    };
    this.agents.set(next.id, next);
    return next;
  }

  async setLifecycle(params: {
    agentId: string;
    expectedRevision: number;
    to: 'ACTIVE' | 'ARCHIVED';
    confirmation?: Confirmation | undefined;
  }): Promise<Agent> {
    this.calls.push({
      op: `lifecycle:${params.to}`,
      agentId: params.agentId,
      revision: params.expectedRevision,
      token: params.confirmation?.token,
    });
    const current = this.expect(params.agentId, params.expectedRevision);
    const next: Agent = { ...current, revision: current.revision + 1, status: params.to };
    this.agents.set(next.id, next);
    return next;
  }

  /** Seeded per test. Defaults to the live agent's real shape. */
  budgetResult: BudgetResult = { kind: 'budget', budget: aBudget() };

  async readBudget(): Promise<BudgetResult> {
    return this.budgetResult;
  }

  /** Seeded per test. `empty` by default — an agent that has not reasoned yet. */
  thoughts: ThoughtLogResult = { kind: 'empty' };

  async readThoughtLog(): Promise<ThoughtLogResult> {
    return this.thoughts;
  }

  async readJournal(): Promise<JournalResult> {
    return this.journalEntries;
  }

  /** Set to hand back a trading record; `none` is an agent that never traded. */
  tradeOutcomes: TradeOutcomesResult = { kind: 'none' };

  async readTradeOutcomes(): Promise<TradeOutcomesResult> {
    return this.tradeOutcomes;
  }

  /** The three pipeline stages, each settable on its own. */
  gateBlocks: StageResult<GateBlock> = { kind: 'none' };
  signalLogs: StageResult<SignalEvaluation> = { kind: 'none' };
  entryDecisions: StageResult<EntryDecision> = { kind: 'none' };

  async readGateBlocks(): Promise<StageResult<GateBlock>> {
    return this.gateBlocks;
  }

  async readSignalLogs(): Promise<StageResult<SignalEvaluation>> {
    return this.signalLogs;
  }

  async readEntryDecisions(): Promise<StageResult<EntryDecision>> {
    return this.entryDecisions;
  }

  /** One evaluation in full, and the agent's own funnel. */
  ownEvaluation: EvaluationResult = { kind: 'none' };
  ownFunnel: FunnelResult = { kind: 'none' };

  async readOwnEvaluationDetail(): Promise<EvaluationResult> {
    return this.ownEvaluation;
  }

  async readOwnFunnel(): Promise<FunnelResult> {
    return this.ownFunnel;
  }

  private expect(agentId: string, revision: number): Agent {
    const current = this.agents.get(agentId);
    if (!current) throw new Error(`no such agent: ${agentId}`);
    if (current.revision !== revision) {
      // Shaped like the platform's own message so `toDomainError` recognises it.
      throw new Error(`expectedRevision ${revision} did not match; revision conflict`);
    }
    return current;
  }
}

export function anAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 'a1',
    revision: 1,
    displayName: 'Volatilis',
    status: 'ACTIVE',
    binding: {
      strategyId: 's1',
      strategyName: 'Volatilis — imported',
      strategyRevision: 1,
      state: 'BOUND',
    },
    brain: { kind: 'preset', preset: 'ROMMEL' },
    tradingConfig: null,
    arenaChallengeEnabled: false,
    overlayText: null,
    performance: null,
    permissions: { canEdit: true, canArchive: true, canEditOverlay: true },
    ...overrides,
  };
}

/**
 * A `tradingConfig` shaped like the ones the live server actually returns.
 *
 * **Twenty-three keys, not twenty.** Every agent on the account this was built
 * against reads back with `strategyTimeframe`, `regimeAutoDerive` and
 * `regimeTimeframe` on top of the twenty the write schema accepts — and
 * `update_intelligence_agent.tradingConfig` declares
 * `additionalProperties: false`, so passing them back rejects the whole object.
 *
 * The fixture here used to carry four fields. A four-field config cannot exist:
 * create requires all twenty, so nothing on the platform can produce one. Tests
 * built on it proved that a read-modify-write preserved untouched fields, which
 * was true, while the same code could not complete a single edit — because the
 * fixture had none of the three keys that made every edit fail.
 *
 * Overrides apply to the writable fields, so a test can set the one value it is
 * about without restating the other nineteen.
 */
export function liveTradingConfig(
  overrides: Readonly<Record<string, unknown>> = {},
): TradingConfig {
  return {
    fields: {
      tradingMode: 'OFF',
      minAllocationUsd: 10,
      maxDailyTrades: 30,
      balanceThresholdUsd: 10,
      maxLeverage: 5,
      maxSlippageBps: 300,
      maxConcurrentExposureUsd: 250,
      maxCumulativeDrawdownUsd: 500,
      maxDailyLossUsd: 300,
      maxStopLossPct: 1,
      minStopLossPct: 0.5,
      signalTimeoutMinutes: 10,
      maxEntryDeviationAtrMultiple: 1.5,
      minRiskRewardRatio: 1.5,
      minTradeConviction: 0.35,
      gridMinConfidence: 0.7,
      positionSizePresets: { sizingStrategy: 'MANUAL', smallPct: 1, mediumPct: 2.5, largePct: 5 },
      positionManagement: { positionManagementPreset: 'CUSTOM', enabled: false },
      atrMatchesStrategyTimeframe: true,
      atrTimeframe: '1h',
      ...overrides,
      // Read-only, and last on purpose: a test must not be able to override
      // them away, because the live server always sends them.
      strategyTimeframe: '1h',
      regimeAutoDerive: true,
      regimeTimeframe: '4h',
    },
  };
}

/** The three the read carries and the write rejects. */
export const READ_ONLY_CONFIG_FIELDS = [
  'strategyTimeframe',
  'regimeAutoDerive',
  'regimeTimeframe',
] as const;

export function defaultCatalog(): Catalog {
  return {
    models: [
      {
        modelId: 'anthropic/claude-opus-4.6',
        displayName: 'Claude Opus 4.6',
        provider: 'Anthropic',
        isDefault: true,
      },
    ],
    brainPresets: ['MONTGOMERY', 'ROMMEL', 'PATTON'],
    positionManagementPresets: [
      {
        preset: 'COLT',
        label: 'Colt',
        description: 'Patient / wide',
        // The complete configuration the live catalog states for COLT — the
        // fourteen values choosing it actually sends.
        config: {
          enabled: true,
          breakEvenEnabled: true,
          breakEvenTriggerTpProgressPct: 70,
          trailingEnabled: true,
          trailingType: 'ATR',
          trailingAtrMultiple: 4,
          trailingFixedPct: 2,
          trailingBufferPct: 0.5,
          timeDecayEnabled: true,
          timeDecayGracePeriodMinutes: 120,
          timeDecayIntervalMinutes: 30,
          timeDecayTightenPct: 5,
          timeDecayMaxTightenPct: 40,
          timeDecayStaleThresholdTpProgressPct: 30,
        },
        tagline: 'Let winners breathe',
        cardSummary: 'Wide trailing, patient decay',
      },
      // Deliberately config-less: the catalog listed it and did not describe
      // it, so it must not be offered — the withhold branch under test.
      {
        preset: 'WEBLEY',
        label: 'Webley',
        description: 'Defensive / measured',
        config: null,
        tagline: '',
        cardSummary: '',
      },
    ],
    bounds: {
      maxStopLossPct: { min: 0.1, max: 25 },
      maxDailyTrades: { max: 100 },
    },
    // The live catalog's defaults, as `get_trading_config_catalog` returns them.
    // The six money fields are absent here because BattleGrid genuinely does not
    // default them — that absence is the whole subject of `undefaultableFields`,
    // and a fixture that filled them in would prove the opposite of the point.
    defaults: {
      maxDailyTrades: 10,
      maxLeverage: 1,
      maxStopLossPct: 5,
      minStopLossPct: 1,
      maxEntryDeviationAtrMultiple: 1.5,
      minRiskRewardRatio: 1.5,
      minTradeConviction: 0.35,
      gridMinConfidence: 0.7,
      maxSlippageBps: 300,
      signalTimeoutMinutes: 10,
      atrMatchesStrategyTimeframe: true,
      atrTimeframe: '1h',
      smallPct: 1,
      mediumPct: 2.5,
      largePct: 5,
    },
  };
}

/**
 * A thought-log entry shaped like the ones the live server returns.
 *
 * The defaults are a real entry: confidence exactly equal to its threshold,
 * which the platform treated as clearing the bar. Overrides let a test say the
 * one thing it is about.
 */
export function aThought(overrides: Partial<ThoughtEntry> = {}): ThoughtEntry {
  return {
    id: 't1',
    at: new Date('2026-07-29T13:56:33.385Z'),
    agentId: 'a1',
    reasoning: 'LDO is trading below VWAP with bearish momentum, but the setup is a mean-reversion LONG.',
    snapshot: { coinTicker: 'LDO', thesisDirection: 'UP', primaryTimeframe: '1h' },
    confidence: 0.35,
    threshold: 0.35,
    outcome: 'AGENT_TRADE_THESIS',
    ...overrides,
  };
}

/**
 * A budget shaped like the live agent's.
 *
 * Two gauges with ceilings, two without — which is the account's real state and
 * the case that matters: the unconfigured pair are **drawdown** and **daily
 * loss**, the two governing how much can be lost. A fixture with all four
 * configured would never exercise the `remaining: null` path that exists
 * because the platform sends `0` there.
 */
export function aBudget(overrides: Partial<Budget> = {}): Budget {
  return {
    agentId: 'a1',
    gauges: {
      dailyTrades: { used: 21, remaining: 13, ceiling: 34, breached: false },
      exposure: { used: 0, remaining: 250, ceiling: 250, breached: false },
      drawdown: { used: 0, remaining: null, ceiling: null, breached: false },
      dailyLoss: { used: 0.07, remaining: null, ceiling: null, breached: false },
    },
    overSubscribed: false,
    stopBelowSingleTradeLoss: false,
    stopEffectivelyUnbounded: false,
    haltedAt: null,
    haltReason: null,
    capitalAtRiskUsd: 0,
    headroomUsd: 250,
    ...overrides,
  };
}

/** Deterministic tokens, so a test can assert which one was issued. */
export class SequentialRandom {
  private n = 0;
  token(): string {
    return `r${++this.n}`;
  }
  codeChallengeS256(verifier: string): string {
    return `challenge(${verifier})`;
  }
}

/** Shaped from the live `list_trade_outcomes` row of 2026-08-02. */
export function aTradeOutcome(overrides: Partial<TradeOutcome> = {}): TradeOutcome {
  return {
    id: 't1',
    coinTicker: 'MOODENG',
    direction: 'LONG',
    closeReason: 'STOP_LOSS',
    closedBy: 'SYSTEM',
    entryFillPrice: 0.041374,
    exitFillPrice: 0.041072,
    realizedPnl: -0.088788,
    totalFees: 0.031495,
    netPnl: -0.120283,
    slippageEntry: 0,
    slippageExit: 0.00028052,
    effectiveLeverage: 3,
    conviction: 0.55,
    openedAt: '2026-06-21T13:57:42.036Z',
    closedAt: '2026-06-21T17:40:55.965Z',
    durationSeconds: 13393,
    decisionId: 'd1',
    signalLogId: 'c21c5ccd-ca90-4ffb-82b4-895a9ae21a92',
    ...overrides,
  };
}
