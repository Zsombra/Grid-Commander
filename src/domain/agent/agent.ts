import type { Brain } from './brain.js';
import type { Performance } from './performance.js';
import type { TradingConfig } from './trading-config.js';

/**
 * An agent, as the authoring rules need it.
 *
 * Deliberately not BattleGrid's payload. That carries thirty fields including
 * avatar urls, cost telemetry and a performance block, none of which
 * participates in a rule. Importing all of it would make every rule look like
 * it depends on things it does not, and would couple the domain to a shape that
 * changes when BattleGrid ships. See design D-A; the mapping lives at the
 * infrastructure boundary.
 *
 * **The performance block is now here, and the sentence above is kept rather
 * than quietly edited.** Its rule was right and its conclusion was too wide.
 * "Governs no mutation" is the correct test for what an *authoring* rule may
 * depend on; it is the wrong test for what the product may show, and this is a
 * workbench for building, tuning and *understanding*. The block arrived on every
 * roster read for the life of the product and was discarded every time, and a
 * comment that read as settled is why nobody asked again.
 *
 * The rest of the exclusion stands. Avatar urls, `last24hCostUsd`,
 * `activeGameCount` and `provider` remain unmapped — not because they are
 * uninteresting, but because nothing has asked for them yet, which is a
 * different reason from the one above and worth keeping distinct.
 */
export interface Agent {
  readonly id: string;
  /** Optimistic concurrency. Every mutation must carry the one it was read at. */
  readonly revision: number;
  readonly displayName: string;
  readonly status: AgentStatus;
  readonly binding: StrategyBinding;
  readonly brain: Brain;
  readonly tradingConfig: TradingConfig | null;
  readonly arenaChallengeEnabled: boolean;
  readonly overlayText: string | null;
  /**
   * How it has done, or `null` when the payload carried no record.
   *
   * Null means absent, never "has done nothing" — an agent that has played no
   * games reports a `Performance` full of zeroes, and `isUnproven` is what tells
   * those apart.
   */
  readonly performance: Performance | null;
  /**
   * What BattleGrid says this client may do to this agent.
   *
   * Note what is absent: `canDelete`. The live payload sets it true, and there
   * is no delete tool in the MCP surface — the flag describes what BattleGrid's
   * own app can do. Mapping it would produce an affordance that cannot work.
   * See findings-agents F-1 and decision AL-2.
   */
  readonly permissions: AgentPermissions;
}

export type AgentStatus = 'ACTIVE' | 'ARCHIVED';

export interface AgentPermissions {
  readonly canEdit: boolean;
  readonly canArchive: boolean;
  readonly canEditOverlay: boolean;
}

/**
 * What the agent inherits, and from where.
 *
 * `strategyRevision` is the revision of the strategy at the moment its
 * configuration was materialized onto this agent — not the strategy's current
 * revision. The two diverging is meaningful, not a bug.
 */
export interface StrategyBinding {
  readonly strategyId: string;
  readonly strategyName: string;
  readonly strategyRevision: number;
  readonly state: string;
}

/** Nothing the platform owns is editable, whatever else is true. */
export function isEditable(agent: Agent): boolean {
  return agent.status === 'ACTIVE' && agent.permissions.canEdit;
}

export function isArchivable(agent: Agent): boolean {
  return agent.status === 'ACTIVE' && agent.permissions.canArchive;
}

export function isReactivatable(agent: Agent): boolean {
  return agent.status === 'ARCHIVED';
}

/**
 * Rebinding replaces strategy-materialized configuration wholesale, so it needs
 * the same authority as an edit — and, separately, a confirmation. See
 * `rebind.ts`.
 */
export function isRebindable(agent: Agent): boolean {
  return isEditable(agent);
}

/**
 * How many more agents this user may create, and why that is the number.
 *
 * The limit is a function of rank and level, which is the part worth telling
 * the user: "no slots left" is unhelpful, "Recruit III allows 3" is actionable.
 * BattleGrid returns this alongside the roster (findings-agents F-4), so
 * capacity is known without a second call and without local counting.
 */
export interface SlotUsage {
  readonly limit: number;
  readonly used: number;
  readonly remaining: number;
  readonly rankName: string;
}

export function hasCapacity(slots: SlotUsage): boolean {
  return slots.remaining > 0;
}
