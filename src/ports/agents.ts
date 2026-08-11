import type { Agent, SlotUsage } from '@/domain/agent/agent.js';
import type { Budget } from '@/domain/agent/budget.js';
import type { AgentRecord } from '@/domain/agent/journal.js';
import type { ThoughtEntry } from '@/domain/agent/thought.js';
import type { Brain } from '@/domain/agent/brain.js';
import type { Catalog } from '@/domain/agent/catalog.js';
import type { TradingConfig } from '@/domain/agent/trading-config.js';
import type { Confirmation } from '@/domain/capability/confirmation.js';
import type { EvaluationScorecard } from '@/domain/agent/scorecard.js';

/**
 * Re-exported so routes reach these through the port they already depend
 * on. `app/` may import ports and never the domain (boundaries W-D/W-E),
 * and `ExplorerPort` does the same for its half of the surface.
 */
export type {
  ConditionClause,
  ConditionOutcome,
  ConditionReport,
  ConsultedSignal,
  EvaluationChain,
  EvaluationScorecard,
  ScoreAttribution,
  ThinkingCost,
} from '@/domain/agent/scorecard.js';
import type { FailureCause } from './failure.js';

/**
 * Everything the product does to agents.
 *
 * Implemented once, in `src/infrastructure/battlegrid/`. Every mutating method
 * runs through the same guard sequence as any other BattleGrid call —
 * classification, scope, confirmation, audit — because a second path to
 * BattleGrid would make all of those advisory.
 */
export interface AgentsPort {
  /** Roster and capacity. Both come back from the same call. */
  listAgents(params: { userId: string; accessToken: string }): Promise<RosterResult>;

  /**
   * What the whole fleet spent on model calls in the last 24 hours, as the
   * platform totals it.
   *
   * `get_agents_hub`'s summary is the only place this total exists on the
   * 114-tool surface (observed 2026-08-11, #129). The per-agent figure lives
   * on the roster row and is deliberately not read from here — two sources of
   * one rendered fact are two things that can disagree, and this account has
   * already watched that happen on exactly this field.
   */
  readFleetSpend(params: { userId: string; accessToken: string }): Promise<FleetSpendResult>;

  getAgent(params: { userId: string; accessToken: string; agentId: string }): Promise<Agent>;

  readCatalog(params: { userId: string; accessToken: string }): Promise<CatalogResult>;

  createAgent(params: {
    userId: string;
    accessToken: string;
    displayName: string;
    brain: Brain;
    strategyId: string;
    tradingConfig: TradingConfig | null;
    idempotencyKey?: string | undefined;
  }): Promise<Agent>;

  /**
   * `changes` carries only agent-owned fields, and `expectedRevision` is
   * required — not optional-with-a-default. A mutation composed without the
   * revision it was formed against is unrepresentable rather than merely
   * discouraged.
   */
  updateAgent(params: {
    userId: string;
    accessToken: string;
    agentId: string;
    expectedRevision: number;
    changes: Readonly<Record<string, unknown>>;
    /**
     * `update_intelligence_agent` carries `destructiveHint: true`, so the guard
     * demands one. This parameter did not exist, which meant no caller could
     * satisfy the guard and every rename was refused by the product before it
     * reached the platform — the sibling of the 23-vs-20 defect one layer out.
     *
     * It is now the pair rather than the bare token: this is the write that
     * carries money, and the target is what makes the amounts part of what was
     * agreed to.
     */
    confirmation: Confirmation;
  }): Promise<Agent>;

  rebindAgent(params: {
    userId: string;
    accessToken: string;
    agentId: string;
    strategyId: string;
    expectedRevision: number;
    /** Issued against the (agent, target strategy) pair. Never a boolean. */
    confirmation: Confirmation;
  }): Promise<Agent>;

  setLifecycle(params: {
    userId: string;
    accessToken: string;
    agentId: string;
    expectedRevision: number;
    to: 'ACTIVE' | 'ARCHIVED';
    /** Archiving is destructive by classification; reactivating is not. */
    confirmation?: Confirmation | undefined;
  }): Promise<Agent>;

