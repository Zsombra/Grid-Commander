# UI/UX Review — nothing-records-what-the-signals-said

**Checklist source**: `docs/checklists/UI_COMPONENT_REVIEW_CHECKLIST.md`
**Scope**: two read-only pages (`/recorder`, `/recorder/[ticker]`) and their
presentational components (`signal-record.tsx`). No mutation, no confirmation
flow, no client store.

## Checklist matrix

| Category | Rule under review | Evidence | Status |
|----------|-------------------|----------|--------|
| Component structure | Server components fetch via `acting()` + use-cases; presentational components take typed props and render only | Both pages are async server components calling `app.readRecordCoverage` / `app.readSignalHistory`; `signal-record.tsx` exports props-typed functions with no fetching and no hooks | IMPLEMENTED |
| Component structure | Files kebab-case; components under ~200 lines or split | `signal-record.tsx` holds several small components (`RecordCoverage`, `CoinTimeline`, `SignalHistoryView`, `ProvenanceLine`), each well under the bound | IMPLEMENTED |
| Hooks | None planned; any added hook derives no business value | No hooks added; `section-nav.tsx` (the product's one client component) gained only a `/recorder` row | IMPLEMENTED |
| Store design | No client store introduced; no credential or derived business value client-side | No Zustand store; nothing client-side computes | IMPLEMENTED |
| Consequence & confirmation | N/A — nothing on these surfaces mutates anything | The pages render reads of the product's own store | N/A |
| State & interaction | Never-recorded, store-unreadable, gap, empty-coin, and never-captured states each render distinctly | `tests/rendering/recorder.test.ts` asserts each state's own sentence and the absence of its neighbours' ("says the record could not be read, distinctly from empty"; "keeps a coin whose every read failed visible") | IMPLEMENTED |
| Data honesty | Every reading rendered with its capture time; provenance labelled; no `??` defaults on server fields | `CapturedAt` on every capture and point (stamp-count asserted); `ProvenanceLine` on every timeline row; platform-version-null renders "platform generation unknown"; nullable reading fields render only when present | IMPLEMENTED |
| Accessibility & semantics | Times machine-readable; states conveyed in text, not color alone | Every stamp is a `<time dateTime=…>`; every state is a sentence — the surfaces use no color signalling at all | IMPLEMENTED |
| Responsive layout | Wide content scrolls within its container | The surfaces are stacked lists (`space-y-*`, `max-w-2xl mx-auto px-6`) with no fixed-width tables; nothing overflows the shell pattern shared with sibling pages | IMPLEMENTED |
| Tailwind / tokens | Classes reference the token system; no raw color/spacing values | Only token classes in use (`text-text-secondary`, `border`, spacing scale) — same set as `exposure.tsx`/`stoppages.tsx`; no hex, no arbitrary values | IMPLEMENTED |

## Issues found

None. The surfaces are deliberately plain — like every sibling surface they
await a design pass through `/surface` + `/design`, and nothing here settles
a visual value the design layer has not chosen.

Status: EXECUTION EVIDENCE COMPLETE
