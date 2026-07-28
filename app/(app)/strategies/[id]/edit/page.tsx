import { acting } from '@/presentation/session.js';
import { PlanReviewPanel } from '@/presentation/components/plan-review.js';
import { NotConnected } from '@/presentation/require-connection.js';

/**
 * Compose a change, compile it, and review what applying would do.
 *
 * Compiling on this page produces the review panel. There is no control here
 * that applies — applying is an action on a review, reached only by compiling
 * first, because the platform made compiling effect-free so a human could look
 * before committing. See S-G.
 */
export default async function EditStrategyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tagline?: string }>;
}) {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const { id } = await params;
  const { tagline } = await searchParams;

  const vocabulary = await app.readVocabulary.execute(user.authority);
  if (!vocabulary.composable) {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">Cannot edit this strategy right now</h1>
        <p role="alert" className="text-sm">
          The vocabulary a strategy is composed from comes from BattleGrid, and it
          could not be read. Composing a change without it would mean guessing at
          values the platform will reject.
        </p>
      </main>
    );
  }

  const { result } = await app.listStrategies.execute(user.authority);
  const strategy = result.kind === 'strategies' ? result.strategies.find((s) => s.id === id) : undefined;
  if (!strategy) {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">No such strategy</h1>
        <p className="text-sm">
          <a href="/strategies" className="underline">Back to your strategies</a>
        </p>
      </main>
    );
  }

  if (!tagline) {
    return (
      <main className="mx-auto max-w-2xl space-y-6 p-6">
        <div>
          <h1 className="text-xl font-medium">Edit {strategy.name}</h1>
          <p className="mt-1 text-sm font-medium">
            {strategy.boundAgentCount === 0
              ? 'No agents are bound to this strategy.'
              : `${strategy.boundAgentCount} agent${strategy.boundAgentCount === 1 ? '' : 's'} would be reconfigured by an applied change.`}
          </p>
        </div>
        <form method="get" className="space-y-3">
          <label htmlFor="tagline" className="block text-sm font-medium">Tagline</label>
          <input
            id="tagline"
            name="tagline"
            type="text"
            defaultValue={strategy.tagline ?? ''}
            className="w-full rounded border p-2"
          />
          <button type="submit" className="rounded border px-4 py-2 text-sm">
            Compile — see what this would do, without doing it
          </button>
        </form>
      </main>
    );
  }

  const compiled = await app.compilePlan.execute({
    ...user.authority,
    request: {
      operation: 'UPDATE',
      strategyId: id,
      expectedRevision: strategy.revision,
      intentSummary: `Change the tagline of ${strategy.name}`,
      assumptions: ['Only the tagline changes'],
      coinSelection: { mode: 'ranked', limit: 9 },
      tagline,
    },
  });

  if (compiled.kind === 'rejected') {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">BattleGrid could not compile this</h1>
        <p role="alert" className="text-sm">{compiled.reason}</p>
        <p className="text-sm">Nothing was changed.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-xl font-medium">Review: {strategy.name}</h1>
      <PlanReviewPanel review={compiled.review} />
    </main>
  );
}