  /**
   * An agent's decision cycles, newest first.
   *
   * `agentId` omitted reads the account-wide log — BattleGrid exposes those as
   * two tools (`get_agent_thought_log`, `get_user_thought_log`) returning the
   * same entry shape, established by calling both.
   */
  readThoughtLog(params: {
    userId: string;
    accessToken: string;
    agentId?: string | undefined;
    limit?: number | undefined;
  }): Promise<ThoughtLogResult>;

  /** How close this agent is to the ceilings that would stop it. */
  readBudget(params: {
    userId: string;
    accessToken: string;
    agentId: string;
  }): Promise<BudgetResult>;

  readJournal(params: {
    userId: string;
    accessToken: string;
    agentId: string;
    limit?: number | undefined;
  }): Promise<JournalResult>;

  /**
   * What the agent actually did with the money: the trades it closed.
   *
   * Read rather than taken from `get_agent_performance`, which measures
   * something narrower than its name suggests: P&L **against the agent's
   * risk-budget baseline**. An agent with no budget configured
   * (`maxConcurrentExposureUsd: 0`) reports zeros and an empty curve while
   * carrying real closed losses — four agents, three sessions. An agent that
   * has one reports correctly and agrees with the outcomes to the cent
   * (-0.23 against -0.23582, a 26-point curve for 26 trades, live
   * 2026-08-06).
   *
   * So the tool is not broken and the record here is still the right source:
   * it answers the same question the same way whether or not a budget was
   * ever set, which is what a trading record has to do.
   */
  readTradeOutcomes(params: {
    userId: string;
    accessToken: string;
    agentId: string;
    page?: number | undefined;
    limit?: number | undefined;
  }): Promise<TradeOutcomesResult>;

  /**
   * Candidates that never reached signal evaluation — the first place a
   * silent agent's silence is explained. The platform's reason code and
   * its quantified detail are both carried: "INSUFFICIENT_EQUITY" is a
   * category, `{equityUsd: 2.18, thresholdUsd: 10}` is the answer.
   */
  readGateBlocks(params: {
    userId: string;
    accessToken: string;
    agentId: string;
    limit?: number | undefined;
  }): Promise<StageResult<GateBlock>>;

  /** Evaluations that ran: score against the threshold that was in force. */
  readSignalLogs(params: {
    userId: string;
    accessToken: string;
    agentId: string;
    limit?: number | undefined;
  }): Promise<StageResult<SignalEvaluation>>;

  /** What the agent decided, and the reasoning it wrote for deciding it. */
  readEntryDecisions(params: {
    userId: string;
    accessToken: string;
    agentId: string;
    limit?: number | undefined;
  }): Promise<StageResult<EntryDecision>>;

  /**
   * One of the user's own evaluations, in full.
   *
   * `list_signal_logs` returns 23 keys per row; `get_signal_log` returns
   * 31 — the difference is the scorecard, the attribution, the chain and
   * the linked decision. This product read the 23 and showed a stranger's
   * agent more than the user's own until 2026-08-03.
   */
  readOwnEvaluationDetail(params: {
    userId: string;
    accessToken: string;
    agentId: string;
    logId: string;
  }): Promise<EvaluationResult>;

  /** How much this agent evaluated against how much it acted on. */
  readOwnFunnel(params: {
    userId: string;
    accessToken: string;
    agentId: string;
  }): Promise<FunnelResult>;

  /**
   * Whether this agent's gates would admit a trade on each named coin, now.
   *
   * The only prospective read in this port. Everything else here answers what
   * an agent already did; this answers what it would do, which is the question
   * an operator tuning one actually has. BattleGrid screens at most twelve
   * tickers per call and spends no LLM call doing it.
   */
  readCoinQualification(params: {
    userId: string;
    accessToken: string;
    agentId: string;
    coinTickers: readonly string[];
  }): Promise<QualificationResult>;

  /**
   * The platform's frozen chart of one trade: the candle series, the
   * protection levels it placed on it, and the entry/exit markers.
   *
   * Discriminated the way the platform discriminates it — a chart, an
   * evaluation that never became a filled trade, an evaluation that does
   * not exist on this agent — and none of those three is a read failure.
   */
  readTradeChart(params: {
    userId: string;
    accessToken: string;
    agentId: string;
    logId: string;
  }): Promise<TradeChartResult>;

