import { acting } from '@/presentation/session.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { StrategyDetailView } from '@/presentation/components/strategy-detail.js';
import { WhyNotLoaded } from '@/presentation/components/why-not-loaded.js';

/**
 * One strategy, in full.
 *
 * The route that was missing. Agents have had a detail page since they were
 * built; strategies had `edit`, `fork`, `archive` and `restore` — four things
 * you could do to a strategy and nowhere to look at one. That was not an
 * oversight in the surface: `list_strategies` returns a `sectionCount` and
 * nothing else, so until `get_strategy` was wired there was nothing to show.
 */
export default async function StrategyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const result = await app.readStrategy.execute({ ...user.authority, strategyId: id });

  if (result.kind === 'unreadable') {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-6">
        <h1 className="text-xl font-medium text-text-primary">
          This strategy could not be loaded.
        </h1>
        <p role="alert" className="text-sm text-text-primary">
          {result.reason}
        </p>
        <WhyNotLoaded cause={result.cause} subject="it is" />
      </main>
    );
  }

  if (result.kind === 'missing') {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-6">
        <h1 className="text-xl font-medium text-text-primary">No such strategy</h1>
        {/* Distinct from the branch above on purpose. "We could not ask" and
            "it is not there" are different facts, and only one of them means
            the user should stop looking. */}
        <p className="text-base text-text-secondary">
          BattleGrid has no strategy with this id that this account can see. It
          may have been deleted, or it may belong to someone else.
        </p>
        <p className="text-base">
          <a href="/strategies" className="underline">
            Back to strategies
          </a>
        </p>
      </main>
    );
  }

  const { detail, can } = result;
  const { summary } = detail;

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <StrategyDetailView detail={detail} />

      <nav aria-label={`Actions for ${summary.name}`}>
        <ul className="flex flex-wrap gap-3 text-sm">
          {can.editable && (
            <li>
              <a href={`/strategies/${summary.id}/edit`} className="underline">
                Edit
              </a>
            </li>
          )}
          {can.forkToEdit && (
            <li>
              <a href={`/strategies/${summary.id}/fork`} className="underline">
                Make my own copy to edit
              </a>
            </li>
          )}
          {can.editable && (
            <li>
              <a href={`/strategies/${summary.id}/archive`} className="underline">
                Archive
              </a>
            </li>
          )}
          {can.restorable && (
            <li>
              <a href={`/strategies/${summary.id}/restore`} className="underline">
                Restore
              </a>
            </li>
          )}
          <li>
            <a href="/strategies" className="underline">
              Back to strategies
            </a>
          </li>
        </ul>
      </nav>
    </main>
  );
}
