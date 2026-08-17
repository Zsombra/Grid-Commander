'use server';

import { redirect } from 'next/navigation';
import { acting } from '@/presentation/session.js';
import { requiredText } from '@/presentation/form.js';
import { spending } from '@/presentation/confirmation-refusal.js';

export async function archiveStrategy(formData: FormData) {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') redirect('/connect');

  const strategyId = requiredText(formData, 'strategyId');
  const { result: reread, listings } = await app.listStrategies.execute(user.authority);
  // A failed re-read is an outcome too. This action used to land the person
  // on /strategies with no word — a click that did nothing, unexplained.
  if (reread.kind === 'unreadable') {
    const problem = `Nothing was attempted: your strategies could not be re-read (${reread.reason}).`;
    redirect(`/strategies/${strategyId}/archive?problem=${encodeURIComponent(problem)}`);
  }
  const listing = listings.find((l) => l.strategy.id === strategyId);
  if (!listing) {
    const problem =
      'Nothing was attempted: this strategy is no longer in your list — it may have been archived or removed in another session.';
    redirect(`/strategies/${strategyId}/archive?problem=${encodeURIComponent(problem)}`);
  }

  const result = await spending(
    () =>
      app.setStrategyActive.execute({
        ...user.authority,
        strategy: listing.strategy,
        active: false,
        confirmationToken: requiredText(formData, 'confirmationToken'),
      }),
    (problem) => redirect(`/strategies/${strategyId}/archive?problem=${encodeURIComponent(problem)}`),
  );
  // Both non-changed arms carry a reason, and both were being discarded — on
  // the one action whose refusal (`repair-required` included, if the platform
  // ever surfaces it here) most needs explaining. Back to the page acted from.
  if (result.kind === 'refused' || result.kind === 'repair-required') {
    redirect(`/strategies/${strategyId}/archive?problem=${encodeURIComponent(result.reason)}`);
  }
  redirect('/strategies');
}
