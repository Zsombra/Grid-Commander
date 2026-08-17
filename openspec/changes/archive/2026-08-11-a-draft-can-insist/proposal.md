# A draft can insist

## Why

BattleGrid v16 made `conditions[].required` a required key on every
condition-carrying write, and the product emits it — but the fresh-compose
form has no control for it, so every drafted condition is composed
`required: false` (#88). The flag is a capability the platform offers that
this product cannot reach: an operator who wants a mandatory condition has
to author it elsewhere.

Today's #133 observation raised what the flag is worth: a `required:
false` condition never produces a deciding `verdict` — the condition
system's deciding branch, which the evaluation page now renders verbatim,
is unreachable on this account precisely because nothing can compose
`required: true`. The control is what makes that branch ever exercisable.

The default stays the platform's own: `false`. The asymmetry is the same
one `verdictOf` documents — a wrong "optional" understates a draft, a
wrong "required" silently hardens a strategy the operator was composing —
so anything but the explicit must-hold value composes as optional.

## What Changes

1. `src/presentation/components/condition-composer.tsx` — a "Holding"
   select beside the verdict: "optional — BattleGrid's default" (empty
   value) and "required — the strategy insists on it" (`must-hold`). The
   seeded-from note grows to name it: a draft seeded from an existing
   condition takes the source's flag whole, exactly as it takes the
   definition, and the control is ignored on that path like the rows are.
2. `src/presentation/condition-form.ts` — the fresh-compose branch reads
   the control (`required: one(q, 'holding') === 'must-hold'`), replacing
   the hardcoded `false` and its filed-item comment. The from-existing
   branch is untouched: retarget carries `required` from the source, the
   behaviour the item affirms.
3. Tests: form parsing (must-hold → true; absent → false; a value the
   select does not offer → false, understating like `verdictOf`);
   rendering (the control offered, the seeded note naming it).

## Out of scope

- Letting a retarget change the source's flag — the item states the
  current carry-from-source behaviour is what the operator asked for.
- Any interpretation of what `required` does at evaluation time beyond
  the platform's own name for it.

## Capabilities

- `strategy-authoring` — one MODIFIED requirement.
