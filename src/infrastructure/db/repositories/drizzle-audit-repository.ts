import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { AuditEntry, AuditOutcome } from '@/domain/audit/audit-entry.js';
import type { AuditReader, AuditWriter, NewAuditEntry } from '@/domain/audit/audit-repository.js';
import type { ConfirmationStore, ConfirmationToken } from '@/domain/capability/confirmation.js';
import type { Clock } from '@/ports/clock.js';
import { auditEntries, confirmationTokens } from '../schema/index.js';

type Db = NodePgDatabase<Record<string, never>>;

/**
 * The record of what this product did on a user's account.
 *
 * `begin` writes and commits on its own, before the operation it describes runs.
 * It must never be enrolled in a transaction with that operation: sharing one
 * would roll this row back on a crash, and the crash is exactly the case the row
 * exists for. See DL-6.
 */
export class DrizzleAuditRepository implements AuditReader, AuditWriter {
  constructor(
    private readonly db: Db,
    private readonly clock: Clock,
    private readonly newId: () => string,
  ) {}

  async begin(entry: NewAuditEntry): Promise<string> {
    const id = this.newId();
    await this.db.insert(auditEntries).values({
      id,
      userId: entry.userId,
      actor: entry.actor,
      tool: entry.tool,
      destructive: entry.destructive,
      outcome: 'attempted' satisfies AuditOutcome,
      createdAt: this.clock.now(),
      idempotencyKey: entry.idempotencyKey,
    });
    return id;
  }

  async complete(
    id: string,
    outcome: Exclude<AuditOutcome, 'attempted'>,
    failureReason?: string,
  ): Promise<void> {
    await this.db
      .update(auditEntries)
      .set({
        outcome,
        completedAt: this.clock.now(),
        failureReason: failureReason ?? null,
      })
      .where(eq(auditEntries.id, id));
  }

  async listForUser(userId: string, limit: number): Promise<readonly AuditEntry[]> {
    const rows = await this.db
      .select()
      .from(auditEntries)
      .where(eq(auditEntries.userId, userId))
      .orderBy(desc(auditEntries.createdAt))
      .limit(limit);
    return rows.map(toDomain);
  }

  async findByIdempotencyKey(userId: string, key: string): Promise<AuditEntry | null> {
    const [row] = await this.db
      .select()
      .from(auditEntries)
      .where(and(eq(auditEntries.userId, userId), eq(auditEntries.idempotencyKey, key)));
    return row ? toDomain(row) : null;
  }
}

function toDomain(row: typeof auditEntries.$inferSelect): AuditEntry {
  return {
    id: row.id,
    userId: row.userId,
    actor: row.actor === 'assistant' ? 'assistant' : 'user',
    tool: row.tool,
    // Anything the column holds that is not a known outcome reads as
    // `attempted` — the honest unknown — rather than as a success.
    outcome: row.outcome === 'succeeded' || row.outcome === 'failed' ? row.outcome : 'attempted',
    destructive: row.destructive,
    createdAt: row.createdAt,
    completedAt: row.completedAt,
    failureReason: row.failureReason,
    idempotencyKey: row.idempotencyKey,
  };
}

/**
 * Confirmations, single-use and bound to what they were issued for.
 *
 * The consume is a conditional update returning the row: a token is spent by the
 * same statement that checks it, so two concurrent requests cannot both succeed
 * in using one.
 */
export class DrizzleConfirmationStore implements ConfirmationStore {
  constructor(
    private readonly db: Db,
    private readonly clock: Clock,
  ) {}

  async issue(token: ConfirmationToken): Promise<void> {
    await this.db.insert(confirmationTokens).values({
      token: token.token,
      userId: token.userId,
      tool: token.tool,
      target: token.target,
      consequence: token.consequence,
      expiresAt: token.expiresAt,
      consumedAt: token.consumedAt,
    });
  }

  async consume(
    token: string,
    userId: string,
    tool: string,
    target: string,
  ): Promise<ConfirmationToken | null> {
    const now = this.clock.now();
    // Every condition is in the WHERE, not checked after the fact. `.returning()`
    // hands back the row *after* the update, so a post-hoc `consumedAt !== null`
    // test can never fail — it would always see the value this statement just
    // wrote, and a spent token would be replayable.
    //
    // Putting the conditions here also makes the check atomic: two concurrent
    // requests presenting the same token, only one row matches.
    const [row] = await this.db
      .update(confirmationTokens)
      .set({ consumedAt: now })
      .where(
        and(
          eq(confirmationTokens.token, token),
          // The binding. A confirmation issued for one action cannot authorise
          // another.
          eq(confirmationTokens.userId, userId),
          eq(confirmationTokens.tool, tool),
          eq(confirmationTokens.target, target),
          // Single-use.
          isNull(confirmationTokens.consumedAt),
          // Still within the window the user was shown it in.
          gt(confirmationTokens.expiresAt, now),
        ),
      )
      .returning();

    if (!row) return null;

    return {
      token: row.token,
      userId: row.userId,
      tool: row.tool,
      target: row.target,
      consequence: row.consequence,
      expiresAt: row.expiresAt,
      consumedAt: row.consumedAt,
    };
  }
}
