/**
 * Where an agent is deployed to act, as the radar states it.
 *
 * Established live 2026-07-31: an agent acts only where a radar deployment
 * points it at a coin — per coin, one slot on duty at a time. Lifecycle
 * status says ACTIVE for a configured agent that is scanning nothing, and the
 * platform's own radar summary counts only deployed agents as active. These
 * types carry the distinction the status hides.
 */

export interface RadarDeployment {
  readonly policyId: string;
  readonly coinTicker: string;
  readonly timeframe: string;
  readonly enabled: boolean;
  /** Every agent slotted into this deployment's rotation. */
  readonly slotAgentIds: readonly string[];
  /** The agent the radar resolves as on duty right now, if it said. */
  readonly onDutyAgentId: string | null;
  /** The agent holding an open position here, if any. */
  readonly openPositionAgentId: string | null;
}

/**
 * One agent's standing in one deployment. Ordered by how much is at stake:
 * holding a position outranks being on duty, which outranks waiting in the
 * rotation — the same order a user would ask about them.
 */
export type DeploymentStanding = 'holding-position' | 'on-duty' | 'in-rotation';

export interface AgentDeployment {
  readonly coinTicker: string;
  readonly timeframe: string;
  readonly standing: DeploymentStanding;
}

/**
 * The deployments that name this agent, with its standing in each.
 *
 * Slot membership is what "deployed" means; on-duty and position-holder are
 * refinements the radar volunteers. An agent can hold the position while
 * another is on duty, so the standing is computed per deployment, not
 * globally.
 */
export function deploymentsFor(
  deployments: readonly RadarDeployment[],
  agentId: string,
): readonly AgentDeployment[] {
  return deployments
    .filter(
      (d) =>
        d.slotAgentIds.includes(agentId) ||
        d.onDutyAgentId === agentId ||
        d.openPositionAgentId === agentId,
    )
    .map((d) => ({
      coinTicker: d.coinTicker,
      timeframe: d.timeframe,
      standing:
        d.openPositionAgentId === agentId
          ? 'holding-position'
          : d.onDutyAgentId === agentId
            ? 'on-duty'
            : 'in-rotation',
    }));
}

/**
 * Every agent's deployments at once — the roster's question. Built from the
 * same membership-and-standing rules as `deploymentsFor`, so the roster and
 * the detail page cannot disagree about whether an agent is acting.
 */
export function deploymentsByAgent(
  deployments: readonly RadarDeployment[],
): Readonly<Record<string, readonly AgentDeployment[]>> {
  const involved = new Set<string>();
  for (const d of deployments) {
    for (const id of d.slotAgentIds) involved.add(id);
    if (d.onDutyAgentId) involved.add(d.onDutyAgentId);
    if (d.openPositionAgentId) involved.add(d.openPositionAgentId);
  }
  const byAgent: Record<string, readonly AgentDeployment[]> = {};
  for (const id of involved) byAgent[id] = deploymentsFor(deployments, id);
  return byAgent;
}
