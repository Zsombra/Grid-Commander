'use client';

import { useFormStatus } from 'react-dom';
import { BUTTON_PRIMARY } from '@/presentation/components/control.js';

/**
 * The submit on a ceremony page, which says when it is working.
 *
 * Every confirmation in this product posts to a server action and then sits
 * there. Between the click and the redirect nothing moves, so a slow platform
 * and a dead button look identical, and the honest response to that is to press
 * it again. Eleven surface manifests recorded the same sentence — "No
 * pending/loading state between click and redirect" — before anything was done
 * about it (#153).
 *
 * **The second client component in this product**, and it earns that the same
 * way `SectionNav` does: `useFormStatus` is the only way a form can know it is
 * submitting, and the fact is genuinely client-side — it becomes true after
 * hydration, with a request in flight. There is no server-rendered equivalent
 * to fall back to, which is also why a test reaches it by mocking the hook
 * rather than by rendering harder (`tests/rendering/support/form-status.ts`).
 *
 * ## What it deliberately does not do
 *
 * **It does not disable itself while pending.** DT-0022 defines what `disabled`
 * looks like and explicitly refuses to say when a control enters it: styling a
 * state is presentation, entering one removes an affordance, and this product's
 * confirmation tokens are single-use with `consume` as the single atomic
 * spender — so what a second press does today is a decided behaviour, not an
 * accident to paper over. Changing it is #153's to propose.
 *
 * The consequence is worth stating plainly: pressing twice still submits twice,
 * and the second one is still refused by the guard. This component makes that
 * less likely by saying the first one is working. It does not make it
 * impossible, and it is not pretending to.
 */
export function PerformButton({
  children,
  pendingLabel,
  className = '',
}: {
  /** The resting label. */
  readonly children: React.ReactNode;
  /**
   * The same sentence in its progressive form — "Archiving…" for "Archive it".
   *
   * Required, and per-surface on purpose. A generic "Working…" would be one
   * wording for eleven different consequences, and the label is the part a
   * screen reader announces: it is the state's carrier, not its decoration.
   */
  readonly pendingLabel: string;
  /** Row-level sizing from the surface — `w-full tablet:w-auto` and the like. */
  readonly className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      aria-busy={pending}
      className={`${BUTTON_PRIMARY} inline-flex items-center justify-center gap-2 ${className}`}
    >
      {/*
        Decoration, and marked as such. The label already carries the state, so
        a reader that never sees this loses nothing — which is the test of
        whether an indicator is allowed to exist at all.

        `motion-reduce:hidden` rather than merely pausing it: a spinner frozen
        mid-rotation reads as a broken image, and the label change is the
        signal this was always resting on.
      */}
      {pending ? (
        <span
          aria-hidden="true"
          className="size-4 shrink-0 animate-spin rounded-full border-2 border-accent-text border-t-transparent motion-reduce:hidden"
        />
      ) : null}
      {pending ? pendingLabel : children}
    </button>
  );
}
