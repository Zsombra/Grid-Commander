---
id: conditions-save-render-keys-collide
title: The conditions-save page keys lists by display strings, and duplicates ConditionCard by hand
type: debt
status: open
priority: p3
created: 2026-08-12
updated: 2026-08-12
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
