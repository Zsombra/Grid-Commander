# Proposal: The borders join the palette

## Why

86 occurrences across 37 files wear bare `rounded border` (the item's 67 undercounted — it matched one quoting style) — Tailwind's 4px
radius and its default grey border, neither a token (#155). It is the
input defect `control.ts` documents, surviving product-wide on cards and
containers: the grey is not in the palette and does not follow the dark
scheme the way `color.border.default` does. DT-0008 decided the target
treatment on the explorer's cards; this change executes that decision
mechanically everywhere.

## What Changes

- Every `rounded border` in `app/` and `src/` becomes
  `rounded-gc-2 border border-border-default` — the treatment DT-0008
  landed. Radius unifies from Tailwind's 4px to `radius.2` (8px), matching
  every tokened box in the product. Zero copy changes, zero structural
  changes.

## Capabilities

None — presentation only, executing a design ticket's decided treatment
(`skip_specs: true`).

## Out of Scope

- The role blocks (danger/notice/consequence/quiet) — already tokened.
- Any per-surface design pass; those continue under #108.

## Impact

37 .tsx files under app/ and src/, class strings only. Verified by the
full local CI and a grep gate: `rounded border` (untokened) appears
nowhere afterward.
