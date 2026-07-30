import type { Agent } from '@/domain/agent/agent.js';
import { isRebindable } from '@/domain/agent/agent.js';
import type { Rebind } from '@/domain/agent/rebind.js';
import { describeRebind, isNoOp, planRebind } from '@/domain/agent/rebind.js';
import type { ConfirmationStore } from '@/domain/capability/confirmation.js';
import { CONFIRMATION_TTL_SECONDS } from '@/domain/capability/confirmation.js';
import type { AgentsPort } from '@/ports/agents.js';
import type { Clock } from '@/ports/clock.js';
import type { Randomness } from './connect.commands.js';
import { confirmationTarget } from '@/domain/capability/confirmation.js';

export interface DescribeRebindRequest {
  readonly userId: string;
  readonly accessToken: string;
  readonly agentId: string;
  readonly toStrategyId: string;
  readonly toStrategyName: string;
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
  | { readonly kind: 'no-op'; readonly reason: string };

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

    const rebind = planRebind(agent, { id: req.toStrategyId, name: req.toStrategyName });

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
      target: confirmationTarget.agentRebind(rebind.agentId, rebind.toStrategyId),
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
  readonly expectedRevision: number;
  readonly confirmationToken: string;
}

export type RebindAgentResult = { readonly kind: 'rebound'; readonly agent: Agent };

/**
 * Perform the rebind.
 *
 * The confirmation is not checked here — it is checked in the guard sequence,
 * against the tool and the target it was issued for. Verifying it twice, in two
 * places, would invite the two checks to drift; verifying it only here would
 * leave a route to BattleGrid that skips it.
 */
export class RebindAgentCommand {
  constructor(private readonly agents: AgentsPort) {}

  async execute(req: RebindAgentRequest): Promise<RebindAgentResult> {
    const agent = await this.agents.rebindAgent({
      userId: req.userId,
      accessToken: req.accessToken,
      agentId: req.agentId,
      strategyId: req.toStrategyId,
      expectedRevision: req.expectedRevision,
      // The pair the proposal bound: this agent, that destination.
      confirmation: {
        token: req.confirmationToken,
        target: confirmationTarget.agentRebind(req.agentId, req.toStrategyId),
      },
    });
    return { kind: 'rebound', agent };
  }
}