  /**
   * The order-lifecycle audit trail for one position, in the platform's
   * order. The only read that shows position management *acting* — every
   * reprice with both prices and the platform's own judgement of whether
   * the move improved protection.
   */
  readPositionAudit(params: {
    userId: string;
    accessToken: string;
    agentId: string;
    positionId: string;
  }): Promise<PositionAuditResult>;
}

/** One frozen candle, exactly as the platform froze it. */
export interface Candle {
  readonly openTime: string | null;
  readonly timeSeconds: number | null;
  readonly open: number | null;
  readonly high: number | null;
  readonly low: number | null;
  readonly close: number | null;
  readonly volume: number | null;
}

/**
 * A horizontal line the platform drew: where protection was placed.
 *
 * `role` and `label` are both the platform's. The label is its display
 * text and is preferred where present; a role this product does not
 * recognise is still drawn and named, per the port's standing rule for
 * vocabulary it did not coin.
 */
export interface ChartLevel {
  readonly role: string;
  readonly label: string | null;
  readonly price: number | null;
}

/** A point the platform placed: where the trade entered or left. */
export interface ChartMarker {
  readonly role: string;
  readonly timeSeconds: number | null;
  readonly price: number | null;
}

/**
 * The frozen chart of one trade.
 *
 * The levels here are the levels **as placed** — the audit trail carries
 * how they moved afterwards, and the two must be labelled apart wherever
 * both appear (live 2026-08-08: the probed winner's chart stop was the
 * `SL_PLACED` price, five moves behind the stop that ended the trade).
 */
export interface TradeChart {
  readonly signalLogId: string | null;
  readonly positionId: string | null;
  readonly coinTicker: string | null;
  readonly timeframe: string | null;
  readonly source: string | null;
  readonly windowStart: string | null;
  readonly windowEnd: string | null;
  readonly candles: readonly Candle[];
  readonly levels: readonly ChartLevel[];
  readonly markers: readonly ChartMarker[];
  readonly snapshotCapturedAt: string | null;
}

export type TradeChartResult =
  | { readonly kind: 'chart'; readonly chart: TradeChart }
  /** The evaluation ran and never became a filled trade. Not an error. */
  | { readonly kind: 'no-trade' }
  /** No evaluation with that id belongs to that agent. */
  | { readonly kind: 'not-found' }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

/**
 * One order-lifecycle event, discriminated on `kind` — which stays a
 * string because the vocabulary is the platform's (`ENTRY_FILLED`,
 * `SL_REPLACED`, …) and an event kind this product does not recognise is
 * still shown in sequence.
 *
 * Prices are **decimal strings**, because that is how this surface sends
 * them — `"0.13682960"` — and reformatting a price the platform chose to
 * express exactly is a derivation nothing here needs. The chart's prices
 * are numbers for the same reason: carried as sent.
 *
 * A placement/fill/cancel carries `price`; a reprice carries `fromPrice`,
 * `toPrice`, the platform's `triggerDeltaPct`, its `repriceSource`, and
 * its own `improved` judgement. `vsEntryPct` is null on the entry event
 * itself — the baseline — and `heldMs` is null where the platform sent
 * none.
 */
export interface AuditEvent {
  readonly kind: string;
  readonly leg: string | null;
  readonly orderId: string | null;
  readonly at: string | null;
  readonly heldMs: number | null;
  readonly vsEntryPct: number | null;
  readonly price: string | null;
  readonly fromPrice: string | null;
  readonly toPrice: string | null;
  readonly triggerDeltaPct: number | null;
  readonly improved: boolean | null;
  readonly repriceSource: string | null;
  readonly replacementOrderId: string | null;
}

export type PositionAuditResult =
  | { readonly kind: 'events'; readonly events: readonly AuditEvent[] }
  /** The position exists and the platform has no events for it. */
  | { readonly kind: 'none' }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

export type EvaluationResult =
  | { readonly kind: 'evaluation'; readonly evaluation: EvaluationScorecard }
  /** The platform lists the evaluation but publishes no detail for it. */
  | { readonly kind: 'none' }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

