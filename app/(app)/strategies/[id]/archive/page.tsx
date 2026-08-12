import { redirect } from 'next/navigation';
import { acting } from '@/presentation/session.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { WhyNotLoaded } from '@/presentation/components/why-not-loaded.js';
import { BUTTON_PRIMARY, BUTTON_SECONDARY } from '@/presentation/components/control.js';
import { requiredText } from '@/presentation/form.js';
import { CarriedProblem } from '@/presentation/components/carried-problem.js';

/**
 * Retire a strategy, accounting for what depends on it.
 *
 * A confirmation token is issued against BattleGrid's own count of bound
 * agents, and the wording shown here is the wording stored with the token — so
 * what the user reads, what they agree to, and what the audit can later prove
 * are one string rather than three that drift. Follows the agent archive page
 * rather than inventing a second confirmation shape.
 */
export default async function ArchiveStrategyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ problem?: string }>;
}) {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const { id } = await params;
  const { problem } = await searchParams;
  const { result, listings } = await app.listStrategies.execute(user.authority);

  if (result.kind === 'unreadable') {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">Could not load this strategy</h1>
        {/* A bounced submit rode in with its reason; this branch must not eat
            it — it is the only record of what the click did (or did not) do. */}
        <CarriedProblem problem={problem} />
        <p role="alert" className="rounded-gc-2 border border-danger-default bg-danger-subtle p-4 text-sm text-text-primary">{result.reason}</p>
        <WhyNotLoaded cause={result.cause} subject="this strategy is" />
        {/* The roster, not the strategy: the read that would have said the
            strategy is there is the one that failed. */}
        <p className="text-sm">
          <a href="/strategies" className="underline">Back to your strategies</a>
        </p>
      </main>
    );
  }

  const listing = listings.find((l) => l.strategy.id === id);
  if (!listing) {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">No such strategy</h1>
        <CarriedProblem problem={problem} />
        <p className="text-sm">
          <a href="/strategies" className="underline">Back to your strategies</a>
        </p>
      </main>
    );
  }

  const proposal = await app.describeArchiveStrategy.execute({
    ...user.authority,
    strategy: listing.strategy,
  });

  if (proposal.kind === 'refused') {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">Cannot archive {listing.strategy.name}</h1>
        <CarriedProblem problem={problem} />
        <p role="alert" className="rounded-gc-2 border border-danger-default bg-danger-subtle p-4 text-sm text-text-primary">{proposal.reason}</p>
        <p className="text-sm">
          <a href={`/strategies/${listing.strategy.id}`} className="underline">
            Back to {listing.strategy.name}
          </a>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-xl font-medium">Archive {listing.strategy.name}?</h1>
        <CarriedProblem problem={problem} />
      {/* BattleGrid's count of what depends on this, not ours. */}
      <p role="alert" className="rounded-gc-2 border border-border-default p-4 text-sm">
        {proposal.proposal.consequence}
      </p>
      <form action={archiveStrategy} className="flex flex-wrap gap-3">
        <input type="hidden" name="strategyId" value={proposal.proposal.strategyId} />
        <input
          type="hidden"
          name="confirmationToken"
          value={proposal.proposal.confirmationToken}
        />
        <button type="submit" className={BUTTON_PRIMARY}>
          Archive {listing.strategy.name}
        </button>
        {/* Back to the strategy, not to the list. Someone who opens this and
            decides against it has not finished with the strategy, and sending
            them to the roster loses their place — which makes declining the more
            costly choice. */}
        <a href={`/strategies/${listing.strategy.id}`} className={BUTTON_SECONDARY}>
          Leave it active
        </a>
      </form>
    </main>
  );
}

export async function archiveStrategy(formData: FormData) {
  'use server';
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

  const result = await app.setStrategyActive.execute({
    ...user.authority,
    strategy: listing.strategy,
    active: false,
    confirmationToken: requiredText(formData, 'confirmationToken'),
  });
  // Both non-changed arms carry a reason, and both were being discarded — on
  // the one action whose refusal (`repair-required` included, if the platform
  // ever surfaces it here) most needs explaining. Back to the page acted from.
  if (result.kind === 'refused' || result.kind === 'repair-required') {
    redirect(`/strategies/${strategyId}/archive?problem=${encodeURIComponent(result.reason)}`);
  }
  redirect('/strategies');
}
