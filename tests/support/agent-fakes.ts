import type { Agent, SlotUsage } from '@/domain/agent/agent.js';
import type { Brain } from '@/domain/agent/brain.js';
import type { Catalog } from '@/domain/agent/catalog.js';
import type {
  AccountState,
  AccountStatePort,
  AccountStateResult,
} from '@/ports/account.js';
import type { TradingConfig } from '@/domain/agent/trading-config.js';
import type {
  AgentsPort,
  BudgetResult,
  CatalogResult,
  EntryDecision,
  EvaluationResult,
  FunnelResult,
  GateBlocksResult,
  JournalResult,
  RosterResult,
  SignalEvaluation,
  StageResult,
  ThoughtLogResult,
  QualificationResult,
  TradeOutcome,
  TradeOutcomesResult,
  TradeChartResult,
  PositionAuditResult,
  TradeChart,
  AuditEvent,
  FleetSpendResult,
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

  /** The hub's fleet totals — mirrors the live read of 2026-08-11 (#129). */
  fleetSpend: FleetSpendResult = { kind: 'spend', totalCost24hUsd: 1.34, activeAgents: 3 };

  async readFleetSpend(): Promise<FleetSpendResult> {
    return this.fleetSpend;
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
    if (!this.catalogReadable) {
      return { kind: 'unreadable', reason: 'catalog unavailable', cause: 'unreachable' };
    }
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
      modelDisplayName: null,
      last24hCostUsd: null,
      tradingConfig: params.tradingConfig,
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
  gateBlocks: GateBlocksResult = { kind: 'none' };
  /**
   * Every `limit` the gate-block read was asked for, in order.
   *
   * Recorded because *how wide a window was read* is half of what the stoppage
   * summary means: a fold over ten rows and a fold over a hundred answer
   * differently, and a double that swallowed the argument would let a test
   * pass while the product still read the pipeline's ten.
   */
  readonly gateBlockLimits: Array<number | undefined> = [];
  signalLogs: StageResult<SignalEvaluation> = { kind: 'none' };
  entryDecisions: StageResult<EntryDecision> = { kind: 'none' };
  /**
   * Every `limit` the decision read was asked for, in order.
   *
   * Recorded for the same reason as `gateBlockLimits`, and it bites harder
   * here: the exposure surface joins an open position to the decision that
   * opened it, and the platform's default window is ten rows. An agent that
   * decides sixty entries pushes that decision off page one within hours, so a
   * double that swallowed the argument would let the join test pass while the
   * product asked for a window too narrow to contain the answer.
   */
  readonly entryDecisionLimits: Array<number | undefined> = [];

  async readGateBlocks(params: { limit?: number | undefined }): Promise<GateBlocksResult> {
    this.gateBlockLimits.push(params.limit);
    return this.gateBlocks;
  }

  async readSignalLogs(): Promise<StageResult<SignalEvaluation>> {
    return this.signalLogs;
  }

  async readEntryDecisions(params: {
    limit?: number | undefined;
  }): Promise<StageResult<EntryDecision>> {
    this.entryDecisionLimits.push(params.limit);
    return this.entryDecisions;
  }

  /** One evaluation in full, and the agent's own funnel. */
  ownEvaluation: EvaluationResult = { kind: 'none' };
  ownFunnel: FunnelResult = { kind: 'none' };
  qualification: QualificationResult = { kind: 'none' };
  /** Every set of tickers the screening was asked about, in order. */
  readonly screened: string[][] = [];

  async readOwnEvaluationDetail(): Promise<EvaluationResult> {
    return this.ownEvaluation;
  }

  async readOwnFunnel(): Promise<FunnelResult> {
    return this.ownFunnel;
  }

  async readCoinQualification(params: {
    coinTickers: readonly string[];
  }): Promise<QualificationResult> {
    // Recorded rather than ignored: which coins the product chose to screen is
    // half of what this feature does, and a double that swallowed the argument
    // would let every choice test pass without a choice being made.
    this.screened.push([...params.coinTickers]);
    return this.qualification;
  }

  /** The trade story's two halves, each settable on its own. */
  tradeChart: TradeChartResult = { kind: 'not-found' };
  positionAudit: PositionAuditResult = { kind: 'none' };
  /** Every positionId the audit read was asked for — the join is the point. */
  readonly auditedPositions: string[] = [];

  async readTradeChart(): Promise<TradeChartResult> {
    return this.tradeChart;
  }

  async readPositionAudit(params: { positionId: string }): Promise<PositionAuditResult> {
    this.auditedPositions.push(params.positionId);
    return this.positionAudit;
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
    // Null is what most reads honestly produce: no reported model name, and
    // no spend figure — the roster is the only read that populates the
    // latter, and null is never a spend of zero.
    modelDisplayName: null,
    last24hCostUsd: null,
    tradingConfig: null,
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
      signalTimeoutMinutes: 10,
      maxEntryDeviationAtrMultiple: 1.5,
      minTradeConviction: 0.35,
      gridMinConfidence: 0.7,
      positionSizePresets: { sizingStrategy: 'MANUAL', smallPct: 1, mediumPct: 2.5, largePct: 5 },
      positionManagement: { positionManagementPreset: 'CUSTOM', enabled: false },
      ...overrides,
      // Read-only, and last on purpose: a test must not be able to override
      // them away, because the live server always sends them.
      strategyTimeframe: '1h',
      regimeAutoDerive: true,
      regimeTimeframe: '4h',
      atrMatchesStrategyTimeframe: true,
      atrTimeframe: '1h',
      // Trade-level policy: agent-owned until v14, strategy-owned since v15.
      // The read still carries it; the write rejects it.
      maxStopLossPct: 1,
      minStopLossPct: 0.5,
      minRiskRewardRatio: 1.5,
    },
  };
}

