import type { AgentDeployment, AgentLifecycle, RadarPause } from '@/domain/agent/deployment.js';
import { deploymentsByAgent, deploymentsFor } from '@/domain/agent/deployment.js';
import type { Clock } from '@/ports/clock.js';
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
  | {
      readonly kind: 'deployed';
      readonly deployments: readonly AgentDeployment[];
      /**
       * Whether anything is scanning at all, beside which agent would be.
       *
       * On the `deployed` arm and not on `not-deployed`: a paused radar is only
       * a correction to a claim this surface is making, and an agent the radar
       * names nowhere is making none.
       */
      readonly pause: RadarPause;
    }
  | { readonly kind: 'not-deployed' }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

export type DeploymentSummaryResult =
  | {
      readonly kind: 'summary';
      readonly byAgent: Readonly<Record<string, readonly AgentDeployment[]>>;
      /** The same fleet fact the per-agent read carries. One radar, one pause. */
      readonly pause: RadarPause;
    }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

export class ReadDeploymentsQuery {
  /**
   * The clock is injected and required, never defaulted to the system one.
   *
   * A deployment's cooldown is either still running or not, and that decision
   * belongs in the read: `tests/architecture/boundaries.test.ts` refuses a
   * component that measures its own time, because a sentence compared against
   * `Date.now()` is a different string on every run and can only be pinned by
   * freezing global time. Same reasoning as `read-exposure.query.ts`.
   */
  constructor(
    private readonly radar: RadarPort,
    private readonly clock: Clock,
  ) {}

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
    return {
      kind: 'summary',
      byAgent: deploymentsByAgent(read.deployments, req.roster, this.clock.now()),
      pause: read.pause,
    };
  }

  async execute(req: ReadDeploymentsRequest): Promise<AgentDeploymentResult> {
    const read = await this.radar.listDeployments(req);
    if (read.kind === 'unreadable') {
      return { kind: 'unreadable', reason: read.reason, cause: read.cause };
    }
    const mine = deploymentsFor(read.deployments, req.agent, req.roster, this.clock.now());
    /**
     * An agent that is not ACTIVE is still *deployed* — it holds the slot, and
     * the operator can still undeploy it. `not-deployed` stays the answer to
     * "the radar names this agent nowhere" and nothing else; folding the
     * archived case into it would replace one false sentence with another.
     */
    return mine.length > 0
      ? { kind: 'deployed', deployments: mine, pause: read.pause }
      : { kind: 'not-deployed' };
  }
}
