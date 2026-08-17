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
 * The rest of the exclusion stands, and the list has shortened twice for the
 * same reason: `modelDisplayName` and `last24hCostUsd` are mapped now because
 * surfaces asked — the brain line showed a bare discriminator, and the page
 * titled "what would stop this agent" said nothing about spend. Avatar urls,
 * `activeGameCount`, `hasActiveAssignments` and `provider` remain unmapped
 * because nothing has asked for them yet, which is a different reason from
 * the one above and worth keeping distinct
 * (`the-payload-carries-more-than-is-read`).
 */
export interface Agent {
  readonly id: string;
  /** Optimistic concurrency. Every mutation must carry the one it was read at. */
  readonly revision: number;
  readonly displayName: string;
  readonly status: AgentStatus;
  readonly binding: StrategyBinding;
  readonly brain: Brain;
  /**
   * The platform's human-readable name for the brain's model — observed
   * `"GLM-5.2"` — or null when the payload named none.
   *
   * Kept beside `brain` rather than inside it, because the read-back
   * flattens the request's two-branch brain union into one `brainPreset`
   * field: every agent observed reads back `CUSTOM` whatever it was created
   * as, so the branch a read produces is not a fact about the agent and this
   * name must not be tied to one
   * (`preset-custom-in-the-preset-branch-is-unestablished`).
   */
  readonly modelDisplayName: string | null;
  /**
   * The running 24-hour spend, or null when the read this agent came from
   * does not report one.
   *
   * Null never means "spent nothing" — the platform reports an explicit
   * number when it reports at all. Only the roster read populates this; the
   * detail read answers 0 for an agent the list prices at $0.09, so its copy
   * is deliberately not read (see `mapAgent`, and
   * `the-cost-of-an-agent-reads-differently-from-two-tools`).
   */
  readonly last24hCostUsd: number | null;
  readonly tradingConfig: TradingConfig | null;
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
 *
 * `state` is kept as the platform's own word rather than narrowed to a union.
 * BattleGrid declares two — `BOUND` and `ORPHANED` — and this product has been
 * wrong before about a vocabulary being closed; a third value must reach a
 * surface as itself. `mapAgent` writes `UNKNOWN` when the payload carried no
 * state at all, which is a third thing again and also not a claim.
 */
export interface StrategyBinding {
  readonly strategyId: string;
  readonly strategyName: string;
  readonly strategyRevision: number;
  readonly state: string;
}

/**
 * The binding BattleGrid says is intact.
 *
 * A predicate rather than a comparison at each surface, for the reason
 * `isEditable` is one: the platform's vocabulary belongs in one place, and the
 * roster spent the life of the product hard-coding the *word* "Bound" over a
 * field it never read.
 */
export function isBound(binding: StrategyBinding): boolean {
  return binding.state === 'BOUND';
}

/**
 * The binding BattleGrid says is broken.
 *
 * Observed live 2026-08-06 on the second account: `Volatilis` reads
 * `strategy=Volatilis — imported (ORPHANED)`. What the state means
 * operationally is **not established** — whether the strategy was archived,
 * deleted or forked away, whether the agent goes on running the configuration
 * it materialized, and whether rebinding is the remedy. Nothing in this
 * product may assert any of that; a surface may say only that the strategy can
 * no longer be read, and name the revision the configuration came from.
 */
export function isOrphaned(binding: StrategyBinding): boolean {
  return binding.state === 'ORPHANED';
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
