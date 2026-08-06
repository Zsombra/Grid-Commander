# Proposal: Buttons And Labels From One Source

## Why

`forms-that-work-in-the-dark` gave every input, select and textarea one
token-based treatment from `src/presentation/components/control.ts`. It stopped
at the control and said so: the buttons and labels beside them were still
`rounded border px-4 py-2 text-sm` and `block text-sm font-medium`, filed as
`buttons-and-labels-untokenised` (P3) so that "the inputs are fixed" stayed a
checkable claim rather than becoming "the forms were restyled".

That item asked for this to be done as part of the first design pass over a
form-carrying surface, on the grounds that button weight is a design decision.
**The decision has already been made and shipped.** DT-0002 styled the strategy
review panel and settled it in as many words:

> The apply button uses `button/primary` on `color.accent.default` and does not
> use `color.danger` in any state.
>
> `Go back and change it` is rendered as `button/secondary`, is at least 44px
> tall on mobile — a visible peer, never a text link lost beneath the button.

`plan-review.tsx` carries both treatments as inline class strings, screenshotted
and verified in both colour schemes. So the design layer is not missing here;
it is present, implemented, and confined to one file. Every other confirmation
page in the product is structurally the same page — a consequence block, the
commitment, the way out — and each drew its own.

This change extracts DT-0002's two treatments into `control.ts` and applies them.
It invents no visual language. Where it had to choose, the choice was between
two treatments a design ticket had already named.

## What Changes

- **`control.ts` gains `BUTTON_PRIMARY`, `BUTTON_SECONDARY` and `LABEL`.**
  The two button strings are lifted byte-for-byte from `plan-review.tsx`, so the
  one surface that was actually designed and screenshotted renders identically
  afterwards and now imports what it used to spell out.

- **Every stock button gets one of the two.** The rule, stated once so it is
  checkable: *primary is the action the page exists to offer; secondary is its
  peer and every submit that only asks a question.* A submit on a
  `method="get"` form composes a preview and reaches no operation — that
  distinction is already load-bearing everywhere in
  `tests/architecture/reachability.test.ts`, so this reuses it rather than
  inventing a second one.

- **The cancel beside each commit is included**, though it is an `<a>` and not a
  `<button>`. It has to be: `min-h-11` on the button and `px-4 py-2 text-sm
  underline` on the anchor beside it in the same `flex` row is a height mismatch
  this change would have *introduced*. DT-0002 renders `button/secondary` on an
  anchor for exactly this pair, which is the precedent being followed.

- **Nothing is styled as danger.** Archive, undeploy and rebind are destructive
  and stay `BUTTON_PRIMARY`. This is DT-0002's reasoning applied where it points:
  *"styling it as a hazard teaches people to flinch at the correct action"*, and
  the weight belongs on the consequence block above — which every one of these
  pages already renders. Adding a fourth colour to a confirmation whose whole
  design puts the weight on BattleGrid's own sentence would work against it.

- **Field labels get `LABEL`.** Five spellings today — `block text-sm
  font-medium`, `block text-sm text-text-primary`, `block text-sm`, `block`, and
  `min-w-64` — become one. Labels that wrap a checkbox with the text *after* it
  are left alone: those are inline rows, not a field name above a control, and
  `block` would break the layout.

- **`CONTROL` gains `font-normal`.** Tailwind's preflight sets `font-weight:
  inherit` on form elements, so a `LABEL` that wraps its own control would push
  `font-medium` into the input — a control whose weight depends on what encloses
  it is the same defect `CONTROL` exists to prevent, one layer along.

## Why no delta spec

`skip_specs: true`, and this is the deliberate answer rather than the quiet one.

`openspec/specs/app-access/spec.md` is the capability this touches, and every
requirement it carries about forms is about *binding and reachability* — "Every
Form The Interface Renders Can Be Submitted", "Every Affordance The Interface
Offers Resolves". It goes out of its way to say a form that renders its fields
and its button and performs nothing "is a failure of reachability, not of
presentation." Nothing in this change alters what a form submits, what an
operation reads, what routes exist, or where declining sends you.
`reachability.test.ts` is the guard for all of that and it stays green,
unedited.

The stronger reason is that writing a delta spec here would be *wrong*, not
merely unnecessary. `.claude/references/design-contract.md` §2 splits the three
things that mention UI: `openspec/specs/` is what the UI does, `openspec/design/`
is what it looks like, `docs/specs/` is how it is built. §8 is explicit — *"A
restyle does not modify behavior, so it has no delta spec and needs no
proposal."* A requirement reading "buttons SHALL use `color.accent.default`"
would move the visual language into the behaviour contract, where the design
agent cannot change it without a spec change. That is the failure the lane rule
exists to prevent, arriving from the developer's side.

There is a proposal at all only because this touches seventeen files, and a
change of that reach with no artifact is invisible at handoff.

## The token that does not exist

**There is no token for the 44px tap target.** `system.json` states the
principle — *"Tap targets are at least 44x44px on touch viewports"* — and its
`space` scale goes `6: 32px`, `7: 48px`. Nothing is 44. DT-0002 hit this first
and spent Tailwind's `min-h-11`; both new button treatments do the same, because
the alternative is a raw `44px` in a className, which the contract forbids and
which would be worse.

No value was invented to work around it. Filed as
`the-button-primitive-has-no-tokens`, together with the related gap: `system.json`
lists `button` variants `primary · secondary · ghost · danger` and never says
which colour role each takes. DT-0002 answered it for two of the four on one
surface. `ghost` and `danger` are still unspent, and the four surfaces with
manifests do not include any page this change touched — so these treatments are
correct by precedent and not yet covered by a ticket of their own.

## Out of Scope

- **`agent-edit.tsx`.** Four buttons, three cancel links and four labels, all
  still stock. Out of scope for this change and filed as
  `agent-edit-still-stock`. It is at least internally consistent — its button and
  its cancel link were both left, so no pair inside it is now mismatched.
- **A one-source guard that scans the tree.** `controls.test.ts` can assert
  `className={CONTROL}` on every input because there are no exceptions. The
  button equivalent cannot be written until `agent-edit.tsx` is swept, and a
  guard shipped with an allowlist is a guard nobody removes the allowlist from.
  What is added instead are assertions on the three new constants themselves —
  that they are made of tokens — which need no exemption to be true. The scan is
  named in the backlog item above.
- **Checkbox rows.** `flex items-center gap-2 text-sm` on a label wrapping a
  checkbox is a layout, not a label treatment. Untouched.
- **Anchors that are prose links.** `className="underline"` inside a sentence is
  a link and should look like one. Only the ones sized as buttons — `px-4 py-2
  text-sm underline`, standing in a flex row beside a submit — were changed.
- **Re-surveying `strategy-editor`.** Its manifest lists two files this change
  edits, so `validate --all` now reports `design_surface_stale` against it —
  joining `agent-roster` and `strategy-catalog`, which were stale already.
  Nothing the manifest asserts moved: same components, same states, same
  constraints. Hand-editing `generated_at_commit` would make it claim a currency
  it does not have, and a `/surface` pass is the `ui-surveyor`'s job. Recorded on
  `the-button-primitive-has-no-tokens`, which already calls for one.
