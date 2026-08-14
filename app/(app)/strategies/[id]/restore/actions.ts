'use server';

import { redirect } from 'next/navigation';
import { acting } from '@/presentation/session.js';
import { requiredText } from '@/presentation/form.js';

export async function restoreStrategy(formData: FormData) {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') redirect('/connect');

  const strategyId = requiredText(formData, 'strategyId');
  const { result: reread, listings } = await app.listStrategies.execute(user.authority);
  // A failed re-read is an outcome too. This action used to land the person
  // on /strategies with no word — a click that did nothing, unexplained.
  if (reread.kind === 'unreadable') {
    const problem = `Nothing was attempted: your strategies could not be re-read (${reread.reason}).`;
    redirect(`/strategies/${strategyId}/restore?problem=${encodeURIComponent(problem)}`);
  }
  const listing = listings.find((l) => l.strategy.id === strategyId);
  if (!listing) {
    const problem =
      'Nothing was attempted: this strategy is no longer in your list — it may have been removed in another session.';
    redirect(`/strategies/${strategyId}/restore?problem=${encodeURIComponent(problem)}`);
  }

  const result = await app.setStrategyActive.execute({
    ...user.authority,
    strategy: listing.strategy,
    active: true,
  });

  // `repair-required` comes back as its own case rather than an error, and is
  // carried to the page so it can be explained rather than thrown away. The
  // `refused` arm was not: it redirected to the roster exactly as success
  // does, discarding the one reason the platform gave. Both arms return now.
  redirect(
    result.kind === 'repair-required'
      ? `/strategies/${strategyId}/restore?outcome=repair-required`
      : result.kind === 'refused'
        ? `/strategies/${strategyId}/restore?problem=${encodeURIComponent(result.reason)}`
        : '/strategies',
  );
}
