import { deploymentsNaming } from '@/domain/agent/deployment.js';
import type { ConfirmationStore } from '@/domain/capability/confirmation.js';
import { confirmationTarget, CONFIRMATION_TTL_SECONDS } from '@/domain/capability/confirmation.js';
import type { Clock } from '@/ports/clock.js';
import type { RadarPort } from '@/ports/radar.js';
import type { Randomness } from './connect.commands.js';

/**
 * Deploying and undeploying: the acts that start and stop an agent scanning
 * a market.
 *
 * Both are person-confirmed although `upsert_radar_deployment` is only
 * annotated `write` — deploying grants autonomous authority over a market,
 * and in this product the consequence binds, not the classification. Each
 * describe reads the radar fresh: the revision it carries is the one the
 * platform holds *now*, and an occupied coin's consequence names who is
 * being replaced before anyone agrees to it.
 */

interface Who {
  readonly userId: string;
  readonly accessToken: string;
}

export type DescribeDeployResult =
  | {
      readonly kind: 'proposal';
      readonly proposal: {
        readonly agentId: string;
        readonly coinId: string;
        readonly timeframe: string;
        readonly expectedRevision: number;
        readonly consequence: string;
        readonly confirmationToken: string;
        readonly timeframes: readonly string[];
      };
    }
  | { readonly kind: 'refused'; readonly reason: string };

export class DescribeDeployQuery {
  constructor(
    private readonly radar: RadarPort,
    private readonly confirmations: ConfirmationStore,
    private readonly random: Randomness,
    private readonly clock: Clock,
  ) {}

  /**
   * The runtime-permitted timeframes, for the form that has not chosen yet.
   * The same list `execute` validates against; empty means the declaration
   * could not answer, and the form says so instead of offering choices nobody
   * validated.
   */
  async timeframes(req: Who): Promise<readonly string[]> {
    return this.radar.deploymentTimeframes(req);
  }

  async execute(
    req: Who & { agentId: string; agentName: string; coinId: string; timeframe: string },
  ): Promise<DescribeDeployResult> {
    const timeframes = await this.radar.deploymentTimeframes(req);
    if (timeframes.length === 0) {
      // The declaration could not answer; composing from a remembered list
      // would send a value nobody could have validated.
      return { kind: 'refused', reason: 'BattleGrid did not declare the permitted timeframes.' };
    }
    if (!timeframes.includes(req.timeframe)) {
      return {
        kind: 'refused',
        reason: `"${req.timeframe}" is not a timeframe BattleGrid permits (${timeframes.join(', ')}).`,
      };
    }

    const read = await this.radar.listDeployments(req);
    if (read.kind === 'unreadable') {
      // Deploying against a radar that could not be read would replace state
      // nobody saw. Refuse rather than compose blind.
      return { kind: 'refused', reason: `The radar could not be read: ${read.reason}` };
    }

    const existing = read.deployments.find((d) => d.coinTicker === req.coinId);
    if (!existing) {
      /**
       * Established live 2026-07-31 (decision log, DL-3) and reconfirmed
       * 2026-08-11: this surface can replace a deployment; it cannot create
       * the first one. The refusal's *shape* has drifted once — DL-3 met
       * `CONFLICT … actualRevision: null`, the 2026-08-11 probe met
       * `VALIDATION_ERROR` — but the restriction held both times, and
       * `radar-probe.test.ts` now accepts either spelling while failing
       * loudly if a create is ever ACCEPTED, which is the moment this
       * refusal should be removed. Refusing here, with the reason, beats
       * minting an agreement the perform is guaranteed to lose.
       */
      return {
        kind: 'refused',
        reason:
          `${req.coinId} carries no deployment, and BattleGrid's API refuses to create a ` +
          `first one through this surface. Deploying here can only replace a market's ` +
          `existing deployment; the first deployment on a coin is made on battlegrid.trade.`,
      };
    }

    const replaced =
      existing.slotAgentIds.length > 0
        ? ` This replaces the current deployment there (agent ${existing.slotAgentIds.join(', ')}).`
        : ' This replaces the current (empty) deployment there.';
    const consequence =
      `Deploys "${req.agentName}" to scan ${req.coinId} on the ${req.timeframe} radar.` + replaced;

    /**
     * The revision the platform holds now — always an existing policy's own,
     * never invented (see the refusal above). A conflict between here and the
     * apply is the platform's revision check working, and it surfaces as a
     * refusal, never a blind overwrite.
     */
    const expectedRevision = existing.revision;

    const token = this.random.token(32);
    await this.confirmations.issue({
      token,
      userId: req.userId,
      tool: 'upsert_radar_deployment',
      target: confirmationTarget.agentDeploy(req.agentId, req.coinId),
      consequence,
      expiresAt: new Date(this.clock.now().getTime() + CONFIRMATION_TTL_SECONDS * 1000),
      consumedAt: null,
    });
    return {
      kind: 'proposal',
      proposal: {
        agentId: req.agentId,
        coinId: req.coinId,
        timeframe: req.timeframe,
        expectedRevision,
        consequence,
        confirmationToken: token,
        timeframes,
      },
    };
  }
}