/**
 * What an agent looked at, what it decided, and how it ended.
 *
 * `skipDecisions` and `skippedTerminal` are two counters the platform names
 * similarly and means differently — decisions that were SKIP versus
 * pipelines whose terminal status was SKIPPED. Never summed, never
 * substituted. The same shape `ExplorerPort` reads for a competitor,
 * because it is the same question asked of a different agent.
 */
export interface AgentFunnel {
  readonly totalEvaluations: number | null;
  readonly totalDecisions: number | null;
  readonly enterDecisions: number | null;
  readonly skipDecisions: number | null;
  readonly skippedTerminal: number | null;
  readonly executed: number | null;
  readonly failed: number | null;
  readonly expired: number | null;
  readonly cancelled: number | null;
  readonly blocked: number | null;
  readonly pending: number | null;
  readonly fillRatePercent: number | null;
  readonly avgAggregateScorePercent: number | null;
  readonly avgConvictionPercent: number | null;
  readonly avgRiskRewardRatio: number | null;
  readonly outcomeCount: number | null;
  readonly winCount: number | null;
  readonly lossCount: number | null;
  readonly winRatePercent: number | null;
  readonly avgNetPnl: number | null;
  readonly totalNetPnl: number | null;
  readonly avgDurationSeconds: number | null;
  readonly topCoins: readonly { readonly coinTicker: string; readonly count: number | null }[];
}

export type FunnelResult =
  | { readonly kind: 'funnel'; readonly funnel: AgentFunnel }
  /** The agent has evaluated nothing. Distinct from a funnel of zeros. */
  | { readonly kind: 'none' }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

/**
 * One stage of the decision pipeline.
 *
 * Generic because the three stages fail independently and must be allowed
 * to: an agent whose gate blocks cannot be read still has evaluations
 * worth showing, and a stage that is empty is a finding rather than a
 * blank. `total` is what the platform says exists beyond this page.
 */
export type StageResult<T> =
  | { readonly kind: 'entries'; readonly entries: readonly T[]; readonly total: number | null }
  | { readonly kind: 'none' }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

/** A candidate stopped before it was ever evaluated. */
export interface GateBlock {
  readonly id: string;
  /** Null when the block was account-wide rather than about one market. */
  readonly coinTicker: string | null;
  readonly gateStage: string;
  readonly reasonCode: string;
  /** The numbers behind the code, as the platform structured them. */
  readonly reasonDetail: Readonly<Record<string, unknown>>;
  readonly at: string | null;
}

/** One signal evaluation that ran, and how it measured up. */
export interface SignalEvaluation {
  readonly id: string;
  readonly coinTicker: string | null;
  readonly aggregateScore: number | null;
  /** The threshold in force when this ran — not today's setting. */
  readonly minAggregateScore: number | null;
  readonly minRequiredCount: number | null;
  readonly triggeredSignalCount: number | null;
  readonly dominantBias: string | null;
  readonly assessmentDirection: string | null;
  readonly hasConflictingSignals: boolean;
  readonly gateStatus: string | null;
  readonly gateReason: string | null;
  /** Where the pipeline ended for this candidate, e.g. `SKIPPED`. */
  readonly terminalStatus: string | null;
  readonly at: string | null;
}

/**
 * One signal's reading, as the agent recorded it while deciding.
 *
 * `verdict` stays a string on purpose. The platform sends `CONFIRM`, `WARN`
 * and `REJECT` today, and a three-state reading collapsed into pass/fail
 * would lose the middle one entirely — the same class of error as a missing
 * figure rendered as zero. A vocabulary this port does not recognise is
 * still shown, because the platform saying something new is not a reason to
 * hide it.
 */
export interface SignalVerdict {
  readonly signalId: string;
  /** The platform's display name for the signal, e.g. `RSI(14) Overbought`. */
  readonly label: string | null;
  readonly verdict: string | null;
  /** What this signal saw, in the platform's own words. */
  readonly interpretation: string | null;
}

