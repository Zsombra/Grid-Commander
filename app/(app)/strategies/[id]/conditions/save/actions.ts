'use server';

import { redirect } from 'next/navigation';
import { acting } from '@/presentation/session.js';
import { compiledPlan, requiredText } from '@/presentation/form.js';

/**
 * Apply the plan that was reviewed — not a freshly compiled one.
 *
 * The compiled plan travels through the form for the reason the section
 * editor's does: recompiling here would produce a plan with the same intent
 * digest and possibly different contents, and what is applied must be what was
 * reviewed. It is not trusted — the confirmation is bound to
 * `strategy:<id>#<intentDigest>`, so a plan altered in transit digests
 * differently, the consume fails, and the write is refused before BattleGrid is
 * asked.
 *
 * A refusal returns to a fresh describe over the same edit. The revision moved,
 * or the token expired, or the platform declined: all three are fixed by
 * looking at the change again against the strategy as it is now.
 */
export async function saveConditions(formData: FormData) {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') redirect('/connect');

  const strategyId = requiredText(formData, 'strategyId');
  const draft = formData.get('draft');
  try {
    await app.applyPlan.execute({
      ...user.authority,
      strategyId,
      plan: compiledPlan(formData, 'plan'),
      confirmationToken: requiredText(formData, 'confirmationToken'),
    });
  } catch (err) {
    const query = new URLSearchParams(typeof draft === 'string' ? draft : '');
    query.set('problem', err instanceof Error ? err.message : String(err));
    redirect(`/strategies/${strategyId}/conditions/save?${query.toString()}`);
  }
  // The proof is the re-read: the strategy page draws its conditions from
  // `get_strategy`, not from anything this action was told.
  redirect(`/strategies/${strategyId}`);
}
