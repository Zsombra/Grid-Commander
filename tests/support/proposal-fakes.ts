import type { Proposal, ProposalStatus } from '@/domain/proposal/proposal.js';
import type { ProposalStore } from '@/ports/proposals.js';

/**
 * A proposal store for rendering tests.
 *
 * `listFails` exists because the distinction the queue page must never lose —
 * "nothing has been proposed" against "we could not ask" — is only testable
 * when the read can be made to fail.
 */
export class FakeProposalStore implements ProposalStore {
  rows: Proposal[] = [];
  listFails: string | null = null;

  async record(p: Omit<Proposal, 'status' | 'resolvedAt'>): Promise<void> {
    this.rows.push({ ...p, status: 'open', resolvedAt: null });
  }

  async list(userId: string): Promise<readonly Proposal[]> {
    if (this.listFails) throw new Error(this.listFails);
    return this.rows.filter((r) => r.userId === userId);
  }

  async get(params: { userId: string; id: string }): Promise<Proposal | null> {
    return this.rows.find((r) => r.id === params.id && r.userId === params.userId) ?? null;
  }

  async resolve(params: {
    userId: string;
    id: string;
    status: Extract<ProposalStatus, 'agreed' | 'declined'>;
  }): Promise<boolean> {
    const row = this.rows.find(
      (r) => r.id === params.id && r.userId === params.userId && r.status === 'open',
    );
    if (!row) return false;
    Object.assign(row, { status: params.status, resolvedAt: new Date() });
    return true;
  }
}

export const aProposal = (over: Partial<Proposal> = {}): Proposal => ({
  id: 'p1',
  userId: 'owner',
  operation: 'edit',
  target: 'agent-1',
  proposedValues: { changes: { tradingMode: 'OFF' } },
  recordedAt: new Date('2026-08-05T09:00:00Z'),
  status: 'open',
  resolvedAt: null,
  ...over,
});
