import type { Agent } from './agent.js';

/**
 * Rebinding an agent to a different strategy.
 *
 * The most destructive thing this product can do. It replaces the agent's
 * context modules, signal rules, prose and timeframe with the new strategy's —
 * wholesale, not merged. A user who reads "change strategy" and expects their
 * tuning to survive is about to lose it.
 */
export interface Rebind {
  readonly agentId: string;
  readonly agentName: string;
  readonly fromStrategyName: string;
  readonly toStrategyId: string;
  readonly toStrategyName: string;
  /** The destination as it was when described. Bound into the confirmation. */
  readonly toStrategyRevision: number;
  readonly expectedRevision: number;
}

export function planRebind(
  agent: Agent,
  target: { id: string; name: string; revision: number },
): Rebind {
  return {
    agentId: agent.id,
    agentName: agent.displayName,
    fromStrategyName: agent.binding.strategyName,
    toStrategyId: target.id,
    toStrategyName: target.name,
    toStrategyRevision: target.revision,
    expectedRevision: agent.revision,
  };
}

/*
 * `rebindTarget` used to live here and is now `confirmationTarget.agentRebind`.
 *
 * It produced the same string, which made it a second construction of a
 * confirmation target — the exact duplication that let a fifth flow be written
 * without its values. Reasoning kept, in one place: the target is bound to the
 * *pair*, this agent and that destination, not to the verb. A token meaning only
 * "a rebind was confirmed" could carry agreement about one agent onto another.
 * See DL-5.
 */

/**
 * What the user must read before confirming.
 *
 * The wording is the product surface here, not decoration. It says *replaced*
 * rather than *changed*, names what is being replaced, and names both ends of
 * the move — because "are you sure?" is not consent to anything in particular.
 */
export function describeRebind(rebind: Rebind): string {
  return (
    `${rebind.agentName} will be rebound from "${rebind.fromStrategyName}" to ` +
    `"${rebind.toStrategyName}" at revision ${rebind.toStrategyRevision}. ` +
    `Everything ${rebind.agentName} inherited from ` +
    `"${rebind.fromStrategyName}" — its context sources, signal rules, prose and ` +
    `timeframe — will be replaced by "${rebind.toStrategyName}"'s, not merged with ` +
    `them. Its name, brain and money limits are not affected.`
  );
}

/** Rebinding to the strategy an agent is already bound to changes nothing. */
export function isNoOp(rebind: Rebind, agent: Agent): boolean {
  return rebind.toStrategyId === agent.binding.strategyId;
}
