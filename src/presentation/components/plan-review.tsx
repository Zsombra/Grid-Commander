import type { PlanReview } from '@/application/use-cases/compile-plan.command.js';
import { BUTTON_PRIMARY, BUTTON_SECONDARY } from './control.js';

/**
 * The review screen.
 *
 * This exists so that applying is an act performed *from* a review rather than
 * a button beside a compile button. The platform made compiling effect-free
 * precisely so a human could look first; two similar controls side by side would
 * hand that back, and the mistake would be one click wide with a fleet-sized
 * consequence. See design S-G.
 *
 * Styled per DT-0002. The visual hierarchy is the point: this panel says what a
 * change reaches before it says anything else, and the weight has to agree with
 * that ordering or the ordering is decorative. Three token roles carry it —
 * `consequence` for what reaches live agents, `notice` for advisory, `quiet` for
 * nothing-has-happened-yet.
 */
export function PlanReviewPanel({
  review,
  action,
  changeIt,
  confirmation,
  applyBlockedBecause,
}: {
  review: PlanReview;
  /**
   * Applying the reviewed plan. Required: this button reconfigures every agent
   * bound to the strategy, and it spent the life of the project attached to
   * nothing at all.
   */
  action: (formData: FormData) => Promise<void>;
  /**
   * Where "go back and change it" goes. **Required, and absolute.**
   *
   * It used to be `href=".."`, which does not resolve to what the label promises:
   * from `/strategies/<id>/edit` a relative `..` resolves to `/strategies/` — the
   * roster. So the one control offering to *change* the composed plan discarded
   * it and landed the user on a list of thirty-seven, and the copy said otherwise.
   *
   * Required rather than defaulted so no caller can silently inherit a guess.
   */
  changeIt: string;
  /**
   * What the apply needs to carry. Absent when the apply was refused before it
   * could be offered — the review still renders, without a button.
   */
  confirmation?: {
    readonly strategyId: string;
    readonly confirmationToken: string;
    readonly consequence: string;
  };
  /** Why applying is unavailable, when it is. Always a reason the user can act on. */
  applyBlockedBecause?: string;
}) {
  const { viable, concerns, changedAxes, boundAgentCount, proposedRevision, summary } = review;

  return (
    <section aria-labelledby="review-heading" className="space-y-5">
      <div>
        {/* First in reading order, and sized like a heading rather than a
            reassurance. This is the sentence that makes an effect-free compile
            legible as effect-free. */}
        <h2 id="review-heading" className="text-xl font-medium text-text-primary">
          Nothing has changed yet
        </h2>
        <p className="mt-1 text-base text-text-secondary">
          BattleGrid compiled this to show you what applying would do. Your strategy
          and your agents are untouched until you apply it.
        </p>
      </div>

      <BlastRadius count={boundAgentCount} />

      <div className="rounded-gc-2 border border-border-subtle bg-bg-raised p-4">
        <h3 className="font-medium text-text-primary">What would change</h3>
        {changedAxes.length === 0 ? (
          // Never an empty list. A compile that changes nothing is a real and
          // useful outcome, and it needs a sentence of its own to read as one.
          <p className="mt-2 text-base text-text-secondary">
            Nothing — this plan leaves the strategy as it is.
          </p>
        ) : (
          <ul className="mt-2 list-inside list-disc space-y-2 text-base text-text-primary">
            {changedAxes.map((axis) => (
              <li key={axis}>{axis}</li>
            ))}
          </ul>
        )}
        {proposedRevision !== null && (
          <p className="mt-2 text-sm text-text-secondary">
            It would become revision {proposedRevision}.
          </p>
        )}
      </div>

      {concerns.length > 0 && (
        /*
          Advisory, and said so plainly. These describe the strategy's existing
          configuration rather than this change, and the user cannot fix them
          from here — treating them as blockers would refuse ordinary edits.

          Deliberately `notice` and never `danger`: a one-word tagline edit can
          come back with two of these while `viable` is true, and styling them as
          failures would train people to abandon work that is fine.
        */
        <div className="rounded-gc-2 border border-notice-border bg-notice-subtle p-4">
          <h3 className="font-medium text-text-primary">
            {concerns.length} thing{concerns.length === 1 ? '' : 's'} BattleGrid wants you to know
          </h3>
          <p className="mt-1 text-sm text-text-secondary">
            These do not prevent the change. They describe how the strategy is set up.
          </p>
          <ul className="mt-2 list-inside list-disc space-y-2 text-base text-text-primary">
            {concerns.map((concern) => (
              <li key={`${concern.code}-${concern.message}`}>{concern.message}</li>
            ))}
          </ul>
        </div>
      )}

      {viable && confirmation ? (
        <div className="space-y-3">
          {summary && (
            <p
              role="status"
              className="rounded-gc-2 border border-quiet-border bg-quiet-subtle p-4 text-base text-text-primary"
            >
              {summary}
            </p>
          )}
          {/* BattleGrid's own words for what this does, stored with the token so
              the audit can prove what was shown. Rendered in full: no
              truncation, no disclosure, no paraphrase. */}
          <p
            role="alert"
            className="rounded-gc-2 border border-consequence-border bg-consequence-subtle p-4 text-base text-text-primary"
          >
            {confirmation.consequence}
          </p>
          <form action={action} className="flex flex-col gap-3 tablet:flex-row tablet:items-center">
            <input type="hidden" name="strategyId" value={confirmation.strategyId} />
            <input type="hidden" name="confirmationToken" value={confirmation.confirmationToken} />
            {/* The reviewed plan itself, carried rather than recompiled. Altering
                it changes its digest, the confirmation stops matching, and the
                write is refused before it reaches BattleGrid. */}
            <input type="hidden" name="plan" value={JSON.stringify(review.plan)} />
            {/*
              Not danger-styled, deliberately. Applying is the legitimate purpose
              of this page, and a user who has read the review is doing the right
              thing; styling it as a hazard teaches people to flinch at the
              correct action. The weight lives on the consequence above it.
            */}
            <button type="submit" className={BUTTON_PRIMARY}>
              Apply this{' '}
              {boundAgentCount !== null && boundAgentCount > 0
                ? `— reconfigures ${boundAgentCount} agent${boundAgentCount === 1 ? '' : 's'} now`
                : 'change'}
            </button>
            {/* A visible peer of Apply, not a footnote. Going back is the
                expected outcome of a review that surprised the user. */}
            <a href={changeIt} className={BUTTON_SECONDARY}>
              Go back and change it
            </a>
          </form>
        </div>
      ) : (
        /* No control at all — nothing dimmed, nothing to click at. Retrying from
           here cannot help, and a disabled-looking button would suggest it
           might. */
        <p
          role="alert"
          className="rounded-gc-2 border border-notice-border bg-notice-subtle p-4 text-base text-text-primary"
        >
          {applyBlockedBecause ??
            'BattleGrid reports this plan as not viable, so it cannot be applied as it ' +
              'stands. Adjust the change and compile again.'}
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
 *
 * The three cases are visually distinct on purpose, and `null` is not `0`:
 * where BattleGrid declined to tell us, rendering that as "none" would
 * understate the risk, so it keeps the block treatment and only the tone
 * changes.
 */
function BlastRadius({ count }: { count: number | null }) {
  if (count === null) {
    return (
      <p
        role="alert"
        className="rounded-gc-2 border border-l-4 border-notice-border border-l-notice-default bg-notice-subtle p-4 text-base text-text-primary"
      >
        BattleGrid did not report how many agents this would reach.
      </p>
    );
  }
  if (count === 0) {
    // No border, no fill. Zero bound agents is genuinely unremarkable, and it is
    // that contrast which gives the loaded case its meaning.
    return <p className="text-sm text-text-secondary">No agents are bound to this strategy.</p>;
  }
  return (
    <div
      role="alert"
      className="rounded-gc-2 border border-l-4 border-consequence-border border-l-consequence-default bg-consequence-subtle p-4"
    >
      <p className="text-xl font-semibold text-text-primary">
        {count === 1 ? 'One agent' : `${count} agents`}
      </p>
      <p className="mt-1 text-base text-text-primary">
        {count === 1
          ? 'is bound to this strategy and will be reconfigured immediately.'
          : 'are bound to this strategy and will all be reconfigured immediately.'}
      </p>
      <p className="mt-2 text-sm text-text-secondary">
        Open positions are reported for awareness and do not block the change.
      </p>
    </div>
  );
}
