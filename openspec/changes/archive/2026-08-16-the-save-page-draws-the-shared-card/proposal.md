# The save page draws the shared card

## Why

`#167`'s remaining half. `/strategies/[id]/conditions/save` renders its
"What <name> defines now" list with markup written inline
(`page.tsx:129-161`) that near-duplicates `ConditionCard` in
`src/presentation/components/strategy-conditions.tsx:141-168`: same bordered
card, same name-and-key header row, same `ConditionStructure` beneath it.

The manifest for that surface already says so in its own words —
`strategy-conditions-save.json`, `current_implementation`:

> This markup is inline in the page and near-duplicates ConditionCard in
> strategy-conditions.tsx rather than reusing it.

Two renderings of one thing drift apart, and this pair has already started.
The item stayed open at p3 because nothing is broken today; what it is
filed against is the trap, and the trap is cheap to close.

**The differences are not symmetric, and neither is an accident.**

1. **The inline copy says more.** A null verdict is annotated
   `· a named building block`; the shared card renders the empty string.
   That is not drift — it is the same requirement encoded twice.
   `StrategyConditions` splits calls from blocks under a heading ("Named
   blocks, referenced above"), so *position* carries the fact. The save page
   renders one flat list, so the *text* has to. `spec.md:758-762` requires it
   either way, and `strategy-conditions-save.json:160` records the annotation
   as a constraint a design round must not remove.

2. **The inline copy says less.** The shared card appends
   "Part of this condition uses a form Grid-Commander does not model. What is
   shown is incomplete." when `hasUnrecognisedPart(definition)`; the inline
   copy has no equivalent.

The second is worth being exact about, because it is tempting to call it a
spec violation and it is not. `spec.md:750-756` requires an unrecognised part
be "reported as not understood rather than dropped or guessed at", and
`ConditionStructure` — which both cards render — already does that, inline
and at every depth. What the save page lacks is the per-card *summary*
caveat that what is drawn is incomplete. So this change adds one sentence to
one surface in one rare state; it does not repair a broken requirement.

## What

`ConditionCard` is exported from `strategy-conditions.tsx` and grows exactly
the two seams the difference above calls for:

- `blockNote?: boolean` — whether a null verdict is annotated in the card's
  own text. `false` for `StrategyConditions`, whose heading already says it;
  `true` for the save page's flat list. The parameter is the encoding, not a
  styling switch, and the doc comment says which surface needs which and why.
- `actions?: ReactNode` — a trailing slot inside the same `<li>`, for the
  save page's per-condition *Remove it from the strategy* / *Change it*
  links. `StrategyConditions` passes nothing.

`page.tsx` drops its inline markup for `<ConditionCard>`, and hoists the
`defined` set out of the `.map()` that was rebuilding it per row.

`strategy-conditions-save.json` is re-pinned: the sentence quoted above is
now false, and the manifest's `source_digest` covers a file this change
edits.

## Not in scope

`#167`'s third finding, `editQuery`'s multi-value truncation, stays open on
the item — it needs a repeated query param the composer does not emit.

## Verified

Recorded in `tasks.md` as each is run.

## Track

`lite`, `skip_specs: true`. Presentation refactor. No requirement changes:
the annotation the change carries across is the one `spec.md:758-762`
already mandates, and the caveat it gains is additive within
`spec.md:750-756` rather than a change to it.
