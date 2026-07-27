/**
 * What happened to an operation Grid-Commander performed on a user's behalf.
 *
 * There is no `unknown` member. `attempted` IS the unknown state: it means we
 * started and never learned the outcome. A log that only records successes
 * cannot answer the question an audit log exists to answer.
 */
export type AuditOutcome = 'attempted' | 'succeeded' | 'failed';

export interface AuditEntry {
  readonly id: string;
  readonly userId: string;
  readonly tool: string;
  readonly outcome: AuditOutcome;
  readonly destructive: boolean;
  readonly createdAt: Date;
  readonly completedAt: Date | null;
  readonly failureReason: string | null;
  readonly idempotencyKey: string | null;
}

/** An operation whose outcome was never recorded — the process died mid-call. */
export function isUnresolved(entry: AuditEntry): boolean {
  return entry.outcome === 'attempted';
}
