/**
 * How a form control looks, in one place.
 *
 * Every input, select and textarea in this product was
 * `w-full rounded border p-2` — seven byte-identical copies, none touching a
 * token. `border` resolved to Tailwind's default grey and the background stayed
 * the browser's, which is white, so in dark mode each control was a white box
 * beside panels that *were* themed. Not illegible; worse than that. It read as
 * an element that did not belong to the page, and next to a themed panel it
 * looked disabled.
 *
 * A constant rather than a component, because the three element types take
 * different props and different validation attributes — wrapping them would mean
 * a component that mostly forwards, and the thing worth sharing is the
 * treatment. A constant rather than seven copies, because seven copies of a
 * *token-based* className is the same defect one layer along: four files that
 * can disagree, invisibly, until someone notices one form looks different.
 *
 * `focus-visible` rather than `focus`, so a mouse click does not draw a ring a
 * keyboard user needs. The `focus` token has existed in `system.json` since
 * DT-0001 and was referenced by nothing until now.
 */
export const CONTROL =
  'w-full rounded-gc-2 border border-border-default bg-bg-raised p-2 ' +
  'text-base text-text-primary ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus';
