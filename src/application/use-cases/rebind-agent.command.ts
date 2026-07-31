import type { Agent } from '@/domain/agent/agent.js';
import { isRebindable } from '@/domain/agent/agent.js';
import type { Rebind } from '@/domain/agent/rebind.js';
import { describeRebind, isNoOp, planRebind } from '@/domain/agent/rebind.js';
import type { ConfirmationStore } from '@/domain/capability/confirmation.js';
import { CONFIRMATION_TTL_SECONDS } from '@/domain/capability/confirmation.js';
import type { AgentsPort } from '@/ports/agents.js';
import type { StrategiesPort } from '@/ports/strategies.js';
import type { Clock } from '@/ports/clock.js';
import type { Randomness } from './connect.commands.js';
import { confirmationTarget } from '@/domain/capability/confirmation.js';

export interface DescribeRebindRequest {
  readonly userId: string;
  readonly accessToken: string;
  readonly agentId: string;
  /**
   * The id alone. The destination's name and revision are read from the
   * platform — a consequence printing a name the caller supplied would let
   * the query string decide what the user believes they are binding to.
   */
  readonly toStrategyId: string;
}

export interface RebindProposal {
  readonly rebind: Rebind;
  /** What the user must read. The confirmation is issued against this text. */
  readonly consequence: string;
  readonly confirmationToken: string;
}

export type DescribeRebindResult =
  | { readonly kind: 'proposal'; readonly proposal: RebindProposal }
  | { readonly kind: 'not-rebindable'; readonly reason: string }
  | { readonly kind: 'no-op'; readonly reason: string }
  /** The destination could not be read or does not exist. No token minted. */
  | { readonly kind: 'destination-unavailable'; readonly reason: string };

/**
 * Compose a rebind and issue the confirmation for it.
 *
 * Separated from performing it, because the confirmation must be issued
 * *alongside the rendered consequence* — a token minted anywhere else is not
 * evidence that a human read anything. It is bound to the (agent, target
 * strategy) pair rather than to the word "rebind", so agreement about one agent
 * cannot be carried onto another. See DL-5 and AL-6.
 */
export class DescribeRebindQuery {
  constructor(
    private readonly agents: AgentsPort,
    private readonly strategies: StrategiesPort,
    private readonly confirmations: ConfirmationStore,
    private readonly random: Randomness,
    private readonly clock: Clock,
  ) {}

  async execute(req: DescribeRebindRequest): Promise<DescribeRebindResult> {
    const agent = await this.agents.getAgent(req);

    if (!isRebindable(agent)) {
      return {
        kind: 'not-rebindable',
        reason:
          agent.status === 'ARCHIVED'
            ? `${agent.displayName} is archived. Reactivate it before rebinding.`
            : `BattleGrid does not permit this client to rebind ${agent.displayName}.`,
      };
    }

    /**
     * The destination, as the platform holds it now. Its name goes into the
     * consequence and its revision into the token's target — so what the
     * user reads, what they agree to, and what may be performed are one
     * strategy at one revision, not an id plus a caller's claim about it.
     */
    const destination = await this.strategies.readStrategy({
      userId: req.userId,
      accessToken: req.accessToken,
      strategyId: req.toStrategyId,
    });
    if (destination.kind !== 'strategy') {
      return {
        kind: 'destination-unavailable',
        reason:
          destination.kind === 'missing'
            ? 'BattleGrid has no strategy with that id that this account can see.'
            : `The destination strategy could not be read: ${destination.reason}`,
      };
    }
    const summary = destination.detail.summary;

    const rebind = planRebind(agent, {
      id: summary.id,
      name: summary.name,
      revision: summary.revision,
    });

    if (isNoOp(rebind, agent)) {
      return {
        kind: 'no-op',
        reason: `${agent.displayName} is already bound to "${agent.binding.strategyName}".`,
      };
    }

    const consequence = describeRebind(rebind);
    const confirmationToken = this.random.token(32);
    await this.confirmations.issue({
      token: confirmationToken,
      userId: req.userId,
      tool: 'rebind_intelligence_agent',
      target: confirmationTarget.agentRebind(
        rebind.agentId,
        rebind.toStrategyId,
        rebind.toStrategyRevision,
      ),
      // Stored as shown, so the audit can prove what was agreed to rather than
      // what a later version of the copy happens to say.
      consequence,
      expiresAt: new Date(this.clock.now().getTime() + CONFIRMATION_TTL_SECONDS * 1000),
      consumedAt: null,
    });

    return { kind: 'proposal', proposal: { rebind, consequence, confirmationToken } };
  }
}

export interface RebindAgentRequest {
  readonly userId: string;
  readonly accessToken: string;
  readonly agentId: string;
  readonly toStrategyId: string;
  /** The destination revision the consequence described. */
  readonly toStrategyRevision: number;
  readonly expectedRevision: number;
  readonly confirmationToken: string;
}

export type RebindAgentResult =
  | { readonly kind: 'rebound'; readonly agent: Agent }
  /** The destination changed (or vanished) after it was described. Nothing was attempted. */
  | { readonly kind: 'destination-moved'; readonly reason: string };

/**
 * Perform the rebind.
 *
 * The confirmation is not checked here — it is checked in the guard sequence,
 * against the tool and the target it was issued for. Verifying it twice, in two
 * places, would invite the two checks to drift; verifying it only here would
 * leave a route to BattleGrid that skips it.
 *
 * The destination *is* re-read here, because that check the guard cannot do:
 * the token proves what was agreed to, and only a fresh read can prove the
 * destination still is what was agreed to. BattleGrid's own revision check
 * covers the agent; nothing platform-side covers the destination.
 */
export class RebindAgentCommand {
  constructor(
    private readonly agents: AgentsPort,
    private readonly strategies: StrategiesPort,
  ) {}

  async execute(req: RebindAgentRequest): Promise<RebindAgentResult> {
    const destination = await this.strategies.readStrategy({
      userId: req.userId,
      accessToken: req.accessToken,
      strategyId: req.toStrategyId,
    });
    if (destination.kind !== 'strategy') {
      return {
        kind: 'destination-moved',
        reason:
          'The destination strategy could not be re-read, so whether it still is ' +
          'what was described cannot be known. Nothing was changed.',
      };
    }
    if (destination.detail.summary.revision !== req.toStrategyRevision) {
      return {
        kind: 'destination-moved',
        reason:
          `"${destination.detail.summary.name}" changed while you were reading ` +
          `(now revision ${destination.detail.summary.revision}, described at ` +
          `revision ${req.toStrategyRevision}). Nothing was changed — review the ` +
          'fresh description before agreeing.',
      };
    }

    const agent = await this.agents.rebindAgent({
      userId: req.userId,
      accessToken: req.accessToken,
      agentId: req.agentId,
      strategyId: req.toStrategyId,
      expectedRevision: req.expectedRevision,
      // The trio the proposal bound: this agent, that destination, at the
      // revision that was described.
      confirmation: {
        token: req.confirmationToken,
        target: confirmationTarget.agentRebind(
          req.agentId,
          req.toStrategyId,
          req.toStrategyRevision,
        ),
      },
    });
    return { kind: 'rebound', agent };
  }
}
