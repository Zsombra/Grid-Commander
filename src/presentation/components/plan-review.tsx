import type { PlanReview } from '@/application/use-cases/compile-plan.command.js';

/**
 * The review screen.
 *
 * This exists so that applying is an act performed *from* a review rather than
 * a button beside a compile button. The platform made compiling effect-free
 * precisely so a human could look first; two similar controls side by side would
 * hand that back, and the mistake would be one click wide with a fleet-sized
 * consequence. See design S-G.
 */
export function PlanReviewPanel({ review }: { review: PlanReview }) {
  const { viable, concerns, changedAxes, boundAgentCount, proposedRevision, summary } = review;

  return (
    <section aria-labelledby="review-heading" className="space-y-6">
      <div>
        <h2 id="review-heading" className="text-lg font-medium">
          Nothing has changed yet
        </h2>
        <p className="text-sm">
          BattleGrid compiled this to show you what applying would do. Your strategy
          and your agents are untouched until you apply it.
        </p>
      </div>

      <BlastRadius count={boundAgentCount} />

      <div className="space-y-1">
        <h3 className="font-medium">What would change</h3>
        {changedAxes.length === 0 ? (
          <p className="text-sm">Nothing — this plan leaves the strategy as it is.</p>
        ) : (
          <ul className="list-inside list-disc text-sm">
            {changedAxes.map((axis) => (
              <li key={axis}>{axis}</li>
            ))}
          </ul>
        )}
        {proposedRevision !== null && (
          <p className="text-sm">It would become revision {proposedRevision}.</p>
        )}
      </div>

      {concerns.length > 0 && (
        <div className="space-y-1 rounded border p-3">
          <h3 className="font-medium">
            {concerns.length} thing{concerns.length === 1 ? '' : 's'} BattleGrid wants you to know
          </h3>
          {/*
            Advisory, and said so plainly. These describe the strategy's existing
            configuration rather than this change, and the user cannot fix them
            from here — treating them as blockers would refuse ordinary edits.
          */}
          <p className="text-sm">
            These do not prevent the change. They describe how the strategy is set up.
          </p>
          <ul className="list-inside list-disc text-sm">
            {concerns.map((concern) => (
              <li key={`${concern.code}-${concern.message}`}>{concern.message}</li>
            ))}
          </ul>
        </div>
      )}

      {viable ? (
        <div className="space-y-3">
          {summary && (
            <p role="status" className="rounded border p-3 text-sm">
              {summary}
            </p>
          )}
          <form method="post" className="flex flex-wrap gap-3">
            <button type="submit" className="rounded border px-4 py-2 text-sm">
              Apply this{' '}
              {boundAgentCount !== null && boundAgentCount > 0
                ? `— reconfigures ${boundAgentCount} agent${boundAgentCount === 1 ? '' : 's'} now`
                : 'change'}
            </button>
            <a href=".." className="px-4 py-2 text-sm underline">
              Go back and change it
            </a>
          </form>
        </div>
      ) : (
        <p role="alert" className="rounded border p-3 text-sm">
          BattleGrid reports this plan as not viable, so it cannot be applied as it
          stands. Adjust the change and compile again.
        </p>
      )}
    </section>
  );
}

/**
 * The number that makes this capability different from every other one.
 *
 * Rendered as its own block rather than folded into a sentence — five bound
 * agents is a different act from zero, and it should not have to be read for.
 */
function BlastRadius({ count }: { count: number | null }) {
  if (count === null) {
    return (
      <p role="alert" className="rounded border p-3 text-sm">
        BattleGrid did not report how many agents this would reach.
      </p>
    );
  }
  if (count === 0) {
    return <p className="text-sm">No agents are bound to this strategy.</p>;
  }
  return (
    <p role="alert" className="rounded border p-3 text-sm font-medium">
      {count === 1
        ? 'One agent is bound to this strategy and will be reconfigured immediately.'
        : `${count} agents are bound to this strategy and will all be reconfigured immediately.`}{' '}
      Open positions are reported for awareness and do not block the change.
    </p>
  );
}
