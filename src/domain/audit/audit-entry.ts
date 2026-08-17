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
 * `user` is a person acting through a surface. `assistant` was the read-only
 * assistant reading on their behalf while answering, and **nothing in this
 * product can produce it any more** — that capability was removed in
 * `only-mcp-control`, because it reached a model API no deployment ever had a
 * credential for.
 *
 * **It is kept anyway, and this is not dead code.** The audit log is a
 * historical record: it exists to say what was done on someone's account, and a
 * log that cannot render its own past is broken in the way that matters most.
 * `actor` is stored as `text` with a `'user'` default rather than a Postgres
 * enum, so a row written before the removal reads back intact — and narrowing
 * this union would render it as "you", which is a false statement about who
 * acted.
 *
 * The original reason for the distinction still holds for reading it back:
 * "I did this" and "the assistant did this while answering me" are different
 * levels of intent, and merging them makes the log hardest to reason about
 * exactly when someone is reasoning hard about it.
 */
export type AuditActor = 'user' | 'assistant';

export interface AuditEntry {
  readonly id: string;
  readonly userId: string;
  readonly actor: AuditActor;
  readonly tool: string;
  readonly outcome: AuditOutcome;
  /** What **this product** judged: does the operation carry a consequence? */
  readonly destructive: boolean;
  /**
   * What BattleGrid said about the same question, kept as evidence.
   *
   * `null` on every row written before 2026-08-17, and on any tool the platform
   * offered no opinion about. **A null is "not recorded", never "false"** — the
   * two eras are distinguishable precisely because the old rows have nothing
   * here, and nothing may read the absence as agreement.
   *
   * Recorded because the platform has been measured wrong on five tools: it
   * annotates the one write that opens a real position as not destructive
   * (#340). A row showing our judgement beside its claim is the evidence; a row
   * showing only ours would quietly discard it.
   */
  readonly platformDestructiveHint: boolean | null;
  readonly createdAt: Date;
  readonly completedAt: Date | null;
  readonly failureReason: string | null;
  readonly idempotencyKey: string | null;
}

/** An operation whose outcome was never recorded — the process died mid-call. */
export function isUnresolved(entry: AuditEntry): boolean {
  return entry.outcome === 'attempted';
}
