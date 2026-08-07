# UI/UX Review — nothing-records-what-the-signals-said

**Checklist source**: `docs/checklists/UI_COMPONENT_REVIEW_CHECKLIST.md`
**Scope**: two read-only pages (`/recorder`, `/recorder/[ticker]`) and their
presentational components (`signal-record.tsx`). No mutation, no confirmation
flow, no client store.

## Checklist matrix (to be filled with evidence by the executor)

| Category | Rule under review | Evidence (file:line / test) | Status |
|----------|-------------------|------------------------------|--------|
| Component structure | Server components fetch via `acting()` + use-cases; presentational components take typed props and render only | — | PENDING |
| Component structure | Files kebab-case; components under ~200 lines or split | — | PENDING |
| Hooks | None planned; any added hook derives no business value | — | PENDING |
| Store design | No client store introduced; no credential or derived business value client-side | — | PENDING |
| Consequence & confirmation | N/A — nothing on these surfaces mutates anything | N/A | N/A |
| State & interaction | Never-recorded, store-unreadable, and gap states each render distinctly; loading and empty states exist | — | PENDING |
| Data honesty | Every reading rendered with its capture time; provenance (named vs deployments-at-the-time) labelled; no `??` defaults on server fields | — | PENDING |
| Accessibility & semantics | Tables have headers; times carry machine-readable datetime; states conveyed in text, not color alone | — | PENDING |
| Responsive layout | Tables/timelines scroll within their container on narrow viewports | — | PENDING |
| Tailwind / tokens | Classes reference the token system; no raw color/spacing values | — | PENDING |

## Issues found

(none recorded — execution has not started)

Status: PENDING EXECUTION EVIDENCE
