import type { Agent, SlotUsage } from '@/domain/agent/agent.js';
import type { Brain } from '@/domain/agent/brain.js';
import type { CatalogResult } from '@/domain/agent/catalog.js';
import type { TradingConfig } from '@/domain/agent/trading-config.js';
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
  }): Promise<Agent>;

  rebindAgent(params: {
    userId: string;
    accessToken: string;
    agentId: string;
    strategyId: string;
    expectedRevision: number;
    /** Issued against the (agent, target strategy) pair. Never a boolean. */
    confirmationToken: string;
  }): Promise<Agent>;

  setLifecycle(params: {
    userId: string;
    accessToken: string;
    agentId: string;
    expectedRevision: number;
    to: 'ACTIVE' | 'ARCHIVED';
    /** Archiving is destructive by classification; reactivating is not. */
    confirmationToken?: string | undefined;
  }): Promise<Agent>;

  readJournal(params: {
    userId: string;
    accessToken: string;
    agentId: string;
    limit?: number | undefined;
  }): Promise<JournalResult>;
}

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

export interface JournalEntry {
  readonly at: Date;
  readonly kind: string;
  readonly summary: string;
  readonly detail: string | null;
}

export type JournalResult =
  | { readonly kind: 'entries'; readonly entries: readonly JournalEntry[] }
  | { readonly kind: 'empty' }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };
