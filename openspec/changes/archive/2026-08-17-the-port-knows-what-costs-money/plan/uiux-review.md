# UI/UX Review: The Port Knows What Costs Money

**Status**: EXECUTION EVIDENCE FILLED

Checklist: `docs/checklists/UI_COMPONENT_REVIEW_CHECKLIST.md`.

## Scope: minimal, but not N/A

One surface changes: `src/presentation/components/audit-list.tsx:60` renders the
`destructive` flag as a badge. After this change the badge states **this
product's** judgement rather than the platform's.

No new surface, no new state, no layout change, no new interaction. So no design
ticket is required — but the claim the badge makes changes, and that is a content
question the UI checklist governs.

## Checklist matrix

| # | Rule | Evidence | ☐ |
|---|---|---|:--:|
| 1 | The badge's wording states what the product concluded, not what the platform said | `audit-list.tsx:64` renders on `e.destructive` — the product's judgement; `:75` title text says so explicitly | ☑ |
| 2 | A row written before this change is not labelled as though it carried the new fact | `audit-list.tsx:72` requires `platformDestructiveHint === false`; NULL draws nothing | ☑ |
| 3 | Tokens used; no raw colour introduced for a new state | `border-consequence-border bg-consequence-subtle` at `audit-list.tsx:64` — semantic tokens, no hex | ☑ |
| 4 | The badge is not the only signal — it does not carry meaning by colour alone | The chip carries the literal word `destructive` plus a `title` explanation at `:75` — not colour-alone | ☑ |
| 5 | No client-side derivation of the judgement (Iron Rule, and UI checklist item on computed values) | Value read from the row; see data-review row 1 | ☑ |
| 6 | Surface manifest for the audit surface re-pinned if its source files moved — digest **and** prose if the prose describes the badge | `openspec/design/surfaces/audit-log.json` re-pinned in commit `0786ab6` | ☑ |

## Copy

The badge currently reads `destructive`. If the wording changes, record the old
and new strings here — `answering-is-not-disclaimed.test.ts` is the precedent for
copy that outlived its truth, and a badge is copy.

## Deviations

*(none yet)*
