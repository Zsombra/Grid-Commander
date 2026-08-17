---
id: conditions-save-render-keys-collide
title: The conditions-save page keys lists by display strings, and duplicates ConditionCard by hand
type: debt
status: done
priority: p3
created: 2026-08-12
updated: 2026-08-16
change: "the-save-page-draws-the-shared-card"
capability: strategy-authoring
github: "167"
blocked_by: []
tags: [ui, react, drift]
---

# Conditions-save keys collide and its cards drift

## What

Two code-quality findings on `/strategies/[id]/conditions/save`:

1. **React keys are display strings.** `named` maps every key-less entry to
   the literal `'(an entry with no key)'` and uses it as the list key — two
   key-less entries collide. The malformed-problems, inexpressible-reasons and
   drift-reasons lists key by the reason string itself, so duplicate reasons
   collide too. React warns and dedupes rendering; not normally user-visible.
2. **The listing state's existing-condition cards near-duplicate
   `ConditionCard`** (strategy-conditions.tsx) inline, with a slightly
   different verdict annotation ("a named building block" vs. the empty
   string) — two renderings of one thing that can drift apart.

## Why it matters

p3: latent. The collisions need duplicate inputs the composer does not
normally emit; the duplication is a drift trap, not a defect today.

## Evidence

`app/(app)/strategies/[id]/conditions/save/page.tsx` — found by the
2026-08-12 ceremony survey (`strategy-conditions-save` manifest, 13
components, records both in `current_implementation`).

## Notes

Also recorded there: `editQuery` keeps only the first value of any repeated
query param, so a multi-valued draft param would be silently truncated on
round-trip — latent while the composer emits single values.

## 2026-08-13 — the keys landed; two findings remain

`what-the-page-shows-is-what-happens` fixed the React keys. The item stays open
for the two the operator scoped out:

- **The `ConditionCard` duplication** — the listing state near-duplicates the
  shared component inline with a differing verdict annotation. The drift trap
  this item was really filed about.
- **`editQuery`'s multi-value truncation** — needs a repeated query param the
  composer does not emit, so nothing can trigger it today.

**One claim in this item was overstated.** Every string in `parsed.problems` is
generated as `Row ${index + 1} …` (`condition-form.ts:129-198`), so that list
cannot contain duplicates and keying it by text was already safe. The fix was
kept — a key unique only by accident of its wording is a trap for the next edit
— but only the `named` list at `:279` genuinely collapsed, where every key-less
entry maps to the same literal.

**And the fix cannot be tested here.** See [[the-render-harness-cannot-see-a-key-collision]]
(#194): the rendering harness never reconciles, so a key collision is invisible
to it. A test was written, passed, and then passed identically against the
broken code — it was removed rather than kept.

---

# 2026-08-13 — the key half is now held by a test

The keying was already fixed (`key={i}`, position rather than the display
string, `app/(app)/strategies/[id]/conditions/save/page.tsx:338`). What it did
not have was anything able to keep it fixed: the test written for it passed
against the broken code too, and was deleted.

`the-harness-can-see-a-key-collision` closed that gap.
`tests/rendering/condition-write.test.ts` now renders a strategy defining two
key-less conditions and asserts `duplicateKeys` is empty, and reverting
`key={i}` to `key={key}` makes it fail. Finding 1 is fixed **and covered**.

**What is left is finding 2 and only finding 2**: the listing state's
existing-condition cards near-duplicate `ConditionCard` from
`strategy-conditions.tsx` inline, with a different verdict annotation, so the
two renderings of one thing can drift apart. That is a presentation refactor
with no bearing on the harness, and it is why this item stays open at p3 rather
than closing alongside #194.


---

# 2026-08-16 — finding 2 landed, and the item closes

`the-save-page-draws-the-shared-card` (lite, archived) folded the listing
state's inline card back into the shared `ConditionCard`, which is now exported
from `strategy-conditions.tsx` with two seams:

- `blockNote` — whether a null verdict is annotated in the card's own text.
  The difference this item called drift was **not** drift: `spec.md:758-762`
  is satisfied by *position* on the strategy page, which lists calls and blocks
  apart under a heading, and has to be satisfied by *text* on the save page,
  which lists flat. Both encodings survive; the parameter is which one a
  caller needs. `strategy-conditions-save.json:160` records the annotation as
  a design constraint and it is intact.
- `actions` — a trailing slot for the per-condition remove/change links.

The rendered listing is **byte-identical** across the change (text, links and
headings dumped before and after, with a fixture whose `REGIME_DOWN` carries
`verdict: null`, so the annotation is inside the compared text). The one
difference is on a condition using a form the product does not model, which
now also draws the shared card's "What is shown is incomplete" caveat —
additive, and not a repair of a violation: `Not understood by Grid-Commander:`
was already rendered on both sides by `ConditionStructure`.

**Both findings this item is titled for are now done and the item closes.**
Its third, `editQuery`'s multi-value truncation, was never one of them — it
was recorded in Notes as an aside, and the 2026-08-13 entry that said "finding
2 and only finding 2" overlooked it. Rather than leave it buried in a closed
item it is filed on its own:
[[a-repeated-draft-param-is-truncated-on-round-trip]].
