/**
 * What happened to an operation Grid-Commander performed on a user's behalf.
 *
 * There is no `unknown` member. `attempted` IS the unknown state: it means we
 * started and never learned the outcome. A log that only records successes
 * cannot answer the question an audit log exists to answer.
 */
export type AuditOutcome = 'attempted' | 'succeeded' | 'failed';

/**
 * Who caused the operation.
 *
 * `user` is a person acting through a surface; `assistant` is the read-only
 * assistant reading on their behalf while answering. Distinguished rather than
 * merged: reviewing a log, "I did this" and "the assistant did this while
 * answering me" are different levels of intent, and merging them makes the log
 * hardest to reason about exactly when someone is reasoning hard about it.
 */
export type AuditActor = 'user' | 'assistant';

export interface AuditEntry {
  readonly id: string;
  readonly userId: string;
  readonly actor: AuditActor;
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
