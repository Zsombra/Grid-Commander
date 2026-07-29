import type { ForkAvailability, StrategyListing } from '@/application/use-cases/list-strategies.query.js';
import type { StrategyListResult } from '@/ports/strategies.js';
import { WhyNotLoaded } from './why-not-loaded.js';

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
        <WhyNotLoaded cause={result.cause} subject="they are" />
      </div>
    );
  }

  /**
   * Not a length check, deliberately.
   *
   * The use case hands this branch down from where BattleGrid was actually read.
   * An account with no strategies and one whose catalog failed to load are both
   * an empty list to a component, and only one of them is true — telling the
   * second user they own nothing is how someone recreates work they already
   * have. The branch above says the strategies are not gone; this one says there
   * are none, and the difference has to survive all the way to the screen.
   */
  if (result.kind === 'empty') {
    return (
      <div className="space-y-3">
        <p className="text-base text-text-primary">
          Nothing is listed here — not even BattleGrid&rsquo;s own catalog.
        </p>
        {/*
          No next action, deliberately.

          `list_strategies` returns the visible SYSTEM catalog *and* the private
          strategies you own, so an empty result means there is nothing to fork
          from either. "Start by forking one of BattleGrid's" would point at
          something that was not returned — the affordance-leading-nowhere
          mistake this product already fixed once, and worse here because it
          would read as reassurance.
        */}
        <p className="text-base text-text-secondary">
          A catalog usually shows BattleGrid&rsquo;s strategies alongside any you
          own, so this is unexpected rather than a starting point. Your account
          is connected and nothing here has failed — there is simply nothing to
          show.
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
        {listings.map(({ strategy, governs, editable, fork }) => (
          <li key={strategy.id} className="rounded border p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              {/* The name is the way in. Every row offered only actions before
                  this — four things to do to a strategy and no way to look at
                  one, because until `get_strategy` there was nothing to show. */}
              <h3 className="font-medium">
                <a href={`/strategies/${strategy.id}`} className="underline">
                  {strategy.name}
                </a>
              </h3>
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
                {fork.kind === 'offered' && (
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
                {fork.kind === 'withheld' && (
                  // Where the control would have been, not only at the top of
                  // the page. Twelve of these read as a screen that knows why it
                  // is offering nothing; twelve gaps read as one that forgot.
                  <li className="text-text-secondary">{fork.because}</li>
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
