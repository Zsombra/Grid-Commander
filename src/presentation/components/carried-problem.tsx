/**
 * The reason a bounced write carried back, rendered wherever the page lands.
 *
 * A perform that is refused redirects to the surface it was acted from with
 * `?problem=<reason>`. That reason is the only record of what the click did,
 * and it has to survive *whichever* branch renders next — including the ones
 * that report a fresh failure of their own, because "the roster would not load"
 * and "your archive was refused because the revision moved" are two different
 * facts and the operator is owed both.
 *
 * Held in one component for the reason `WhyNotLoaded` is: fifteen hand-rolled
 * copies of a paragraph drift, and the branch that gets forgotten is never the
 * one anybody is looking at. Rendering nothing when there is no problem is the
 * point — every branch can mount it unconditionally, so "did this branch
 * remember?" stops being a question a reader has to answer per branch.
 *
 * It drifted before this was extracted, exactly as predicted: five copies were
 * byte-equal, `/pending` had lost the "Refused:" prefix, and the agent detail
 * page rendered a refusal in the *consequence* role — on a branch nothing could
 * reach any more.
 *
 * `null` as well as `undefined`, deliberately. Callers get their reason from
 * `searchParams` (undefined when absent) or from a parsed query (null), and a
 * shared component that refuses one of them is a shared component someone
 * quietly writes their own copy of instead. That is the whole failure this
 * exists to stop, so the prop absorbs the difference rather than exporting it.
 */
export function CarriedProblem({ problem }: { problem: string | null | undefined }) {
  if (!problem) return null;

  return (
    <p
      role="alert"
      className="rounded-gc-2 border border-danger-default bg-danger-subtle p-4 text-sm text-text-primary"
    >
      {/* Named as well as tinted — DT-0004's ruling for a bounced attempt. */}
      <span className="font-semibold">Refused: </span>
      {problem}
    </p>
  );
}
