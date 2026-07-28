/**
 * A strategy, as the authoring rules need it.
 *
 * The field that matters most is `boundAgentCount`. A strategy is never an
 * isolated object in this product: changing one reconfigures every agent bound
 * to it, immediately, and the live account has one with five agents on it.
 * Carrying the count on the entity means no surface can present a strategy
 * without being able to say what it governs.
 */
export interface Strategy {
  readonly id: string;
  readonly name: string;
  readonly tagline: string | null;
  readonly description: string | null;
  readonly revision: number;
  readonly scope: StrategyScope;
  readonly timeframe: string;
  readonly isActive: boolean;
  /** The blast radius. Read from the platform, never counted here. See S-F. */
  readonly boundAgentCount: number;
  readonly forkedFromStrategyId: string | null;
}

export type StrategyScope = 'SYSTEM' | 'PRIVATE';

/**
 * How many more strategies this user may own.
 *
 * `list_strategies` returns it alongside the roster, the same way
 * `list_intelligence_agents` returns `slotUsage` (findings-strategies F-7).
 */
export interface StrategyQuota {
  readonly used: number;
  readonly limit: number;
  readonly remaining: number;
}

/**
 * A platform strategy cannot be edited — it is forked.
 *
 * Presenting a SYSTEM strategy as editable would offer an action the platform
 * refuses, which is the same mistake as the delete affordance in
 * `author-agents` (AL-2).
 */
export function isEditable(strategy: Strategy): boolean {
  return strategy.scope === 'PRIVATE' && strategy.isActive;
}

export function mustForkToEdit(strategy: Strategy): boolean {
  return strategy.scope === 'SYSTEM';
}

export function isArchivable(strategy: Strategy): boolean {
  return strategy.scope === 'PRIVATE' && strategy.isActive;
}

export function isRestorable(strategy: Strategy): boolean {
  return strategy.scope === 'PRIVATE' && !strategy.isActive;
}

export function hasCapacity(quota: StrategyQuota): boolean {
  return quota.remaining > 0;
}

/**
 * What editing this strategy would reach.
 *
 * Stated for zero as plainly as for five: "no agents are bound to this" is
 * information a user acts on, and leaving it out makes the warning's absence
 * ambiguous rather than reassuring.
 */
export function describeBlastRadius(count: number): string {
  if (count === 0) return 'No agents are bound to this strategy.';
  if (count === 1) return 'One agent is bound to this strategy and will be reconfigured immediately.';
  return `${count} agents are bound to this strategy and will all be reconfigured immediately.`;
}
