import { and, desc, eq, gt, isNull, ne } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { AuditEntry, AuditOutcome } from '@/domain/audit/audit-entry.js';
import type { AuditReader, AuditWriter, NewAuditEntry } from '@/domain/audit/audit-repository.js';
import { DuplicateIdempotencyKeyError } from '@/domain/errors.js';
import type {
  ConfirmationRefusalCause,
  ConfirmationStore,
  ConfirmationToken,
} from '@/domain/capability/confirmation.js';
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
    try {
      await this.db.insert(auditEntries).values({
        id,
        userId: entry.userId,
        actor: entry.actor,
        tool: entry.tool,
        destructive: entry.destructive,
        platformDestructiveHint: entry.platformDestructiveHint,
        outcome: 'attempted' satisfies AuditOutcome,
        createdAt: this.clock.now(),
        idempotencyKey: entry.idempotencyKey,
      });
    } catch (err) {
      // The partial unique index refusing a second live attempt for this key.
      // Catching the violation, rather than pre-reading and branching, makes
      // the race path and the sequential path the same path: two presses both
      // INSERT, the loser lands here. Anything else that goes wrong with the
      // insert is not this refusal and is rethrown untouched.
      if (entry.idempotencyKey !== null && isIdempotencyCollision(err)) {
        const live = await this.findByIdempotencyKey(entry.userId, entry.idempotencyKey);
        // The colliding row can only be non-failed — the index ignores failed
        // rows — but it may have completed between the collision and this
        // read. A vanished or since-failed row reads as `attempted`: the
        // honest unknown, same as the outcome mapper below.
        throw new DuplicateIdempotencyKeyError(
          entry.tool,
          live?.outcome === 'succeeded' ? 'succeeded' : 'attempted',
        );
      }
      throw err;
    }
    return id;
  }

  async complete(
    id: string,
    outcome: Exclude<AuditOutcome, 'attempted'>,
    failureReason?: string,
  ): Promise<void> {
    const updated = await this.db
      .update(auditEntries)
      .set({
        outcome,
        completedAt: this.clock.now(),
        failureReason: failureReason ?? null,
      })
      .where(eq(auditEntries.id, id))
      .returning({ id: auditEntries.id });
    // A completion aimed at nothing must not report success: the caller would
    // believe the record closed while it still reads `attempted`. No
    // replacement row is manufactured — a completion is evidence about an
    // operation that began, and inventing the beginning to justify the end
    // is worse than the failure it hides.
    if (updated.length === 0) {
      throw new Error(`no audit entry "${id}" to complete`);
    }
  }

  async listForUser(userId: string, limit: number): Promise<readonly AuditEntry[]> {
    const rows = await this.db
      .select()
      .from(auditEntries)
      .where(eq(auditEntries.userId, userId))
      // The id tiebreak does not make same-instant order *true* — two entries
      // in one millisecond have no true order — but it makes it stable, which
      // is what a reader comparing two page loads actually needs.
      .orderBy(desc(auditEntries.createdAt), desc(auditEntries.id))
      .limit(limit);
    return rows.map(toDomain);
  }

  async findByIdempotencyKey(userId: string, key: string): Promise<AuditEntry | null> {
    // The live entry — the one that holds the key. With retries there can be
    // several rows per (user, key); the failed ones released it, and the
    // partial index guarantees at most one row here.
    const [row] = await this.db
      .select()
      .from(auditEntries)
      .where(
        and(
          eq(auditEntries.userId, userId),
          eq(auditEntries.idempotencyKey, key),
          ne(auditEntries.outcome, 'failed'),
        ),
      );
    return row ? toDomain(row) : null;
  }
}

/**
 * The unique-violation shape node-postgres raises for our partial index,
 * wherever drizzle put it. Checked by SQLSTATE and constraint name rather than
 * message text — a spelling in a message is exactly the kind of guard that
 * breaks silently.
 */
function isIdempotencyCollision(err: unknown): boolean {
  for (let e = err; typeof e === 'object' && e !== null; e = (e as { cause?: unknown }).cause) {
    const { code, constraint } = e as { code?: unknown; constraint?: unknown };
    if (code === '23505' && constraint === 'audit_entries_user_idempotency_idx') return true;
  }
  return false;
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
    // `null` stays `null`. A row from before the column existed did not claim
    // the platform agreed — it recorded nothing, and coercing it to false here
    // would manufacture evidence.
    platformDestructiveHint: row.platformDestructiveHint,
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

  async diagnose(
    token: string,
    userId: string,
    tool: string,
    target: string,
  ): Promise<ConfirmationRefusalCause> {
    const [row] = await this.db
      .select()
      .from(confirmationTokens)
      .where(eq(confirmationTokens.token, token));
    if (!row) return 'unknown';
    // Mismatch outranks the states below: a token spent or expired *for a
    // different action* would otherwise tell the user about a lifecycle they
    // never touched.
    if (row.userId !== userId || row.tool !== tool || row.target !== target) return 'mismatched';
    if (row.consumedAt !== null) return 'already-used';
    if (row.expiresAt.getTime() <= this.clock.now().getTime()) return 'expired';
    // Everything matches and it looks spendable — the consume lost a race.
    return 'already-used';
  }
}
