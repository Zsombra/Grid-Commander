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
  'text-base font-normal text-text-primary ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus';

/**
 * How a button looks, in the two weights the design system actually decided.
 *
 * Both strings are lifted byte-for-byte from `plan-review.tsx`, which is where
 * DT-0002 landed them: *"the apply button uses button/primary on
 * color.accent.default"*, and *"'Go back and change it' is rendered as
 * button/secondary … a visible peer, never a text link lost beneath the
 * button"*. That surface was rendered and screenshotted in both colour schemes;
 * nothing here is a new opinion, and the one page anybody looked at renders the
 * same afterwards.
 *
 * Which button gets which: **primary is the action the page exists to offer;
 * secondary is its peer and every submit that only asks a question.** The second
 * clause is not a judgement call — a `method="get"` form composes a preview and
 * reaches no operation, a distinction `reachability.test.ts` already leans on in
 * six places, so this borrows it rather than inventing a second rule that can
 * disagree with it.
 *
 * Nothing is styled as danger, including archive and rebind. DT-0002's reasoning
 * points here directly: styling the legitimate action as a hazard teaches people
 * to flinch at the correct one, and the weight belongs on the consequence block
 * these pages already render in BattleGrid's own words.
 *
 * `min-h-11` is 44px, the tap-target floor `system.json` states as a principle
 * and gives no token for — its space scale is 32px then 48px. DT-0002 reached
 * the same wall and spent the same utility. The alternative was a raw `44px` in
 * a className, which the design contract forbids for good reason. Filed as
 * `the-button-primitive-has-no-tokens`.
 *
 * `BUTTON_SECONDARY` carries `inline-flex` and its centring because it is worn
 * by anchors as often as by buttons — the cancel beside a commit is an `<a>`,
 * and a link does not centre its own text inside a 44px box.
 *
 * No focus treatment on either: `globals.css` declares one ring for every
 * interactive element, so repeating it here would be a second place to forget.
 */
export const BUTTON_PRIMARY =
  'min-h-11 rounded-gc-2 bg-accent-default px-4 py-2 ' +
  'text-base font-medium text-accent-text ' +
  'transition-colors duration-fast hover:bg-accent-hover';

export const BUTTON_SECONDARY =
  'inline-flex min-h-11 items-center justify-center rounded-gc-2 ' +
  'border border-border-default px-4 py-2 text-base text-text-primary';

/**
 * How the name of a field looks.
 *
 * Five spellings across the product — `block text-sm font-medium`, `block text-sm
 * text-text-primary`, `block text-sm`, `block`, `min-w-64` — for one thing. The
 * colour is stated rather than inherited for the reason `CONTROL` states its
 * background: inheriting works until something between it and the body sets a
 * colour, and then it is wrong somewhere nobody is looking.
 *
 * Only for a label that *names* a control. A label wrapping a checkbox with its
 * text after it is an inline row, and `block` would break it.
 */
export const LABEL = 'block text-sm font-medium text-text-primary';
