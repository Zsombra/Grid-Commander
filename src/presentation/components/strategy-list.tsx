import type { ForkAvailability, StrategyListing } from '@/application/use-cases/list-strategies.query.js';
import type { StrategyListResult } from '@/ports/strategies.js';

/**
 * The strategy roster.
 *
 * Every entry says what it governs. A strategy is never an isolated object in
 * this product: editing one reconfigures every agent bound to it, and the count
 * belongs where the user first meets the strategy rather than only in the
 * confirmation, by which point they have already decided.
 */
export function StrategyList({
  result,
  listings,
  forking,
}: {
  result: StrategyListResult;
  listings: readonly StrategyListing[];
  forking: ForkAvailability;
}) {
  if (result.kind === 'unreadable') {
    return (
      <div role="alert" className="rounded border p-4 text-sm">
        <p className="font-medium">Your strategies could not be loaded.</p>
        <p className="mt-1">{result.reason}</p>
        <p className="mt-2">
          This does not mean they are gone — Grid-Commander could not reach BattleGrid
          to ask.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {forking.kind === 'at-capacity' && (
        <p role="status" className="rounded border p-3 text-sm">
          {forking.explanation}
        </p>
      )}

      <ul className="space-y-3">
        {listings.map(({ strategy, governs, editable, forkToEdit }) => (
          <li key={strategy.id} className="rounded border p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-medium">{strategy.name}</h3>
              <span className="text-xs uppercase">
                {strategy.scope === 'SYSTEM' ? 'BattleGrid' : 'Yours'} · revision {strategy.revision}
              </span>
            </div>
            {strategy.tagline && <p className="mt-1 text-sm">{strategy.tagline}</p>}

            {/* The blast radius, on the roster, before anything is opened. */}
            <p className={`mt-2 text-sm ${strategy.boundAgentCount > 0 ? 'font-medium' : ''}`}>
              {governs}
            </p>

            <nav aria-label={`Actions for ${strategy.name}`} className="mt-3">
              <ul className="flex flex-wrap gap-3 text-sm">
                {editable && (
                  <li>
                    <a href={`/strategies/${strategy.id}/edit`} className="underline">
                      Edit
                    </a>
                  </li>
                )}
                {forkToEdit && (
                  <li>
                    {/*
                      A platform strategy is not editable, and offering an edit
                      would promise something BattleGrid refuses. The honest
                      action is the one that works.
                    */}
                    <a href={`/strategies/${strategy.id}/fork`} className="underline">
                      Make my own copy to edit
                    </a>
                  </li>
                )}
                {editable && (
                  <li>
                    <a href={`/strategies/${strategy.id}/archive`} className="underline">
                      Archive
                    </a>
                  </li>
                )}
                {!strategy.isActive && (
                  <li>
                    <a href={`/strategies/${strategy.id}/restore`} className="underline">
                      Restore
                    </a>
                  </li>
                )}
              </ul>
            </nav>
          </li>
        ))}
      </ul>
    </div>
  );
}
