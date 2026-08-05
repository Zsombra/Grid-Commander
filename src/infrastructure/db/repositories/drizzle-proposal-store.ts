import { and, desc, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Proposal, ProposableOperation, ProposalStatus } from '@/domain/proposal/proposal.js';
import { isProposable } from '@/domain/proposal/proposal.js';
import type { ProposalStore } from '@/ports/proposals.js';
import { proposals } from '../schema/index.js';

type Db = NodePgDatabase<Record<string, never>>;

/**
 * Proposals, in PostgreSQL.
 *
 * Two properties this class exists to hold.
 *
 * **It stores nothing spendable.** No confirmation token, no access token —
 * enforced by the schema having no such columns and asserted in
 * `tests/db/proposals.test.ts` by reading the schema, so a later migration
 * cannot reintroduce one quietly.
 *
 * **Ownership is in the WHERE, never checked afterwards.** Every read and the
 * resolve are scoped by `userId` in the statement itself, on the same reasoning
 * `DrizzleConfirmationStore.consume` puts its conditions there: a check applied
 * after the row is in hand is a check someone can forget, and this table holds
 * one account's intentions about another account's money.
 */
export class DrizzleProposalStore implements ProposalStore {
  constructor(private readonly db: Db) {}

  async record(proposal: Omit<Proposal, 'status' | 'resolvedAt'>): Promise<void> {
    await this.db.insert(proposals).values({
      id: proposal.id,
      userId: proposal.userId,
      operation: proposal.operation,
      target: proposal.target,
      proposedValues: JSON.stringify(proposal.proposedValues),
      // From the caller's clock, never `defaultNow()`. Staleness is computed
      // from this, and a database default would put the one value the tests
      // need to move beyond their reach.
      recordedAt: proposal.recordedAt,
      status: 'open',
      resolvedAt: null,
    });
  }

  async list(userId: string): Promise<readonly Proposal[]> {
    const rows = await this.db
      .select()
      .from(proposals)
      .where(eq(proposals.userId, userId))
      .orderBy(desc(proposals.recordedAt));
    return rows.map(toDomain).filter((p): p is Proposal => p !== null);
  }

  async get(params: { userId: string; id: string }): Promise<Proposal | null> {
    const [row] = await this.db
      .select()
      .from(proposals)
      .where(and(eq(proposals.id, params.id), eq(proposals.userId, params.userId)));
    return row ? toDomain(row) : null;
  }

  async resolve(params: {
    userId: string;
    id: string;
    status: Extract<ProposalStatus, 'agreed' | 'declined'>;
  }): Promise<boolean> {
    // `status = 'open'` is in the WHERE, so two concurrent resolves match one
    // row between them and the second gets nothing back. The check and the
    // write are one statement.
    const rows = await this.db
      .update(proposals)
      .set({ status: params.status, resolvedAt: new Date() })
      .where(
        and(
          eq(proposals.id, params.id),
          eq(proposals.userId, params.userId),
          eq(proposals.status, 'open'),
        ),
      )
      .returning({ id: proposals.id });
    return rows.length === 1;
  }
}

/**
 * A row, as the domain sees it.
 *
 * A row whose `operation` is not one this product offers returns null and is
 * dropped by the caller — the same discipline `mapSignalRules` applies to a
 * rule with no `signalId`. An operation nobody can resolve to a describe is
 * not a proposal a human could act on, and rendering it would offer a button
 * that cannot work.
 */
function toDomain(row: {
  id: string;
  userId: string;
  operation: string;
  target: string;
  proposedValues: string;
  recordedAt: Date;
  status: string;
  resolvedAt: Date | null;
}): Proposal | null {
  if (!isProposable(row.operation)) return null;
  return {
    id: row.id,
    userId: row.userId,
    operation: row.operation as ProposableOperation,
    target: row.target,
    proposedValues: parseValues(row.proposedValues),
    recordedAt: row.recordedAt,
    status: (['open', 'agreed', 'declined'] as const).includes(row.status as ProposalStatus)
      ? (row.status as ProposalStatus)
      : 'open',
    resolvedAt: row.resolvedAt,
  };
}

/** Unreadable values become empty rather than throwing the whole list away. */
function parseValues(raw: string): Readonly<Record<string, unknown>> {
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}
