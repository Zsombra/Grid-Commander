import { isEditable } from '@/domain/agent/agent.js';
import type { RejectedField } from '@/domain/agent/field-ownership.js';
import { partitionEdit } from '@/domain/agent/field-ownership.js';
import type { ConfirmationStore } from '@/domain/capability/confirmation.js';
import { CONFIRMATION_TTL_SECONDS } from '@/domain/capability/confirmation.js';
import type { AgentsPort } from '@/ports/agents.js';
import type { Clock } from '@/ports/clock.js';
import type { Randomness } from './connect.commands.js';

export interface DescribeEditRequest {
  readonly userId: string;
  readonly accessToken: string;
  readonly agentId: string;
  readonly changes: Readonly<Record<string, unknown>>;
}

export interface EditProposal {
  readonly consequence: string;
  readonly confirmationToken: string;
}

export type DescribeEditResult =
  | { readonly kind: 'proposal'; readonly proposal: EditProposal }
  | { readonly kind: 'not-editable'; readonly reason: string }
  | { readonly kind: 'no-op'; readonly reason: string }
  | { readonly kind: 'rejected'; readonly rejected: readonly RejectedField[] };

/**
 * What an edit would do, and the token that lets it happen.
 *
 * BattleGrid annotates `update_intelligence_agent` with `destructiveHint: true`,
 * so the guard requires a confirmation bound to the agent. Nothing could supply
 * one: `AgentsPort.updateAgent` had no such parameter, so **every rename this
 * product attempted was refused by the product itself**, before any request was
 * built.
 *
 * The token is minted **here**, alongside the rendered consequence, and never
 * inside `UpdateAgentCommand`. That distinction is the whole point. A token the
 * command issues on its own behalf records that the product intended to
 * proceed, which was never in question; the guard exists so a *person* saw what
 * would happen and agreed to it. Mirrors `DescribeRebindQuery` — see DL-5.
 *
 * Bound to the agent, not to the verb, so agreement about one agent cannot be
 * carried onto another.
 */
export class DescribeEditQuery {
  constructor(
    private readonly agents: AgentsPort,
    private readonly confirmations: ConfirmationStore,
    private readonly random: Randomness,
    private readonly clock: Clock,
  ) {}

  async execute(req: DescribeEditRequest): Promise<DescribeEditResult> {
    const agent = await this.agents.getAgent(req);

    if (!isEditable(agent)) {
      return {
        kind: 'not-editable',
        reason:
          agent.status === 'ARCHIVED'
            ? `${agent.displayName} is archived. Reactivate it before editing.`
            : `BattleGrid does not permit this client to edit ${agent.displayName}.`,
      };
    }

    // Refused here as well as in the command. The proposal names a consequence,
    // and naming one for a field the platform will not accept would describe
    // something that cannot happen.
    const { accepted, rejected } = partitionEdit(req.changes);
    if (rejected.length > 0) return { kind: 'rejected', rejected };

    const consequence = describeEdit(agent.displayName, accepted);
    if (consequence === null) {
      return { kind: 'no-op', reason: `Nothing about ${agent.displayName} would change.` };
    }

    const confirmationToken = this.random.token(32);
    await this.confirmations.issue({
      token: confirmationToken,
      userId: req.userId,
      tool: 'update_intelligence_agent',
      target: agent.id,
      // Stored as shown, so the audit proves what was agreed to rather than what
      // a later version of the copy happens to say.
      consequence,
      expiresAt: new Date(this.clock.now().getTime() + CONFIRMATION_TTL_SECONDS * 1000),
      consumedAt: null,
    });

    return { kind: 'proposal', proposal: { consequence, confirmationToken } };
  }
}

/**
 * What the operator is about to change, in their words rather than the schema's.
 *
 * `null` when nothing would change — a rename to the name it already has is not
 * worth a confirmation, and issuing one would train people to click past them.
 */
export function describeEdit(
  currentName: string,
  changes: Readonly<Record<string, unknown>>,
): string | null {
  const parts: string[] = [];

  const displayName = changes['displayName'];
  if (typeof displayName === 'string' && displayName !== currentName) {
    parts.push(`Renames "${currentName}" to "${displayName}".`);
  }

  const overlay = changes['overlayText'];
  if (typeof overlay === 'string') {
    parts.push('Replaces the overlay text.');
  }

  if (changes['tradingConfig'] !== undefined) {
    // Deliberately the heaviest sentence here. Everything else on this screen
    // is cosmetic; this one governs money.
    parts.push('Replaces every trading limit this agent runs under.');
  }

  return parts.length === 0 ? null : parts.join(' ');
}
