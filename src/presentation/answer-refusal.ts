import type { AnswerRefusal } from '@/domain/agent/pending-decision.js';

/**
 * A refused answer, in the operator's words — naming what moved, not that
 * something did.
 *
 * Lives in the presentation layer rather than beside the server action that
 * uses it because **routes are thin**: `app/` calls use cases and does not
 * import the domain (boundary W-D), and `AnswerRefusal` is a domain type.
 * `tests/architecture/boundaries.test.ts` catches the alternative.
 *
 * Each cause gets its own sentence because each leaves the operator somewhere
 * different. `levels-moved` means the trade on offer is not the one they judged
 * and they should read it again. `not-answerable` means there is nothing left to
 * answer and **nobody did anything wrong** — most importantly, that they did not
 * perform a cancel. `gone` means it cannot be read at all, which is not the same
 * as it having ended.
 *
 * Every one of them says that nothing was sent. That is the sentence the
 * operator actually needs: the binding refuses *before* the platform is asked,
 * so on all three paths their account is untouched, and leaving that implicit is
 * how somebody ends up checking BattleGrid to find out whether they own a
 * position.
 */
export function explainAnswerRefusal(refusal: AnswerRefusal): string {
  if (refusal.kind === 'gone') {
    return 'This decision could not be read when the cancel was confirmed, so nothing was sent to BattleGrid.';
  }

  if (refusal.kind === 'not-answerable') {
    const state =
      refusal.status === 'EXPIRED' ? 'expired unanswered' : `moved to ${refusal.status ?? 'another state'}`;
    return `Nothing was cancelled: the decision ${state} before the cancel was confirmed. No answer was sent, and this is not a cancel you performed.`;
  }

  const moved = refusal.moved
    .map((m) => `${LEVEL_NAMES[m.field]} moved from ${m.shown ?? 'not set'} to ${m.now ?? 'not set'}`)
    .join('; ');
  return `Nothing was cancelled: the trade changed after it was shown to you — ${moved}. Read it again before answering.`;
}

const LEVEL_NAMES = {
  entryPrice: 'the entry',
  stopLoss: 'the stop',
  takeProfit: 'the target',
} as const;
