import type { AuditActor, AuditEntry, AuditOutcome } from './audit-entry.js';

export interface AuditReader {
  listForUser(userId: string, limit: number): Promise<readonly AuditEntry[]>;
  /**
   * The LIVE entry for this key — the one that currently holds it. A failed
   * attempt releases its key (only `succeeded` and the undecided `attempted`
   * dedupe), so with retries several entries can share a key and this returns
   * the non-failed one, or null when every attempt failed.
   */
  findByIdempotencyKey(userId: string, key: string): Promise<AuditEntry | null>;
}

export interface NewAuditEntry {
  readonly userId: string;
  readonly actor: AuditActor;
  readonly tool: string;
  readonly destructive: boolean;
  /** The platform's contrary claim, or `null` where it offered none. */
  readonly platformDestructiveHint: boolean | null;
  readonly idempotencyKey: string | null;
}

export interface AuditWriter {
  /**
   * Record the attempt and COMMIT before the operation runs.
   *
   * Not in the same transaction as the call it describes: a shared transaction
   * would roll this row back on a crash, and the crash is precisely the case
   * this row exists for. See decision DL-6.
   */
  begin(entry: NewAuditEntry): Promise<string>;
  complete(id: string, outcome: Exclude<AuditOutcome, 'attempted'>, failureReason?: string): Promise<void>;
}
