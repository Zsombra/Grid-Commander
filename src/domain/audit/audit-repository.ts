import type { AuditEntry, AuditOutcome } from './audit-entry.js';

export interface AuditReader {
  listForUser(userId: string, limit: number): Promise<readonly AuditEntry[]>;
  findByIdempotencyKey(userId: string, key: string): Promise<AuditEntry | null>;
}

export interface NewAuditEntry {
  readonly userId: string;
  readonly tool: string;
  readonly destructive: boolean;
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
