import type { Agent } from '@/domain/agent/agent.js';
import { isArchivable, isReactivatable } from '@/domain/agent/agent.js';
import type { ConfirmationStore } from '@/domain/capability/confirmation.js';
import { CONFIRMATION_TTL_SECONDS } from '@/domain/capability/confirmation.js';
import type { AgentsPort } from '@/ports/agents.js';
import type { Clock } from '@/ports/clock.js';
import type { Randomness } from './connect.commands.js';

/**
 * Archiving and reactivating.
 *
 * Archiving is recoverable, and the copy says so. BattleGrid offers no
 * permanent deletion over MCP — `capabilities.canDelete` on the live payload
 * describes what BattleGrid's own app can do, not this client
 * (findings-agents F-1) — so this product must not imply it can delete, and
 * must not offer archiving as though it were the same thing.
 */

export interface DescribeArchiveRequest {
  readonly userId: string;
  readonly accessToken: string;
  readonly agentId: string;
}

export interface ArchiveProposal {
  readonly agentId: string;
  readonly agentName: string;
  readonly expectedRevision: number;
  readonly consequence: string;
  readonly confirmationToken: string;
}

export type DescribeArchiveResult =
  | { readonly kind: 'proposal'; readonly proposal: ArchiveProposal }
  | { readonly kind: 'not-archivable'; readonly reason: string };

export class DescribeArchiveQuery {
  constructor(
    private readonly agents: AgentsPort,
    private readonly confirmations: ConfirmationStore,
    private readonly random: Randomness,
    private readonly clock: Clock,
  ) {}

  async execute(req: DescribeArchiveRequest): Promise<DescribeArchiveResult> {
    const agent = await this.agents.getAgent(req);
    if (!isArchivable(agent)) {
      return {
        kind: 'not-archivable',
        reason:
          agent.status === 'ARCHIVED'
            ? `${agent.displayName} is already archived.`
            : `BattleGrid does not permit this client to archive ${agent.displayName}.`,
      };
    }

    const consequence =
      `${agent.displayName} will be archived. It stops trading and leaves your ` +
      `active roster, freeing an agent slot. Its configuration is kept and you ` +
      `can reactivate it later — this is not deletion, and Grid-Commander ` +
      `cannot delete an agent permanently.`;

    const confirmationToken = this.random.token(32);
    await this.confirmations.issue({
      token: confirmationToken,
      userId: req.userId,
      tool: 'archive_intelligence_agent',
      target: agent.id,
      consequence,
      expiresAt: new Date(this.clock.now().getTime() + CONFIRMATION_TTL_SECONDS * 1000),
      consumedAt: null,
    });

    return {
      kind: 'proposal',
      proposal: {
        agentId: agent.id,
        agentName: agent.displayName,
        expectedRevision: agent.revision,
        consequence,
        confirmationToken,
      },
    };
  }
}

export interface SetLifecycleRequest {
  readonly userId: string;
  readonly accessToken: string;
  readonly agentId: string;
  readonly to: 'ACTIVE' | 'ARCHIVED';
  readonly expectedRevision: number;
  readonly confirmationToken?: string | undefined;
}

export type SetLifecycleResult =
  | { readonly kind: 'changed'; readonly agent: Agent }
  | { readonly kind: 'not-permitted'; readonly reason: string };

export class SetLifecycleCommand {
  constructor(private readonly agents: AgentsPort) {}

  async execute(req: SetLifecycleRequest): Promise<SetLifecycleResult> {
    const agent = await this.agents.getAgent(req);

    const permitted = req.to === 'ARCHIVED' ? isArchivable(agent) : isReactivatable(agent);
    if (!permitted) {
      return {
        kind: 'not-permitted',
        reason:
          req.to === 'ARCHIVED'
            ? `${agent.displayName} cannot be archived.`
            : `${agent.displayName} is not archived.`,
      };
    }

    const changed = await this.agents.setLifecycle({
      userId: req.userId,
      accessToken: req.accessToken,
      agentId: req.agentId,
      // The revision the intent was formed against, not the one just read — a
      // fresher revision would silently paper over a change made in between.
      expectedRevision: req.expectedRevision,
      to: req.to,
      confirmationToken: req.confirmationToken,
    });
    return { kind: 'changed', agent: changed };
  }
}

/** What to tell a user looking for permanent deletion. */
export const DELETION_UNAVAILABLE =
  'Grid-Commander cannot delete an agent permanently — BattleGrid does not offer ' +
  'that over the connection this product uses. Archiving removes it from your ' +
  'active roster and frees a slot, and is reversible. Permanent deletion, if you ' +
  'need it, is done in BattleGrid itself.';