/**
 * The eight the read carries and the write rejects: three since the beginning,
 * the two ATR fields v14.0.0 dropped, and the three trade-level policy fields
 * v15.0.0 moved onto the strategy.
 */
export const READ_ONLY_CONFIG_FIELDS = [
  'strategyTimeframe',
  'regimeAutoDerive',
  'regimeTimeframe',
  'atrMatchesStrategyTimeframe',
  'atrTimeframe',
  'maxStopLossPct',
  'minStopLossPct',
  'minRiskRewardRatio',
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
        // twelve values choosing it actually sends, mirroring the live read
        // of 2026-08-11 at v17.2.0.
        config: {
          enabled: true,
          breakEvenEnabled: true,
          breakEvenTriggerR: 1.51,
          trailingEnabled: true,
          trailingGivebackPct: 55,
          trailingBufferPct: 0.5,
          timeDecayEnabled: true,
          timeDecayGracePeriodMinutes: 120,
          timeDecayIntervalMinutes: 30,
          timeDecayTightenPct: 3,
          timeDecayMaxTightenPct: 30,
          timeDecayStaleThresholdTpProgressPct: 15,
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

/**
 * Deterministic tokens, so a test can assert which one was issued.
 *
 * The counter is **per module, not per instance**. It was per instance, and two
 * of them both minted `r1` — so a test or probe that built a fresh one per
 * describe, sharing a confirmation store, had its second describe silently
 * overwrite the first's unconsumed entry. The first agreement then pointed at
 * the second edit's target, and which consume failed depended on the order they
 * happened to be spent in.
 *
 * That is `live-write-probe-confirmation-flake`: two consecutive runs of the
 * live write-probe failing at *different* confirmation consumptions, for five
 * days, with no product defect anywhere. Real tokens are 32 random bytes and
 * cannot collide; a fixture that can is modelling an impossible platform.
 *
 * Still deterministic, still ordered, still `r<n>` — no test asserts a literal
 * value, and the guarantee that matters is uniqueness rather than which number
 * a given call gets.
 */
let sequentialTokens = 0;

export class SequentialRandom {
  token(): string {
    return `r${++sequentialTokens}`;
  }
  codeChallengeS256(verifier: string): string {
    return `challenge(${verifier})`;
  }
}

/**
 * The decision that opened the live HYPE position of 2026-08-06.
 *
 * Its id is the `decisionId` `aPosition()` carries, so the two fixtures join
 * the way the platform's own rows do. `stopLoss` is the recorded 55.67456526
 * against the position's `effectiveStopLoss: 55.954` — trailing having walked
 * the stop 28 cents up a $56 instrument, which is the drift this pair exists
 * to exercise.
 *
 * **The target is the position's effective one, and the arithmetic says it was
 * never moved.** Against an entry of 56.233 the decided stop and target sit at
 * exactly 2.0 risk-reward — 0.55843474 of risk against 1.11686948 of reward —
 * which is a decision-time construction, not a coincidence. Walking the stop
 * to 55.954 takes the same pair to 4.0, because trailing shrinks the risk and
 * leaves the reward alone. So the fixture drifts on the stop only, which is
 * the observed case, and a test that moves the target is saying something
 * deliberate rather than restating the default.
 */
export function anEntryDecision(overrides: Partial<EntryDecision> = {}): EntryDecision {
  return {
    id: '4f1096e9-cb21-4695-ad4f-0befd0b5f704',
    coinTicker: 'HYPE',
    decision: 'ENTER',
    direction: 'LONG',
    conviction: 0.65,
    entryPrice: 56.233,
    stopLoss: 55.67456526,
    takeProfit: 57.34986948,
    riskRewardRatio: 2,
    status: 'EXECUTED',
    reasoning: null,
    checklist: [],
    positionSizePct: null,
    positionSizePreset: null,
    timeHorizon: '1h',
    atrPct: null,
    expiresAt: null,
    executedAt: '2026-08-06T17:10:18.262Z',
    executedOrderId: null,
    stopLossOrderId: null,
    takeProfitOrderId: null,
    at: '2026-08-06T17:10:17.000Z',
    ...overrides,
  };
}

/** Shaped from the live `list_trade_outcomes` row of 2026-08-02. */
/** Shaped from the live READY chart of 2026-08-08 — the probed WIF winner. */
export function aTradeChart(overrides: Partial<TradeChart> = {}): TradeChart {
  return {
    signalLogId: 'dbd15ad8-0000-0000-0000-000000000000',
    positionId: 'p-wif-1',
    coinTicker: 'WIF',
    timeframe: '5m',
    source: 'dwellir-hyperliquid-index',
    windowStart: '2026-08-07T22:45:00.000Z',
    windowEnd: '2026-08-08T05:35:00.000Z',
    candles: [
      {
        openTime: '2026-08-07T22:45:00.000Z',
        timeSeconds: 1786142700,
        open: 0.1371,
        high: 0.13714,
        low: 0.1371,
        close: 0.13711,
        volume: 991,
      },
      {
        openTime: '2026-08-07T22:50:00.000Z',
        timeSeconds: 1786143000,
        open: 0.13711,
        high: 0.13792,
        low: 0.13701,
        close: 0.13788,
        volume: 1240,
      },
    ],
    levels: [
      { role: 'STOP_LOSS', label: 'Stop Loss', price: 0.1368296 },
      { role: 'TAKE_PROFIT', label: 'Take Profit', price: 0.1409912 },
    ],
    markers: [
      { role: 'ENTRY', timeSeconds: 1786144500, price: 0.13783108 },
      { role: 'EXIT', timeSeconds: 1786165500, price: 0.14099 },
    ],
    snapshotCapturedAt: '2026-08-08T05:41:24.459Z',
    ...overrides,
  };
}

/** Shaped from the live audit trail of 2026-08-08 — a break-even reprice. */
export function anAuditEvent(overrides: Partial<AuditEvent> = {}): AuditEvent {
  return {
    kind: 'SL_REPLACED',
    leg: 'SL',
    orderId: '70c38afa-7bce-440c-abd6-009db2412fa6',
    at: '2026-08-08T04:11:43.331Z',
    heldMs: 17674218,
    vsEntryPct: 0.14,
    price: null,
    fromPrice: '0.13682960',
    toPrice: '0.13802000',
    triggerDeltaPct: 0.87,
    improved: true,
    repriceSource: 'BREAK_EVEN',
    replacementOrderId: '371fa73d-9759-4fc2-be57-49b0565a09fe',
    ...overrides,
  };
}

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

/**
 * The account's own figures, as `get_account_state` sends them.
 *
 * Defaults are the live account of 2026-08-10: a **$43.67** balance against
 * agents carrying a $250 exposure cap, which is the reading the risk panel
 * exists to make. Overrides let a test say the one thing it is about.
 */
export class FakeAccountStatePort implements AccountStatePort {
  state: AccountState = {
    balanceUsd: 43.667427,
    hasAccount: true,
    tradingWalletProvisioned: true,
    mcpWagerEnabled: true,
    agentSlotLimit: 3,
    agentSlotsUsed: 3,
  };
  readable = true;

  async readAccountState(): Promise<AccountStateResult> {
    if (!this.readable) {
      return { kind: 'unreadable', reason: 'BattleGrid did not respond', cause: 'unreachable' };
    }
    return { kind: 'state', state: this.state };
  }
}
