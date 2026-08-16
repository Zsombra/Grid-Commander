'use server';

import { redirect } from 'next/navigation';
import { acting } from '@/presentation/session.js';
import { requiredText } from '@/presentation/form.js';
import { ConfirmationRequiredError, ScopeUnavailableError } from '@/domain/errors.js';
import { explainAnswerRefusal } from '@/presentation/answer-refusal.js';

/**
 * Cancel a proposed trade.
 *
 * The whole write path in one function, and every branch of it ends somewhere a
 * person can read. The command re-reads the decision and checks all five binding
 * conditions before the port is touched; what arrives back here is either an
 * answer that was performed or a typed refusal that names why.
 *
 * **Accepting has no action.** The change's Phase D gate requires a cancel
 * performed through the product and confirmed in the audit before any accept
 * surface exists (DL-11). Cancelling commits nothing, so it is the path that
 * proves the binding, the audit, the scope guard and the adapter for free.
 */
export async function cancelDecision(formData: FormData) {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') redirect('/connect');

  const agentId = requiredText(formData, 'agentId');
  const decisionId = requiredText(formData, 'decisionId');
  const back = `/approvals/${agentId}/${decisionId}`;

  /*
   * The `spending` shape, widened by exactly one error class.
   *
   * `confirmation-refusal.ts` makes the case for a `try` around the command call
   * **and nothing else**: `redirect()` works by throwing, so a `try` that also
   * wrapped a redirect would catch Next's own `NEXT_REDIRECT` and turn a
   * successful navigation into a swallowed error. That shape is kept here — the
   * call is inside, every redirect is outside — but this path can refuse two
   * ways rather than one, and the helper only knows about confirmations.
   *
   * Everything else re-throws untouched. A lost connection or a platform outage
   * is not a refusal, has no next step to name, and turning it into a
   * `?problem=` would tell the operator a falsehood about whose fault it was.
   */
  let result;
  try {
    result = await app.answerDecision.execute({
      ...user.authority,
      agentId,
      decisionId,
      verb: 'cancel',
      // The levels as they were rendered, carried back unchanged. The command
      // compares these against a fresh read — that comparison is the binding,
      // and it is also what makes a tampered hidden field fail: the target is
      // recomputed from these values and will not match the minted token.
      shown: {
        entryPrice: optionalNumber(formData, 'entryPrice'),
        stopLoss: optionalNumber(formData, 'stopLoss'),
        takeProfit: optionalNumber(formData, 'takeProfit'),
      },
      confirmationToken: requiredText(formData, 'confirmationToken'),
    });
  } catch (err) {
    // `consequence`, never `message` — the class composes a preamble asserting
    // the operation needs confirming, which contradicts every sentence it would
    // introduce to somebody who just confirmed it.
    if (err instanceof ConfirmationRequiredError) {
      redirect(`${back}?problem=${encodeURIComponent(err.consequence)}`);
    }
    /*
     * Authority the connection does not hold, refused before the attempt.
     *
     * Reachable even though the page renders no control without it: a grant can
     * be withdrawn at BattleGrid between the page rendering and the form being
     * submitted. The requirement says such an operation is refused before it is
     * attempted and the operator told which authority is needed — so this lands
     * on the step-up rather than on a framework crash page.
     */
    if (err instanceof ScopeUnavailableError) {
      redirect(`/approvals/authority?next=${encodeURIComponent(back)}`);
    }
    throw err;
  }

  if (result.kind === 'refused') {
    // Back to the decision, freshly rendered, with what actually happened. The
    // refusal is never a retry button: the state moved, and a one-click retry
    // would invite spending an agreement against a world that has changed.
    redirect(`${back}?problem=${encodeURIComponent(explainAnswerRefusal(result.refusal))}`);
  }

  redirect('/approvals?note=The+proposal+was+cancelled.+Nothing+was+bought+or+sold.');
}

/**
 * A level that may legitimately be absent.
 *
 * An empty field is `null`, not zero: the platform sends null for a level it did
 * not set, and a zero here would be a price the agent never chose — one that
 * would then be compared against the re-read and refuse every answer.
 */
function optionalNumber(formData: FormData, name: string): number | null {
  const raw = formData.get(name);
  if (typeof raw !== 'string' || raw === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}
