import { ConfirmationRequiredError, ConnectionRevokedError } from '@/domain/errors.js';

/**
 * What a thrown failure is, to the person who asked for the operation.
 *
 * Three different things arrive at a perform's catch and only two of them are
 * refusals of that operation:
 *
 * - **The account's authority is gone.** Nothing will work until the
 *   credential is repaired or the connection remade, so calling it a refusal
 *   of *this* operation invites a retry that cannot succeed. The adapter goes
 *   out of its way to preserve `ConnectionRevokedError` through the call —
 *   "must not be reshaped into something that looks retryable"
 *   (`mcp-adapter.ts`) — and four catches were reshaping it anyway.
 * - **The product's own confirmation guard refused.** That means what was
 *   submitted is not what was agreed to: a broken or tampered request, not a
 *   platform answer. It keeps throwing, and `end-to-end` pins it.
 * - **Everything else** — a moved revision, a rejected value, an outage. The
 *   operation was refused and attempting something else may well work.
 *
 * Held in one place because four sites making this judgement separately is how
 * three of them end up making it differently, which is exactly the state this
 * was written to leave.
 */
export type FailureOutcome =
  | { readonly kind: 'refused'; readonly reason: string }
  | { readonly kind: 'authority-lost'; readonly reason: string };

export function outcomeOf(err: unknown): FailureOutcome {
  // Not an outcome at all: the guard's refusal is a broken request, and the
  // product has always answered it by throwing.
  if (err instanceof ConfirmationRequiredError) throw err;

  const reason = err instanceof Error ? err.message : String(err);

  // The message already carries this deployment's remedy, because the error is
  // constructed with it. Passing it through unchanged is what keeps a personal
  // deployment from being told to reconnect.
  if (err instanceof ConnectionRevokedError) return { kind: 'authority-lost', reason };

  return { kind: 'refused', reason };
}