/** A decision the agent reached, in its own words. */
export interface EntryDecision {
  readonly id: string;
  readonly coinTicker: string | null;
  /** `ENTER` or `SKIP`, as the platform says it. */
  readonly decision: string;
  readonly direction: string | null;
  readonly conviction: number | null;
  readonly entryPrice: number | null;
  readonly stopLoss: number | null;
  readonly takeProfit: number | null;
  readonly riskRewardRatio: number | null;
  readonly status: string | null;
  /** The model's own paragraph. Never paraphrased, never truncated here. */
  readonly reasoning: string | null;
  /**
   * The evidence the reasoning was drawn from, signal by signal.
   *
   * Empty when the platform sent none — which is a decision without
   * recorded evidence, not a decision whose evidence failed to load.
   */
  readonly checklist: readonly SignalVerdict[];
  /** What it would have staked: percent of allocation, and the preset's name. */
  readonly positionSizePct: number | null;
  readonly positionSizePreset: string | null;
  /** The horizon it reasoned over, e.g. `1h`. */
  readonly timeHorizon: string | null;
  /** The volatility it sized the stop against, as a percent. */
  readonly atrPct: number | null;
  readonly expiresAt: string | null;
  readonly executedAt: string | null;
  /**
   * What the exchange was actually told, when it was told anything.
   *
   * Present on decisions that reached execution; all three are null on a
   * SKIP. They are the thread from "the agent decided" to "an order exists".
   */
  readonly executedOrderId: string | null;
  readonly stopLossOrderId: string | null;
  readonly takeProfitOrderId: string | null;
  readonly at: string | null;
}

/**
 * One closed trade, kept whole.
 *
 * Every money figure the platform sends is carried: dropping a fee or one
 * side's slippage would misstate a loss, and this is the surface an
 * operator will use to decide whether an agent earns its capital.
 */
export interface TradeOutcome {
  readonly id: string;
  readonly coinTicker: string;
  readonly direction: string;
  /** Why it ended, and who ended it — the platform's own words. */
  readonly closeReason: string | null;
  readonly closedBy: string | null;
  readonly entryFillPrice: number | null;
  readonly exitFillPrice: number | null;
  readonly realizedPnl: number | null;
  readonly totalFees: number | null;
  /** Realized P&L after fees. What the trade was actually worth. */
  readonly netPnl: number | null;
  readonly slippageEntry: number | null;
  readonly slippageExit: number | null;
  readonly effectiveLeverage: number | null;
  /** How sure the agent was when it opened — 0..1 as the platform sends it. */
  readonly conviction: number | null;
  readonly openedAt: string | null;
  readonly closedAt: string | null;
  readonly durationSeconds: number | null;
  /** Links back to the reasoning: the decision and the signal log. */
  readonly decisionId: string | null;
  readonly signalLogId: string | null;
}

/**
 * One gate, as the platform measures it: the reading and the bar.
 *
 * Three gates, each with its own pair of field names rather than a shared
 * `{measured, threshold}`. The units differ — two percents and a count — and a
 * generic pair invites exactly the mistake `pipeline/page.tsx` documents at
 * length: a value the platform already expressed as a percentage passed through
 * a fraction formatter and rendered as 3970%. The names carry the unit, so a
 * call site cannot lose it.
 *
 * `verdict` stays a string. The platform sends `CLEARED`, `FAILING`,
 * `NOT_ENFORCED` and `UNMEASURABLE`, and the last two are not failures — a gate
 * nobody configured and a gate that could not be measured are both *not* a coin
 * falling short. Collapsing four states into pass/fail would report an
 * unconfigured floor as an obstacle to remove.
 */
export interface AggregateScoreGate {
  readonly verdict: string;
  readonly scorePercent: number | null;
  readonly minScorePercent: number | null;
}

export interface RequiredCountGate {
  readonly verdict: string;
  readonly count: number | null;
  readonly min: number | null;
}

export interface AtrVolatilityGate {
  readonly verdict: string;
  readonly atrPct: number | null;
  readonly minAtrPct: number | null;
}

export interface QualificationGates {
  readonly aggregateScore: AggregateScoreGate;
  readonly requiredCount: RequiredCountGate;
  readonly atrVolatility: AtrVolatilityGate;
}

