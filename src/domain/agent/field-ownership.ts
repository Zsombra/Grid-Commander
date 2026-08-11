/**
 * Who owns which field.
 *
 * BattleGrid enforces a split that anything built on top must preserve: a
 * strategy owns *what the agent reads and how it reasons*; the agent owns *its
 * name, brain and money limits*. `update_intelligence_agent` cannot rebind, by
 * design, and a strategy edit never touches agent-owned settings.
 *
 * Held as data rather than as conditionals scattered across use cases, so the
 * boundary is one table a reviewer can check against the tool schema instead of
 * a property that has to be reconstructed from six call sites.
 */

export const AGENT_OWNED = [
  'displayName',
  'brain',
  'tradingConfig',
] as const;

/**
 * Materialized onto the agent when it is bound, and replaced wholesale when it
 * is rebound. Editable only by editing the strategy — or by rebinding, which
 * replaces all of it.
 */
export const STRATEGY_OWNED = [
  'contextSources',
  'signalRules',
  'reportTemplate',
  'prose',
  'timeframe',
] as const;

export type AgentOwnedField = (typeof AGENT_OWNED)[number];
export type StrategyOwnedField = (typeof STRATEGY_OWNED)[number];

export function isAgentOwned(field: string): field is AgentOwnedField {
  return (AGENT_OWNED as readonly string[]).includes(field);
}

export function isStrategyOwned(field: string): field is StrategyOwnedField {
  return (STRATEGY_OWNED as readonly string[]).includes(field);
}

export type FieldOwner = 'agent' | 'strategy' | 'unknown';

export function ownerOf(field: string): FieldOwner {
  if (isAgentOwned(field)) return 'agent';
  if (isStrategyOwned(field)) return 'strategy';
  return 'unknown';
}

export interface RejectedField {
  readonly field: string;
  readonly owner: FieldOwner;
  readonly reason: string;
}

/**
 * Split an intended edit into what may be sent and what may not.
 *
 * An unknown field is rejected rather than passed through. Passing it through
 * would mean this product forwarding a field it cannot reason about into a
 * mutation on someone's account — and if it turns out to be strategy-owned, the
 * split above would be enforced by BattleGrid rather than by us, which is one
 * deployment away from not being enforced at all.
 */
export function partitionEdit(changes: Readonly<Record<string, unknown>>): {
  readonly accepted: Readonly<Record<string, unknown>>;
  readonly rejected: readonly RejectedField[];
} {
  const accepted: Record<string, unknown> = {};
  const rejected: RejectedField[] = [];

  for (const [field, value] of Object.entries(changes)) {
    const owner = ownerOf(field);
    if (owner === 'agent') {
      accepted[field] = value;
      continue;
    }
    rejected.push({
      field,
      owner,
      reason:
        owner === 'strategy'
          ? `"${field}" belongs to the bound strategy. Edit the strategy, or rebind — which replaces all of it.`
          : `"${field}" is not a field this agent owns.`,
    });
  }

  return { accepted, rejected };
}
