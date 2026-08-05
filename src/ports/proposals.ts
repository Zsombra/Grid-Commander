import type { Proposal, ProposalStatus } from '@/domain/proposal/proposal.js';

/**
 * Re-exported so a route can name an operation without importing the domain.
 *
 * `boundaries.test.ts` forbids `app/` reaching past the port layer, and it is
 * right to: a page importing the domain today is a page importing an adapter
 * tomorrow. The vocabulary is what a surface legitimately needs, so it travels
 * through the port that owns proposals.
 */
export { OPERATIONS } from '@/domain/proposal/proposal.js';
export type { OperationShape, ProposableOperation } from '@/domain/proposal/proposal.js';

/**
 * Where proposals live.
 *
 * A port rather than a repository import, so the domain and the use-cases
 * never see Drizzle — and so the thing that records a proposal is provably
 * separate from anything that reaches BattleGrid.
 *
 * There is no `update`. A proposal is immutable once recorded: a model that
 * changes its mind records a new one. `resolve` moves status exactly once,
 * which is a transition rather than an edit, and the store refuses a second.
 */
export interface ProposalStore {
  /** Record an intent. Returns the id a human will open it by. */
  record(proposal: Omit<Proposal, 'status' | 'resolvedAt'>): Promise<void>;

  /** Everything recorded for this user, newest first. Never another user's. */
  list(userId: string): Promise<readonly Proposal[]>;

  /** One, or null when it does not exist for this user. */
  get(params: { userId: string; id: string }): Promise<Proposal | null>;

  /**
   * Close a proposal, once.
   *
   * Returns false when it was already resolved, so a double-submit cannot
   * report success twice. The single-use confirmation is what actually stops
   * a double *write*; this stops a double *record* of one.
   */
  resolve(params: {
    userId: string;
    id: string;
    status: Extract<ProposalStatus, 'agreed' | 'declined'>;
  }): Promise<boolean>;
}
