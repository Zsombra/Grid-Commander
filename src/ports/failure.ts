/**
 * Why a read did not produce what was asked for.
 *
 * Two outcomes that look identical from the type — both leave nothing to show —
 * and are opposite from the user's chair. A **refusal** means BattleGrid was
 * reached, understood the question, and declined: waiting changes nothing, and
 * the fix is the authority. **Unreachable** means no usable answer came back at
 * all: the authority may be perfectly good, and waiting may be exactly right.
 *
 * Carried out of the read rather than re-derived from the message text. A view
 * that decided by matching on words would be a second, worse copy of a judgement
 * the adapter already made with the actual error in hand — and it would silently
 * start lying the first time a message was reworded.
 *
 * The distinction exists because of a sentence, not a behaviour: the roster
 * tells a user their agents have not been lost, and does so by naming a cause
 * that is obviously external and obviously not deletion. Naming the wrong one
 * makes the reassurance false in its particulars while still true in its point.
 */
export type FailureCause =
  /** BattleGrid answered, and the answer was no. */
  | 'refused'
  /** No usable answer: no response, a transport failure, or a malformed one. */
  | 'unreachable';