/**
 * One direction's answer. A coin can qualify long and not short.
 *
 * `candidateLevels` is the construction step before any gate is scored: whether
 * a stop and a target could be placed at all. `rejectionStage` names where that
 * construction stopped — `NO_SL_CANDIDATES`, `SL_POLICY_FILTERED` and the rest —
 * and is null when nothing rejected it.
 */
export interface DirectionQualification {
  readonly qualifies: boolean;
  readonly firstFailReason: string | null;
  readonly candidateLevels: {
    readonly ok: boolean;
    readonly rejectionStage: string | null;
  };
}

/** One coin, screened against one agent's gates. */
export interface CoinQualification {
  readonly coinTicker: string;
  readonly coinName: string | null;
  readonly qualifies: boolean;
  /**
   * The first gate that failed, **in the platform's live evaluation order**.
   *
   * Not derivable from `gates`: the platform stops at the first failure, so a
   * gate listed after it may never have been measured. Deriving our own order
   * would name a different gate than the one actually standing in the way.
   */
  readonly firstFailReason: string | null;
  /** The timeframe the agent's bound strategy reasons over. */
  readonly strategyTimeframe: string | null;
  readonly evaluatedAt: string | null;
  readonly gates: QualificationGates;
  readonly long: DirectionQualification;
  readonly short: DirectionQualification;
}

export type QualificationResult =
  | { readonly kind: 'verdicts'; readonly verdicts: readonly CoinQualification[] }
  /** The platform answered and screened nothing. Never an unreadable read. */
  | { readonly kind: 'none' }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

export type TradeOutcomesResult =
  | {
      readonly kind: 'outcomes';
      readonly outcomes: readonly TradeOutcome[];
      /** What the platform says exists in total, for paging. */
      readonly total: number | null;
    }
  | { readonly kind: 'none' }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

/**
 * Three states, not an array that might be empty.
 *
 * A user whose roster failed to load must not be told they have no agents.
 * That mistake ends with them creating a duplicate of something they already
 * own, or believing something deleted their work. See design D-H — the type is
 * what keeps the distinction alive at every call site.
 */
export type RosterResult =
  | { readonly kind: 'agents'; readonly agents: readonly Agent[]; readonly slots: SlotUsage | null }
  | { readonly kind: 'empty'; readonly slots: SlotUsage | null }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };


export type BudgetResult =
  | { readonly kind: 'budget'; readonly budget: Budget }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

/**
 * The vocabulary the create form is built from, or why there is none.
 *
 * A distinct state rather than an empty catalog: an empty catalog would offer a
 * form with no choices and reject everything the user typed, which is worse
 * than saying the platform could not be reached.
 *
 * Declared here with its siblings rather than in `@/domain/agent/catalog.js`,
 * where it used to sit. The domain does not know `FailureCause` — so this was
 * the one read outcome that could not distinguish a refusal from an outage,
 * and `/agents/new` was the one failure surface that told the user to wait
 * whichever it was.
 */
export type CatalogResult =
  | { readonly kind: 'catalog'; readonly catalog: Catalog }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

export type ThoughtLogResult =
  | { readonly kind: 'entries'; readonly entries: readonly ThoughtEntry[]; readonly total: number }
  /** The agent has not reasoned yet. Distinct from `unreadable` — see the roster. */
  | { readonly kind: 'empty' }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

/**
 * The three states, over an agent's whole record rather than one list.
 *
 * `empty` now means the platform sent three empty collections — which is what a
 * freshly created agent looks like before its first cycle. It used to mean
 * something else entirely: the mapper read a key the response does not carry,
 * `Array.isArray(undefined)` was false, and a missed lookup was reported as an
 * agent that had done nothing. Three states cannot keep *unreadable* apart from
 * *silent* if a fourth case is quietly folded into the reassuring one.
 */
export type JournalResult =
  | { readonly kind: 'record'; readonly record: AgentRecord }
  | { readonly kind: 'empty' }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

/**
 * The platform's own fleet totals. `null` where the summary carried no
 * readable figure — never zero, which is a spend, not the absence of one.
 */
export type FleetSpendResult =
  | {
      readonly kind: 'spend';
      readonly totalCost24hUsd: number | null;
      readonly activeAgents: number | null;
    }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };
