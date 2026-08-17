'use client';

import { useFormStatus } from 'react-dom';
import { BUTTON_PRIMARY, BUTTON_SECONDARY } from '@/presentation/components/control.js';

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
 * ## What it does not do, and the record that disagrees
 *
 * **It does not disable itself while pending.** DT-0022 defines what `disabled`
 * looks like and explicitly refuses to say when a control enters it: styling a
 * state is presentation, entering one removes an affordance, and this product's
 * confirmation tokens are single-use with `consume` as the single atomic
 * spender — so what a second press does today is a decided behaviour, not an
 * accident to paper over.
 *
 * The consequence is worth stating plainly: pressing twice still submits twice,
 * and the second one is still refused by the guard. This component makes that
 * less likely by saying the first one is working. It does not make it
 * impossible, and it is not pretending to.
 *
 * **That is not the whole story, and the missing half was found late.**
 * `docs/checklists/UI_COMPONENT_REVIEW_CHECKLIST.md` (State & Interaction 4)
 * says "Submit controls disable while in flight" — a binding standard that
 * `design-contract.md` §2 ranks above any design ticket, and one this component
 * has contradicted since it was written. It survived because the round that
 * introduced it ran `track: lite`, which runs neither the verifier nor the
 * auditor — the two roles that read that checklist.
 *
 * So do not read the paragraphs above as "the question is open". It is
 * contested, filed as #229, and the resolution is one prop in this file either
 * way. **Do not resolve it here**: whichever way it goes, something binding has
 * to be amended, and that is a `/propose`, not a fix. DT-0027 keeps the
 * secondary treatment neutral so this decision costs nothing to make later.
 */
export function PerformButton({
  children,
  pendingLabel,
  className = '',
  weight = 'primary',
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
  /**
   * Which weight the submit wears (DT-0027). Defaults to `primary`, so the
   * seventeen call sites that predate this prop are unchanged.
   *
   * `secondary` exists for exactly one control: `/pending/[id]`'s Decline,
   * which performs — it closes a proposal permanently — while deliberately not
   * being the action the page exists to offer. Every other secondary submit in
   * the product sits in a `method="get"` form and reaches no operation, so this
   * is not a general escape hatch from the weight rule in `control.ts`.
   *
   * A prop rather than a sibling component, because the hook and the `aria-busy`
   * wiring belong in one place. A `PerformButtonSecondary` would also split the
   * two architecture scanners that watch this file: `every-perform-says-it-is-
   * working.test.ts` matches it by substring and `controls.test.ts` matches it
   * by `\b`, so it would count toward one floor and vanish from the other.
   */
  readonly weight?: 'primary' | 'secondary';
}) {
  const { pending } = useFormStatus();

  /*
    Decoration, and marked as such. The label already carries the state, so a
    reader that never sees this loses nothing — which is the test of whether an
    indicator is allowed to exist at all.

    `motion-reduce:hidden` rather than merely pausing it: a spinner frozen
    mid-rotation reads as a broken image, and the label change is the signal
    this was always resting on. `tokens.css` sets `animation-duration: 80ms`
    under reduced motion, which does not stop a spin — it accelerates it.

    The colour is the one thing the weight changes, and the rule generalises:
    **the indicator wears its label's colour** (system.json v3). On the accent
    ground that is `accent-text`; on the bordered transparent control it is
    `text-primary`. `accent-text` is white and would be invisible here;
    `accent-default` would make a working secondary louder than a resting
    primary beside it. Both names are written whole — Tailwind's scanner is
    plain text and never sees a composed class name.
  */
  const indicator = pending ? (
    <span
      aria-hidden="true"
      className={`size-4 shrink-0 animate-spin rounded-full border-2 ${
        weight === 'secondary' ? 'border-text-primary' : 'border-accent-text'
      } border-t-transparent motion-reduce:hidden`}
    />
  ) : null;

  const label = pending ? pendingLabel : children;

  /*
    Two spelled-out branches rather than one tag over a chosen constant.

    `controls.test.ts`'s WEARS_BUTTON requires a button's className to read
    literally `className={BUTTON_X}` or a template interpolating exactly
    `${BUTTON_PRIMARY}` / `${BUTTON_SECONDARY}`. Hoisting the treatment into a
    variable — `${treatment}`, a ternary, a lookup map — makes this file an
    offender against the very scan that exists to catch a button styled by
    hand. The duplication is the tag alone; the indicator and the label are
    shared above, which is the part worth not repeating.

    `BUTTON_SECONDARY` already carries `inline-flex items-center justify-center`
    (it is worn by anchors, which do not centre their own text), so the
    secondary branch adds only the gap.
  */
  if (weight === 'secondary') {
    return (
      <button
        type="submit"
        aria-busy={pending}
        className={`${BUTTON_SECONDARY} gap-2 ${className}`}
      >
        {indicator}
        {label}
      </button>
    );
  }

  return (
    <button
      type="submit"
      aria-busy={pending}
      className={`${BUTTON_PRIMARY} inline-flex items-center justify-center gap-2 ${className}`}
    >
      {indicator}
      {label}
    </button>
  );
}
