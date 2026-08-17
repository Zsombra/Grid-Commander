import { deploymentsNaming } from '@/domain/agent/deployment.js';
import type { ConfirmationStore } from '@/domain/capability/confirmation.js';
import { confirmationTarget, CONFIRMATION_TTL_SECONDS } from '@/domain/capability/confirmation.js';
import type { Clock } from '@/ports/clock.js';
import type { RadarPort } from '@/ports/radar.js';
import type { Randomness } from './connect.commands.js';
import { outcomeOf } from './failure-outcome.js';

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
        readonly expectedRevision: number | null;
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

    let consequence: string;
    let expectedRevision: number | null;

    if (existing) {
      const replaced =
        existing.slotAgentIds.length > 0
          ? ` This replaces the current deployment there (agent ${existing.slotAgentIds.join(', ')}).`
          : ' This replaces the current (empty) deployment there.';
      consequence =
        `Deploys "${req.agentName}" to scan ${req.coinId} on the ${req.timeframe} radar.` + replaced;
      expectedRevision = existing.revision;
    } else {
      consequence =
        `Deploys "${req.agentName}" to start scanning ${req.coinId} on the ${req.timeframe} radar.`;
      expectedRevision = null;
    }

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
  | { readonly kind: 'refused'; readonly reason: string }
  /**
   * The account's authority is gone, not this operation refused. Carries the
   * sentence the failure built — which names the remedy belonging to *this*
   * deployment, so it must be shown rather than replaced by a redirect.
   */
  | { readonly kind: 'authority-lost'; readonly reason: string };

export class PerformDeployCommand {
  constructor(private readonly radar: RadarPort) {}

  async execute(
    req: Who & {
      agentId: string;
      coinId: string;
      timeframe: string;
      expectedRevision: number | null;
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
      return outcomeOf(err);
    }
  }
}

export type DescribeUndeployResult =
  | {
      readonly kind: 'proposal';
      readonly proposal: {
        readonly agentId: string;
        readonly coinId: string;
        readonly timeframe: string;
        // Never null, unlike a deploy's: undeploying targets a deployment
        // that already exists, so there is always a real revision to bind.
        readonly expectedRevision: number;
        readonly consequence: string;
        readonly confirmationToken: string;
        readonly timeframes: readonly string[];
      };
    }
  | { readonly kind: 'refused'; readonly reason: string };

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
  | { readonly kind: 'refused'; readonly reason: string }
  /**
   * The account's authority is gone, not this operation refused. Carries the
   * sentence the failure built — which names the remedy belonging to *this*
   * deployment, so it must be shown rather than replaced by a redirect.
   */
  | { readonly kind: 'authority-lost'; readonly reason: string };

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
      return outcomeOf(err);
    }
  }
}
