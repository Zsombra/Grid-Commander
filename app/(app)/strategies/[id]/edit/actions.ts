'use server';

import { redirect } from 'next/navigation';
import { acting } from '@/presentation/session.js';
import { compiledPlan, requiredText } from '@/presentation/form.js';
import { spending } from '@/presentation/confirmation-refusal.js';

/**
 * Apply the plan that was reviewed — not a freshly compiled one.
 *
 * The compiled plan travels through the form rather than being recompiled here.
 * Recompiling would produce a plan with the same intent digest and possibly
 * different contents, and "what is applied is what was reviewed" is a
 * requirement rather than an aspiration.
 *
 * Carrying it through the browser is safe because it is not trusted: the
 * confirmation is bound to `strategy:<id>#<intentDigest>`, so a plan altered in
 * transit produces a different digest, the confirmation fails to consume, and
 * the write is refused before it reaches BattleGrid.
 */
export async function apply(formData: FormData) {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') redirect('/connect');

  const strategyId = requiredText(formData, 'strategyId');

  /**
   * Back to a *recompiled* review with the refusal above it — never to the
   * blank compose form, and never to the roster. The form carries the
   * composition (tagline, sections) precisely so this can rebuild the compile
   * query; the confirmation that was refused is dead either way, and an
   * expired one means "review again and nothing is wrong", so the fresh
   * review is the recovery, not a detour (#240).
   */
  const backToReview = (problem: string): string => {
    const query = new URLSearchParams({ compile: '1' });
    const tagline = formData.get('tagline');
    if (typeof tagline === 'string') query.set('tagline', tagline);
    for (const s of formData.getAll('sections')) {
      if (typeof s === 'string') query.append('sections', s);
    }
    for (const s of formData.getAll('unknownSections')) {
      if (typeof s === 'string') query.append('unknownSections', s);
    }
    query.set('problem', problem);
    return `/strategies/${strategyId}/edit?${query.toString()}`;
  };

  await spending(
    () =>
      app.applyPlan.execute({
        ...user.authority,
        strategyId,
        plan: compiledPlan(formData, 'plan'),
        confirmationToken: requiredText(formData, 'confirmationToken'),
      }),
    (problem) => redirect(backToReview(problem)),
  );
  redirect('/strategies');
}
