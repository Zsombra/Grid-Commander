# Proposal: The Last Stock Buttons And The Guard

## Why

`buttons-and-labels-from-one-source` moved every button and field label in the
product onto `BUTTON_PRIMARY`, `BUTTON_SECONDARY` and `LABEL` in
`src/presentation/components/control.ts` — and named the one file it left
behind. `agent-edit.tsx` was out of that change's scope and still carried the
originals: four `rounded border px-4 py-2 text-sm` submits, three `px-4 py-2
text-sm underline` cancels, four labels in two spellings. So `/agents/[id]/edit`,
`/agents/[id]/reactivate` and the rename form were the only places in the product
where a confirmation did not look like the other eleven.

The sweep is the small half. The half that compounds is the guard.
`controls.test.ts` asserts `className={CONTROL}` on every input in the tree
because there is no exception to it, which is why the control treatment cannot
regress. The button and label equivalent could not be written: it would have
failed on `agent-edit.tsx`, and shipping it with an allowlist means shipping a
guard whose allowlist nobody ever deletes. So the button and label treatments
were asserted on the *constants* — that they are made of tokens — and not on
their use. Nothing stopped the next component from spelling out `rounded border
px-4 py-2 text-sm` again.

**Something already had.** `condition-composer.tsx` was written in the same merge
as the extraction and therefore never saw it: eighteen labels spelled `block
text-sm` and a `rounded border px-4 py-2 text-sm` submit, drifted before any
guard existed to notice. That is not a surprise, it is the prediction in the
backlog item arriving two weeks early — and it is why this change sweeps that
file too rather than exempting it. A guard that starts life with one exemption
starts life untrue.

## What Changes

- **`agent-edit.tsx` gets the same substitution the other eleven files got.**
  Four submits, three button-shaped cancel anchors, four labels. Nothing else in
  the file moves: same `action`s, same `href`s, same `htmlFor` bindings, same
  fields, same copy.

- **`condition-composer.tsx` gets it too.** Eighteen labels and one submit. Found
  by writing the scan, which is what a scan is for. Sweeping it was the only
  alternative to an allowlist, and an allowlist here would have been an
  allowlist for a file that had never been swept — the worst kind, because
  nothing about it reads as temporary.

- **Which button gets which weight** follows the rule
  `buttons-and-labels-from-one-source` stated and did not have to re-decide:
  *primary is the action the page exists to offer; secondary is its peer and
  every submit that only asks a question.* So `Apply this to …`, `Reactivate …`
  and `Rename` are primary; `Review the change` and `Try it — ask BattleGrid how
  this would resolve` are secondary, because both sit on `method="get"` forms
  that compose a preview and reach no operation. The cancel beside each primary
  is `BUTTON_SECONDARY` on an anchor, which is DT-0002's own pairing.

- **`tests/architecture/controls.test.ts` gains the scan.** Over every
  `<button>` and every `<label>` in `app/` and `src/presentation`, in the shape
  of the sibling `renders no control styled by browser defaults` check, with a
  vacuity check beside it and **no allowlist**. Its two exclusions are read off
  the elements rather than off a list of files:
  - a `<label>` whose content holds a checkbox is an inline row, not a field
    name above a control, and `LABEL`'s `block` would break it;
  - `<a>` is not scanned at all, because nothing in the tag distinguishes a
    cancel sized as a button from a link inside a sentence. What is asserted
    instead is that both spellings are still in use, so neither was quietly
    swept into the other.

- **The `describe` block that explained the scan's absence now explains its
  presence.** That comment named this backlog item and said the scan belonged to
  the change that empties it. This is that change, so the explanation had to go
  rather than survive as a stale reason for a guard that now exists.

## Nothing is styled as danger

Unchanged, and stated because this change touches four confirmations and three
of them are on destructive paths. Archive, rebind and undeploy stay
`BUTTON_PRIMARY` for DT-0002's reason: styling the legitimate action as a hazard
teaches people to flinch at the correct one, and the weight belongs on the
consequence block BattleGrid's own words fill. `system.json` lists a `danger`
variant and no surface has ever spent it. This change does not spend it either.

## Why no delta spec

`skip_specs: true`, for the same reason and by the same rule as the change this
finishes. `.claude/references/design-contract.md` §8 is explicit — *"A restyle
does not modify behavior, so it has no delta spec and needs no proposal."*
Nothing here alters what a form submits, what an operation reads, what routes
exist, or where declining sends you; `reachability.test.ts` and
`confirmation-is-human.test.ts` are the guards for all of that and both stay
green, unedited.

Writing a requirement like *"buttons SHALL use `color.accent.default`"* would
move the visual language into the behaviour contract, where the design agent
cannot change it without a spec change. §2's lane rule exists to prevent exactly
that, arriving from the developer's side.

There is a proposal at all because the guard is a durable decision about how this
tree is checked, and a change of that kind with no artifact is invisible at
handoff.

## Out of Scope

- **A new colour, weight or spacing value.** None was needed: every treatment
  applied here was already decided in DT-0002 and already worn by eleven files.
  The lane rule (§2) says a developer agent does not design, and this change had
  nothing to design.
- **The 44px tap target still has no token.** `system.json` states the principle
  and its space scale goes 32px then 48px, so both button constants spend
  Tailwind's `min-h-11`. Unchanged here and still filed as
  `the-button-primitive-has-no-tokens`.
- **`<a>` in the scan.** Reasoned above; the sweep's anchor decisions stay a
  person's call, and the guard says so rather than pretending otherwise.
- **Re-surveying the affected surfaces.** No manifest in
  `openspec/design/surfaces/` names `agent-edit.tsx` or `condition-composer.tsx`,
  so nothing goes stale. A `/surface` pass over these pages is still owed and is
  already recorded on `the-button-primitive-has-no-tokens`.
