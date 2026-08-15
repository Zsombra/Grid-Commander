import { isAnswerable } from '@/domain/agent/pending-decision.js';
import type { AgentsPort, EntryDecision, StageResult } from '@/ports/agents.js';
import type { Clock } from '@/ports/clock.js';

/**
 * The decisions an agent has proposed and is waiting on a human for.
 *
 * The queue is read with `list_entry_decisions` filtered to the answerable
 * status, **not** with the queue-specific tool. Both were called in the same
 * second against the same live decision on 2026-08-15 and returned a
 * byte-identical row — 35 keys, same values. The queue tool's declared
 * "enriched with execution and outcome context" does not exist. Given identical
 * payloads, the one that paginates and filters wins (DL-5).
 */

/**
 * One decision as an operator reads it, with the two things the raw row does
 * not carry: how long is left, and whether it is still answerable now.
 *
 * There is deliberately **no currency amount** here. The platform computes no
 * size until the decision is accepted — a pending row carries a percentage with
 * every fill field null — so any figure this product displayed would be its own
 * arithmetic wearing the platform's authority, on a confirmation, about money
 * (PE-2). The proportion is what the platform said, and it is what we show.
 */
export interface PendingDecisionView {
  readonly decision: EntryDecision;
  /**
   * Milliseconds until the platform stops accepting an answer, floored at zero.
   *
   * Derived here rather than in a component: the Iron Rule permits a
   * server-side derivation returned as a first-class field, and forbids a
   * client rebuilding it from `expiresAt`. Null when the platform sent no
   * expiry — which is unknown, not "expires now".
   */
  readonly msRemaining: number | null;
}

/**
 * Empty and unreadable are different answers and never collapse into one.
 *
 * "Nothing is waiting" is a fact about the account. "The queue could not be
 * read" is a fact about the connection. Rendering the second as the first tells
 * an operator their agents have proposed nothing when the truth is that nobody
 * knows — and this queue is the one surface where that mistake means a real
 * trade expires unanswered.
 */
export type PendingDecisionsResult =
  | { readonly kind: 'waiting'; readonly decisions: readonly PendingDecisionView[] }
  | { readonly kind: 'none' }
  | { readonly kind: 'unreadable'; readonly reason: string };

export class ReadPendingDecisionsQuery {
  constructor(
    private readonly agents: AgentsPort,
    private readonly clock: Clock,
  ) {}

  async execute(req: {
    userId: string;
    accessToken: string;
    agentId: string;
    limit?: number | undefined;
  }): Promise<PendingDecisionsResult> {
    const stage: StageResult<EntryDecision> = await this.agents.readEntryDecisions(req);

    if (stage.kind === 'unreadable') return { kind: 'unreadable', reason: stage.reason };
    if (stage.kind === 'none') return { kind: 'none' };

    const now = this.clock.now().getTime();

    // Filtered here as well as at the platform, because the answerable set is
    // defined by the domain and a page read a moment ago can already contain a
    // decision that has since closed.
    const decisions = stage.entries.filter(isAnswerable).map((decision) => ({
      decision,
      msRemaining: remainingMs(decision.expiresAt, now),
    }));

    return decisions.length === 0 ? { kind: 'none' } : { kind: 'waiting', decisions };
  }
}

function remainingMs(expiresAt: string | null, now: number): number | null {
  if (expiresAt === null) return null;
  const at = Date.parse(expiresAt);
  if (Number.isNaN(at)) return null;
  return Math.max(0, at - now);
}
