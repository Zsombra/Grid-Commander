# UI/UX Review — close-the-reachability-gap

- Checklist source: `docs/specs/UI_COMPONENT_REVIEW_CHECKLIST.md`
- Status: `PENDING EXECUTION EVIDENCE`

## Scope Summary

Five new pages, three components gaining a prop, one page gaining a form. This
is the largest UI surface added in the project so far, and it is added
deliberately **unstyled** — the design agent has not seen a surface yet, and
five newly-designed pages would pre-empt it.

## Component Checklist Matrix

| Rule area | Applies | What must hold | Status |
|---|:--:|---|---|
| Component structure | ✓ | Server components; no `'use client'`; no data fetching inside components | PENDING |
| Hooks / store | ✗ | None exist | N/A |
| shadcn/ui, Tailwind | ✗ | Neither installed; none introduced | N/A |
| Consequence & confirmation | ✓ | Archive and restore name the consequence before the button; fork does not confirm (DL-105) | PENDING |
| Accessibility & semantics | ✓ | One `<main>`, one `<h1>` per page; `role="alert"` for errors, `role="status"` for state | PENDING |
| Responsive layout | ✓ | No fixed widths beyond the existing `max-w-*` convention | PENDING |
| State & interaction | ✓ | Every result variant of every use case renders a state | PENDING |

## States Each New Page Must Render

| Page | States |
|---|---|
| agent edit | not-connected · agent not found · not-editable · rejected (named fields) · invalid (named fields) · updated |
| agent reactivate | not-connected · not found · not-permitted · confirmed |
| strategy fork | not-connected · unreadable · at-capacity · forked |
| strategy archive | not-connected · unreadable · refused (system-owned, already archived) · proposal · archived |
| strategy restore | not-connected · unreadable · refused · **repair-required** · restored |

`repair-required` is the one that matters: it is not an error, and rendering it
as one would tell the user to retry something that will never work.

## Design Boundary

| Must not appear in any new page | Status |
|---|---|
| A colour value | PENDING |
| A font family, size or weight beyond the existing `text-*` convention | PENDING |
| A design token reference | PENDING |
| A stylesheet import | PENDING |

## Findings

_To be filled by the executor with `path:line` evidence._

## Verdict

`PENDING EXECUTION EVIDENCE`
