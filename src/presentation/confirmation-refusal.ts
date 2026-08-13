import { ConfirmationRequiredError } from '@/domain/errors.js';

/**
 * Spend a confirmation, and let its refusal reach the person who earned it.
 *
 * The product writes four careful sentences for the four ways a confirmation
 * can fail (`call-path.ts`, `CONFIRMATION_REFUSALS`) — expired, already used,
 * mismatched, unrecognised — and each names a different next step. Until this
 * existed, none of them reached anybody.
 *
 * `call-path` throws `ConfirmationRequiredError` when `consume` returns null.
 * `outcomeOf` deliberately re-throws it — *"the guard's refusal is a broken
 * request, and the product has always answered it by throwing"* — and the
 * commands that do not call `outcomeOf` never catch it either. There is no
 * error boundary in the app. So the throw ran all the way out of the server
 * action, and the person who pressed a confirmation twice was shown a framework
 * crash page **after their first press had succeeded**. That is #232, and it is
 * the opposite of what those four sentences were written for.
 *
 * ## Why a wrapper rather than a try/catch per action
 *
 * **`redirect()` works by throwing.** A `try` placed around a block that also
 * redirects catches Next's own `NEXT_REDIRECT` and turns a successful
 * navigation into a swallowed error. The only safe shape is a `try` around the
 * command call *and nothing else*, with the redirect outside it — which is
 * exactly what this enforces by construction: `run` is the call, `onRefused`
 * is where the redirect lives, and the two cannot be interleaved by accident.
 *
 * Twelve hand-written copies of that shape is twelve chances to widen the `try`
 * by one line. `control.ts` makes the same argument about className strings,
 * and it was right there too.
 *
 * ## What it deliberately does not do
 *
 * It catches **only** `ConfirmationRequiredError`. Everything else re-throws
 * untouched: a lost connection, a platform outage and a bug are not refusals,
 * they do not have a next step to name, and turning them into a `?problem=`
 * would tell the operator a falsehood about whose fault it was.
 *
 * ## Which half of the error reaches the page
 *
 * `err.consequence`, never `err.message`. The class composes its message as
 * `"<tool>" is destructive and needs confirmation: <consequence>`, and that
 * preamble contradicts every sentence it would introduce here: a spent
 * confirmation is not a missing one, and the person reading it *did* confirm.
 * On the `expired` path it is worse — somebody who agreed thirty seconds ago
 * would be told the operation needs confirming. It also puts a raw MCP tool
 * name in front of an operator who never types one.
 *
 * `errors.ts` records this same defect being fixed once already, on
 * `DiscoveryUnavailableError`: a preamble "asserting a category the operation
 * may not belong to". `consequence` is public for exactly this reason, and
 * the four refusal sentences are written as lowercase continuations — they
 * were authored to be joined to that preamble, and are the half worth keeping.
 *
 * @param run       The command call. Must not redirect — see above.
 * @param onRefused Where the refusal goes. Returns `never`, because
 *                  `redirect()` does; the type is what stops a caller falling
 *                  through and running the success path after a refusal.
 */
export async function spending<T>(
  run: () => Promise<T>,
  onRefused: (problem: string) => never,
): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (err instanceof ConfirmationRequiredError) onRefused(err.consequence);
    throw err;
  }
}
