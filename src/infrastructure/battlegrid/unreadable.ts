import { ConnectionRevokedError } from '@/domain/errors.js';
import type { FailureCause } from '@/ports/failure.js';

/**
 * A read that produced nothing, and why.
 *
 * One function rather than a helper per adapter. Both had their own identical
 * `message(err)` and would now need their own identical classification too —
 * and the moment those two copies disagree, the same failure is described one
 * way on `/agents` and another on `/strategies`.
 *
 * The classification is made **here, with the error in hand**. A view matching
 * on words would be re-deriving a judgement already available as a fact, and it
 * would start lying quietly the first time a message was reworded.
 */
export function unreadable(err: unknown): {
  readonly kind: 'unreadable';
  readonly reason: string;
  readonly cause: FailureCause;
} {
  return {
    kind: 'unreadable',
    reason: messageOf(err),
    // The only error that means "BattleGrid answered and declined". Everything
    // else — a transport failure, a JSON-RPC error, a payload that did not
    // parse — means no usable answer arrived, whatever the reason.
    cause: err instanceof ConnectionRevokedError ? 'refused' : 'unreachable',
  };
}

/**
 * A read whose answer arrived but was not an answer.
 *
 * Separate from `unreadable(err)` because there is no error to classify: the
 * call succeeded and returned something the mapper cannot use. That is
 * `'unreachable'` in the sense that matters — no usable answer came back — and
 * emphatically not a refusal, which would send the user to fix an authority
 * that is working.
 */
export function malformed(reason: string): {
  readonly kind: 'unreadable';
  readonly reason: string;
  readonly cause: FailureCause;
} {
  return { kind: 'unreadable', reason, cause: 'unreachable' };
}

/**
 * What to show a user about a failure that is not one of the two above.
 *
 * `compilePlan` rejects rather than reading, so it has no `cause` to carry — but
 * it needs the same text. Both adapters used to define this privately and
 * identically; it lives here now so there is one answer to "what does an error
 * say" in the whole BattleGrid boundary.
 */
export function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
