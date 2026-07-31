import type { AgentDeployment } from '@/domain/agent/deployment.js';
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
 */
export interface ReadDeploymentsRequest {
  readonly userId: string;
  readonly accessToken: string;
  readonly agentId: string;
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
  }): Promise<DeploymentSummaryResult> {
    const read = await this.radar.listDeployments(req);
    if (read.kind === 'unreadable') {
      return { kind: 'unreadable', reason: read.reason, cause: read.cause };
    }
    return { kind: 'summary', byAgent: deploymentsByAgent(read.deployments) };
  }

  async execute(req: ReadDeploymentsRequest): Promise<AgentDeploymentResult> {
    const read = await this.radar.listDeployments(req);
    if (read.kind === 'unreadable') {
      return { kind: 'unreadable', reason: read.reason, cause: read.cause };
    }
    const mine = deploymentsFor(read.deployments, req.agentId);
    return mine.length > 0 ? { kind: 'deployed', deployments: mine } : { kind: 'not-deployed' };
  }
}
