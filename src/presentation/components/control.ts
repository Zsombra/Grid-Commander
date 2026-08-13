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
 * How a checkbox looks — which is to say, almost entirely how the browser
 * draws it, tinted with the product's accent instead of the platform default
 * (DT-0015). `accent-color` is the whole treatment on purpose: replacing the
 * native box means re-implementing its checked, indeterminate, disabled and
 * forced-colors states for a control the browser already renders correctly.
 * A checkbox never wears `CONTROL` — that string is a text box's clothes.
 */
export const CHECKBOX = 'accent-accent-default';

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
 * `min-h-control` is 44px, the tap-target floor `system.json` states as a
 * principle — and, since DT-0003, finally provides as a token
 * (`size.control.min`, emitted by `generate-theme.mjs`). DT-0002 and the first
 * cut of these constants spent Tailwind's `min-h-11` because the space scale
 * ran 32px then 48px and nothing was 44; that gap was filed as
 * `the-button-primitive-has-no-tokens` and this is its closure.
 *
 * `BUTTON_SECONDARY` carries `inline-flex` and its centring because it is worn
 * by anchors as often as by buttons — the cancel beside a commit is an `<a>`,
 * and a link does not centre its own text inside a 44px box.
 *
 * No focus treatment on either: `globals.css` declares one ring for every
 * interactive element, so repeating it here would be a second place to forget.
 *
 * Hover and active are DT-0004's. Secondary responds to the pointer — border
 * to `border.strong`, background to `bg.sunken` — because an anchor that
 * changes nothing on pointer-over reads as inert text in a box. Active on both
 * holds the hover colour at `duration-instant`: a press reads as immediate,
 * never animated.
 */
export const BUTTON_PRIMARY =
  'min-h-control rounded-gc-2 bg-accent-default px-4 py-2 ' +
  'text-base font-medium text-accent-text ' +
  'transition-colors duration-fast hover:bg-accent-hover ' +
  'active:bg-accent-hover active:duration-instant ' +
  // DT-0022. Stated colours rather than an opacity: dimming a control that sits
  // on an already-tinted panel fades it against the panel instead of against
  // the page, and `text.disabled` is a value the system decided where an
  // opacity is whatever falls out. `cursor-not-allowed` is the second signal —
  // colour alone never carries a state (system.json principle).
  //
  // Defining the treatment is not the same as entering it. Nothing in this
  // product disables a submit while it is in flight; that removes an affordance
  // and is #153's question for /propose, not a styling decision.
  'disabled:cursor-not-allowed disabled:bg-bg-sunken disabled:text-text-disabled ' +
  'disabled:border disabled:border-border-subtle disabled:hover:bg-bg-sunken';

/**
 * DT-0027 adds nothing here, and that is the treatment rather than an omission.
 *
 * The secondary weight's loading state keeps its `border.default` edge and its
 * `text.primary` label unchanged — a working control is still the control, and
 * this one has no ground to hold the way `BUTTON_PRIMARY` holds its accent. The
 * whole visible change is the progressive label and the indicator, both of which
 * live in `perform-button.tsx`.
 *
 * There is also nowhere to put a rule: `disabled` is a CSS pseudo-class, so
 * DT-0022 could hang `disabled:` variants off this string. "Loading" is not one.
 * It is a fact the component knows from `useFormStatus` and nothing a stylesheet
 * can select. Written down because a reader comparing the two constants will
 * otherwise find `BUTTON_PRIMARY` carrying state rules and this one carrying
 * none, and conclude the secondary was forgotten.
 */
export const BUTTON_SECONDARY =
  'inline-flex min-h-control items-center justify-center rounded-gc-2 ' +
  'border border-border-default px-4 py-2 text-base text-text-primary ' +
  'transition-colors duration-fast hover:border-border-strong hover:bg-bg-sunken ' +
  'active:border-border-strong active:bg-bg-sunken active:duration-instant';

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
