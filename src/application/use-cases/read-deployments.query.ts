import type { AgentDeployment, AgentLifecycle } from '@/domain/agent/deployment.js';
import { deploymentsByAgent, deploymentsFor } from '@/domain/agent/deployment.js';
import type { FailureCause } from '@/ports/failure.js';
import type { RadarPort } from '@/ports/radar.js';

/**
 * Whether one agent is acting, and where.
 *
 * Three answers, and the page must render all three distinctly: `deployed`
 * (with each market, timeframe and standing), `not-deployed` (the radar
 * answered and this agent is in no slot — configured, scanning nothing), and
 * `unreadable` (no claim either way is honest). Collapsing the third into the
 * second would tell a deployed agent's owner it is idle every time the radar
 * hiccups.
 *
 * **The lifecycle travels with the request.** The radar cannot say whether an
 * agent is archived, so a caller that asks only "where is this agent slotted"
 * gets an answer that reads as "where is it scanning" and is wrong for every
 * agent that is not ACTIVE (live 2026-08-06: `SP500@15m` holding only
 * `Volatilis[ARCHIVED]`). Requiring the lifecycle in the request rather than
 * reading the roster here keeps this a single-read query — the two callers
 * that render standing have already read the roster on the same page — and
 * makes it a compile error to ask the question without knowing the half of the
 * answer the radar does not carry.
 */
export interface ReadDeploymentsRequest {
  readonly userId: string;
  readonly accessToken: string;
  /** The agent asked about, with the lifecycle its standing depends on. */
  readonly agent: AgentLifecycle;
  /**
   * Every agent lifecycle the caller could read, used only to answer whether
   * any *other* agent in the same slots is still active. An empty list is
   * honest and costs only the market-level reading: it makes every occupancy
   * `unknown`, so no surface claims a market is unscanned.
   */
  readonly roster: readonly AgentLifecycle[];
}

export type AgentDeploymentResult =
  | { readonly kind: 'deployed'; readonly deployments: readonly AgentDeployment[] }
  | { readonly kind: 'not-deployed' }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

export type DeploymentSummaryResult =
  | {
      readonly kind: 'summary';
      readonly byAgent: Readonly<Record<string, readonly AgentDeployment[]>>;
    }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

export class ReadDeploymentsQuery {
  constructor(private readonly radar: RadarPort) {}

  /** The roster's question: everyone's deployments in one read. */
  async summary(req: {
    readonly userId: string;
    readonly accessToken: string;
    /** The agents the roster is about to render, each with its lifecycle. */
    readonly roster: readonly AgentLifecycle[];
  }): Promise<DeploymentSummaryResult> {
    const read = await this.radar.listDeployments(req);
    if (read.kind === 'unreadable') {
      return { kind: 'unreadable', reason: read.reason, cause: read.cause };
    }
    return { kind: 'summary', byAgent: deploymentsByAgent(read.deployments, req.roster) };
  }

  async execute(req: ReadDeploymentsRequest): Promise<AgentDeploymentResult> {
    const read = await this.radar.listDeployments(req);
    if (read.kind === 'unreadable') {
      return { kind: 'unreadable', reason: read.reason, cause: read.cause };
    }
    const mine = deploymentsFor(read.deployments, req.agent, req.roster);
    /**
     * An agent that is not ACTIVE is still *deployed* — it holds the slot, and
     * the operator can still undeploy it. `not-deployed` stays the answer to
     * "the radar names this agent nowhere" and nothing else; folding the
     * archived case into it would replace one false sentence with another.
     */
    return mine.length > 0 ? { kind: 'deployed', deployments: mine } : { kind: 'not-deployed' };
  }
}
