import { redirect } from 'next/navigation';
import { acting } from '@/presentation/session.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { REPAIR_REQUIRED_GUIDANCE } from '@/application/use-cases/strategy-lifecycle.command.js';
import { requiredText } from '@/presentation/form.js';

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
  searchParams: Promise<{ outcome?: string }>;
}) {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const { id } = await params;
  const { outcome } = await searchParams;
  const { result, listings } = await app.listStrategies.execute(user.authority);

  if (result.kind === 'unreadable') {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">Could not load this strategy</h1>
        <p role="alert" className="text-sm">{result.reason}</p>
      </main>
    );
  }

  const listing = listings.find((l) => l.strategy.id === id);
  if (!listing) {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">No such strategy</h1>
        <p className="text-sm">
          <a href="/strategies" className="underline">Back to your strategies</a>
        </p>
      </main>
    );
  }

  const { strategy } = listing;

  if (outcome === 'repair-required') {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">{strategy.name} needs rebuilding first</h1>
        {/* role="status", not "alert": nothing failed. The platform declined and
            said what would work instead. */}
        <p role="status" className="rounded border p-4 text-sm">
          {REPAIR_REQUIRED_GUIDANCE}
        </p>
        <p className="text-sm">
          <a href={`/strategies/${strategy.id}/edit`} className="underline">
            Compile a change for it
          </a>
        </p>
      </main>
    );
  }

  if (strategy.isActive) {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">Cannot restore</h1>
        <p role="alert" className="text-sm">{strategy.name} is not archived.</p>
        <p className="text-sm">
          <a href="/strategies" className="underline">Back to your strategies</a>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-xl font-medium">Restore {strategy.name}?</h1>
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
        <button type="submit" className="rounded border px-4 py-2 text-sm">
          Restore {strategy.name}
        </button>
        <a href="/strategies" className="px-4 py-2 text-sm underline">
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
  const { listings } = await app.listStrategies.execute(user.authority);
  const listing = listings.find((l) => l.strategy.id === strategyId);
  if (!listing) redirect('/strategies');

  const result = await app.setStrategyActive.execute({
    ...user.authority,
    strategy: listing.strategy,
    active: true,
  });

  // `repair-required` comes back as its own case rather than an error, and is
  // carried to the page so it can be explained rather than thrown away.
  redirect(
    result.kind === 'repair-required'
      ? `/strategies/${strategyId}/restore?outcome=repair-required`
      : '/strategies',
  );
}
