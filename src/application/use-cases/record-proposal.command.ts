import type { ProposableOperation, ProposalRefusal } from '@/domain/proposal/proposal.js';
import { checkProposal } from '@/domain/proposal/proposal.js';
import type { Clock } from '@/ports/clock.js';
import type { ProposalStore } from '@/ports/proposals.js';
import type { Randomness } from './connect.commands.js';

export interface RecordProposalRequest {
  readonly userId: string;
  readonly operation: ProposableOperation | string;
  readonly target: string;
  readonly values: Readonly<Record<string, unknown>>;
}

export type RecordProposalResult =
  | { readonly kind: 'recorded'; readonly proposalId: string; readonly reviewAt: string; readonly notice: string }
  | { readonly kind: 'refused'; readonly refusal: ProposalRefusal };

/**
 * Record what a model suggests, and stop.
 *
 * The constructor is the argument. It takes a store, a clock and a source of
 * ids — **no BattleGrid port**, so this cannot read a consequence, mint a
 * confirmation, reserve anything, or contact the platform even by mistake.
 * `tests/proposal/record.test.ts` asserts that by construction rather than by
 * behaviour, because a behavioural test only proves it did not happen once.
 *
 * What a human later agrees to is computed by the web app when they open the
 * proposal, against the world as it is then. That is why nothing here reads:
 * a consequence rendered now would describe a world that has moved by the time
 * anyone reads it, which is exactly what the confirmation's value-binding
 * exists to prevent.
 */
export class RecordProposalCommand {
  constructor(
    private readonly proposals: ProposalStore,
    private readonly random: Randomness,
    private readonly clock: Clock,
  ) {}

  async execute(req: RecordProposalRequest): Promise<RecordProposalResult> {
    const refusal = checkProposal({
      operation: req.operation,
      target: req.target,
      values: req.values,
    });
    // Refused proposals store nothing. A row a human would open to find
    // unusable is worse than a refusal a model can act on immediately.
    if (refusal) return { kind: 'refused', refusal };

    // 16 bytes, same source the OAuth state and confirmation tokens use. This
    // id is a *locator*, not a secret — a proposal confers no authority — but
    // it should still not be guessable, since knowing one names a target.
    const proposalId = this.random.token(16);
    await this.proposals.record({
      id: proposalId,
      userId: req.userId,
      operation: req.operation as ProposableOperation,
      target: req.target,
      proposedValues: req.values,
      recordedAt: this.clock.now(),
    });

    return {
      kind: 'recorded',
      proposalId,
      reviewAt: `/pending/${proposalId}`,
      // Said plainly, because a model will paraphrase it. "Recorded" alone
      // reads as "done", and nothing has been done to the account at all.
      notice:
        'Recorded as a proposal. Nothing has changed on the BattleGrid account and nothing ' +
        'will until a person opens this in the Grid-Commander web app, reads what it would ' +
        'do against the account as it is at that moment, and agrees.',
    };
  }
}
