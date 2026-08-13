import { PerformButton } from '@/presentation/components/perform-button.js';
import { redirect } from 'next/navigation';
import { acting } from '@/presentation/session.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { WhyNotLoaded } from '@/presentation/components/why-not-loaded.js';
import { BUTTON_SECONDARY } from '@/presentation/components/control.js';
import { REPAIR_REQUIRED_GUIDANCE } from '@/application/use-cases/strategy-lifecycle.command.js';
import { requiredText } from '@/presentation/form.js';
import { CarriedProblem } from '@/presentation/components/carried-problem.js';

/**
 * Bring an archived strategy back.
 *
 * The state worth building this page carefully for is `repair-required`. It is
 * not an error: BattleGrid is saying the strategy as stored no longer matches
 * what the platform accepts, so it stays archived and the way forward is the
 * RESTORE arm of the compile pipeline. Rendering it as a failure would tell the
 * user to retry something that will never work.
 */
export default async function RestoreStrategyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ outcome?: string; problem?: string }>;
}) {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const { id } = await params;
  const { outcome, problem } = await searchParams;
  const { result, listings } = await app.listStrategies.execute(user.authority);

  if (result.kind === 'unreadable') {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">Could not load this strategy</h1>
        {/* A bounced submit rode in with its reason; this branch must not eat
            it — it is the only record of what the click did (or did not) do. */}
        <CarriedProblem problem={problem} />
        <p role="alert" className="rounded-gc-2 border border-danger-default bg-danger-subtle p-4 text-sm text-text-primary">{result.reason}</p>
        {/* An archived strategy is the one a user most readily believes has
            been deleted, so the sentence carries the most weight here. */}
        <WhyNotLoaded cause={result.cause} subject="this strategy is" />
        {/* The roster, not the strategy. Nothing here can claim the strategy is
            there to go back to — the read that would have said so is the one
            that failed. The list explains why. */}
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

  const { strategy } = listing;

  // State before address. A `?outcome=repair-required` bookmark outlives the
  // state it described: opened after the strategy was restored it said
  // "needs rebuilding" about something already active, with the state read
  // sitting right here unconsulted. Whatever is true now wins.
  if (strategy.isActive) {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">Cannot restore</h1>
        <CarriedProblem problem={problem} />
        <p role="alert" className="text-sm">{strategy.name} is not archived.</p>
        <p className="text-sm">
          <a href={`/strategies/${strategy.id}`} className="underline">
            Back to {strategy.name}
          </a>
        </p>
      </main>
    );
  }

  if (outcome === 'repair-required') {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">{strategy.name} needs rebuilding first</h1>
        <CarriedProblem problem={problem} />
        {/* role="status", not "alert": nothing failed. The platform declined and
            said what would work instead. */}
        <p role="status" className="rounded-gc-2 border border-border-default p-4 text-sm">
          {REPAIR_REQUIRED_GUIDANCE}
        </p>
        <p className="flex flex-wrap gap-3 text-sm">
          <a href={`/strategies/${strategy.id}/edit`} className="underline">
            Compile a change for it
          </a>
          {/* Rebuilding is the way forward, not the only way out. */}
          <a href={`/strategies/${strategy.id}`} className="underline">
            Back to {strategy.name}
          </a>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-xl font-medium">Restore {strategy.name}?</h1>
      <CarriedProblem problem={problem} />
      <p className="text-sm">
        It returns to your strategies, editable, at revision {strategy.revision}.
        No agent is bound to an archived strategy, so nothing is reconfigured by
        restoring it.
      </p>
      <p className="text-sm">
        BattleGrid may decline if its configuration no longer matches what the
        platform accepts. If it does, it stays archived and says what to do.
      </p>
      <form action={restoreStrategy} className="flex flex-wrap gap-3">
        <input type="hidden" name="strategyId" value={strategy.id} />
        <PerformButton pendingLabel={`Restoring ${strategy.name}…`}>
          Restore {strategy.name}
        </PerformButton>
        {/* The strategy, not the roster — declining leaves the user where they
            were rather than at the top of a list of seventeen. */}
        <a href={`/strategies/${strategy.id}`} className={BUTTON_SECONDARY}>
          Leave it archived
        </a>
      </form>
    </main>
  );
}

export async function restoreStrategy(formData: FormData) {
  'use server';
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
