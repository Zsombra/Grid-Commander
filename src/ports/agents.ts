import type { Agent, SlotUsage } from '@/domain/agent/agent.js';
import type { Budget } from '@/domain/agent/budget.js';
import type { AgentRecord } from '@/domain/agent/journal.js';
import type { ThoughtEntry } from '@/domain/agent/thought.js';
import type { Brain } from '@/domain/agent/brain.js';
import type { CatalogResult } from '@/domain/agent/catalog.js';
import type { TradingConfig } from '@/domain/agent/trading-config.js';
import type { Confirmation } from '@/domain/capability/confirmation.js';
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

  getAgent(params: { userId: string; accessToken: string; agentId: string }): Promise<Agent>;

  readCatalog(params: { userId: string; accessToken: string }): Promise<CatalogResult>;

  createAgent(params: {
    userId: string;
    accessToken: string;
    displayName: string;
    brain: Brain;
    strategyId: string;
    tradingConfig: TradingConfig | null;
    arenaChallengeEnabled?: boolean | undefined;
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
   * Read rather than derived from `get_agent_performance`, which answers
   * zeros and an empty curve on agents carrying real closed losses — three
   * observations across three sessions
   * (`performance-and-allocation-are-unmodelled`). The outcomes are alive;
   * the aggregate is not.
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
}

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
