import type { Proposal } from '@/domain/proposal/proposal.js';
import { partition } from '@/domain/proposal/proposal.js';
import type { Clock } from '@/ports/clock.js';
import type { ProposalStore } from '@/ports/proposals.js';

export interface ReadProposalsRequest {
  readonly userId: string;
}

/**
 * Three states, kept apart.
 *
 * `empty` is "a model has suggested nothing" and `unreadable` is "we could not
 * ask" — the distinction this product draws everywhere, and the one most easily
 * lost to a `?? []`. Collapsing them here would tell an operator nothing is
 * waiting for them at the exact moment the store is down and something is.
 */
export type ProposalsResult =
  | {
      readonly kind: 'proposals';
      /** Open, inside the horizon, and still agreeable. */
      readonly actionable: readonly Proposal[];
      /** Open but past the horizon. History, not a queue. */
      readonly stale: readonly Proposal[];
      /** Agreed or declined. What was already decided. */
      readonly resolved: readonly Proposal[];
    }
  | { readonly kind: 'empty' }
  | { readonly kind: 'unreadable'; readonly reason: string };

export class ReadProposalsQuery {
  constructor(
    private readonly proposals: ProposalStore,
    private readonly clock: Clock,
  ) {}

  async execute(req: ReadProposalsRequest): Promise<ProposalsResult> {
    let all: readonly Proposal[];
    try {
      all = await this.proposals.list(req.userId);
    } catch (error) {
      // Never an empty list. A failed read reported as "nothing is waiting" is
      // the same lie `RosterResult` was shaped to prevent, one table over.
      return {
        kind: 'unreadable',
        reason: error instanceof Error ? error.message : 'the proposal store did not answer',
      };
    }

    if (all.length === 0) return { kind: 'empty' };

    const { actionable, stale } = partition(all, this.clock.now());
    return {
      kind: 'proposals',
      actionable,
      stale,
      resolved: all.filter((p) => p.status !== 'open'),
    };
  }
}
