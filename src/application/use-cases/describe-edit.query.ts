import { isEditable } from '@/domain/agent/agent.js';
import { removesTheLimit } from '@/domain/agent/catalog.js';
import type { RejectedField } from '@/domain/agent/field-ownership.js';
import { partitionEdit } from '@/domain/agent/field-ownership.js';
import type { ConfirmationStore } from '@/domain/capability/confirmation.js';
import { confirmationTarget } from '@/domain/capability/confirmation.js';
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
 * Bound to the agent **and to the change**, so neither agreement about one agent
 * nor agreement about one amount can be carried onto another. Binding to the
 * agent alone was the whole of `confirmation-is-not-bound-to-values`.
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
      /**
       * The change that was described, not the agent alone.
       *
       * `agent.id` on its own made an agreement about $25 authorise a submission
       * carrying $25,000: same user, same tool, same agent. `accepted` is the
       * submitted intent after the fields BattleGrid rejects are dropped, so what
       * was agreed to and what may be spent are the same set.
       */
      target: confirmationTarget.agentEdit(agent.id, accepted),
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

  const config = changes['tradingConfig'];
  if (config !== undefined) {
    // Deliberately the heaviest sentence here. Everything else on this screen
    // is cosmetic; this one governs money.
    parts.push('Replaces every trading limit this agent runs under.');

    /**
     * And says what to, which the sentence above does not.
     *
     * Walking the finished edit form is what showed this up: the confirm screen
     * read "Replaces every trading limit this agent runs under" and nothing
     * else, so the person agreeing could not tell $25 from $25,000. A
     * confirmation exists so someone reads a consequence; one that names no
     * number describes an event rather than a decision.
     *
     * Money fields are named in full, and a value the platform reads as *no
     * cap* is called that rather than printed as `0` — the same finding as
     * `zero-does-not-mean-nothing`, carried to the last screen before the
     * write.
     */
    const money = describeMoney(config);
    if (money.length > 0) parts.push(`Sets ${sentenceList(money)}.`);
  }

  return parts.length === 0 ? null : parts.join(' ');
}

/** The money fields, in the operator's words, with unbounded named as unbounded. */
function describeMoney(config: unknown): string[] {
  if (typeof config !== 'object' || config === null) return [];
  const fields = config as Record<string, unknown>;
  const out: string[] = [];

  for (const [field, label] of Object.entries(MONEY_LABELS)) {
    const raw = fields[field];
    if (raw === undefined || raw === '') continue;
    const value = Number(raw);
    if (!Number.isFinite(value)) continue;
    out.push(
      removesTheLimit(field, value)
        ? `${label} to no limit at all`
        : `${label} to $${value}`,
    );
  }

  const mode = fields['tradingMode'];
  if (typeof mode === 'string' && mode.length > 0) {
    out.push(`trading to ${MODES[mode] ?? mode}`);
  }
  return out;
}

const MONEY_LABELS: Readonly<Record<string, string>> = {
  maxDailyLossUsd: 'the most it may lose in a day',
  maxCumulativeDrawdownUsd: 'the most it may lose in total',
  maxConcurrentExposureUsd: 'the most it may have at risk at once',
  balanceThresholdUsd: 'its balance floor',
  minAllocationUsd: 'its smallest trade',
};

const MODES: Readonly<Record<string, string>> = {
  OFF: 'off',
  APPROVAL_REQUIRED: 'approval required',
  FULL_EXECUTION: 'full execution',
};

/** `a, b and c` — read aloud, which is how a consequence should scan. */
function sentenceList(items: readonly string[]): string {
  if (items.length === 1) return items[0] as string;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}