export type PerformDeployResult =
  | { readonly kind: 'deployed'; readonly revision: number }
  | { readonly kind: 'refused'; readonly reason: string };

export class PerformDeployCommand {
  constructor(private readonly radar: RadarPort) {}

  async execute(
    req: Who & {
      agentId: string;
      coinId: string;
      timeframe: string;
      expectedRevision: number;
      confirmationToken: string;
    },
  ): Promise<PerformDeployResult> {
    try {
      const result = await this.radar.upsertDeployment({
        userId: req.userId,
        accessToken: req.accessToken,
        coinId: req.coinId,
        timeframe: req.timeframe,
        enabled: true,
        agentId: req.agentId,
        expectedRevision: req.expectedRevision,
        confirmation: {
          token: req.confirmationToken,
          // Recomputed from the submitted values: a token minted for one coin
          // cannot spend against another.
          target: confirmationTarget.agentDeploy(req.agentId, req.coinId),
        },
      });
      return { kind: 'deployed', revision: result.revision };
    } catch (err) {
      return { kind: 'refused', reason: err instanceof Error ? err.message : String(err) };
    }
  }
}

export type DescribeUndeployResult = DescribeDeployResult;

export class DescribeUndeployQuery {
  constructor(
    private readonly radar: RadarPort,
    private readonly confirmations: ConfirmationStore,
    private readonly random: Randomness,
    private readonly clock: Clock,
  ) {}

  async execute(
    req: Who & { agentId: string; agentName: string; coinId: string },
  ): Promise<DescribeUndeployResult> {
    const read = await this.radar.listDeployments(req);
    if (read.kind === 'unreadable') {
      return { kind: 'refused', reason: `The radar could not be read: ${read.reason}` };
    }
    const existing = read.deployments.find((d) => d.coinTicker === req.coinId);
    if (!existing) {
      return { kind: 'refused', reason: `${req.coinId} carries no deployment to remove.` };
    }
    // Membership, not standing: an archived agent still holds its slot and
    // undeploying it is still an act with something to remove.
    const mine = deploymentsNaming([existing], req.agentId);
    if (mine.length === 0) {
      return {
        kind: 'refused',
        reason: `"${req.agentName}" is not deployed on ${req.coinId}.`,
      };
    }

    const consequence =
      `Removes "${req.agentName}" from ${req.coinId}: it stops scanning that market. ` +
      `The agent stays configured and can be redeployed.`;
    const expectedRevision = existing.revision;

    const token = this.random.token(32);
    await this.confirmations.issue({
      token,
      userId: req.userId,
      tool: 'delete_radar_deployment',
      target: confirmationTarget.agentUndeploy(req.agentId, req.coinId),
      consequence,
      expiresAt: new Date(this.clock.now().getTime() + CONFIRMATION_TTL_SECONDS * 1000),
      consumedAt: null,
    });
    return {
      kind: 'proposal',
      proposal: {
        agentId: req.agentId,
        coinId: req.coinId,
        timeframe: existing.timeframe,
        expectedRevision,
        consequence,
        confirmationToken: token,
        timeframes: [],
      },
    };
  }
}

export type PerformUndeployResult =
  | { readonly kind: 'undeployed' }
  | { readonly kind: 'refused'; readonly reason: string };

export class PerformUndeployCommand {
  constructor(private readonly radar: RadarPort) {}

  async execute(
    req: Who & {
      agentId: string;
      coinId: string;
      expectedRevision: number;
      confirmationToken: string;
    },
  ): Promise<PerformUndeployResult> {
    try {
      const result = await this.radar.deleteDeployment({
        userId: req.userId,
        accessToken: req.accessToken,
        coinId: req.coinId,
        expectedRevision: req.expectedRevision,
        confirmation: {
          token: req.confirmationToken,
          target: confirmationTarget.agentUndeploy(req.agentId, req.coinId),
        },
      });
      return result.deleted
        ? { kind: 'undeployed' }
        : { kind: 'refused', reason: 'BattleGrid reported the deployment was not deleted.' };
    } catch (err) {
      return { kind: 'refused', reason: err instanceof Error ? err.message : String(err) };
    }
  }
}
