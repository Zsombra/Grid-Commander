---
id: conditions-save-render-keys-collide
title: The conditions-save page keys lists by display strings, and duplicates ConditionCard by hand
type: debt
status: open
priority: p3
created: 2026-08-12
updated: 2026-08-13
change: ""
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
