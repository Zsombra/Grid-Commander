import type { ProposalStatus } from '@/domain/proposal/proposal.js';
import type { ProposalStore } from '@/ports/proposals.js';

export interface ResolveProposalRequest {
  readonly userId: string;
  readonly id: string;
  readonly status: Extract<ProposalStatus, 'agreed' | 'declined'>;
}

/**
 * Close a proposal, once.
 *
 * Holds no BattleGrid port. Agreeing to a proposal performs the ordinary write
 * through the ordinary use-case; this only records that the suggestion was
 * dealt with, and it is called **after** that write succeeded. Closing first
 * would leave a proposal marked agreed against a change that never happened.
 */
export class ResolveProposalCommand {
  constructor(private readonly proposals: ProposalStore) {}

  async execute(req: ResolveProposalRequest): Promise<{ readonly closed: boolean }> {
    return { closed: await this.proposals.resolve(req) };
  }
}
