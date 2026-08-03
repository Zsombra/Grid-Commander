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
