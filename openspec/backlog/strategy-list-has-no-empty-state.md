---
id: strategy-list-has-no-empty-state
title: The strategy roster renders an empty list with nothing in it
type: bug
status: open
priority: p2
created: 2026-07-28
updated: 2026-07-28
change: ""
capability: strategy-authoring
blocked_by: []
tags: [ui, surface]
---

# The strategy roster renders an empty list with nothing in it

## What

`StrategyList` branches on `result.kind === 'unreadable'` and otherwise maps
`listings` into a `<ul>`. There is no branch for `listings.length === 0`, so a
user with no strategies gets the page heading, the intro paragraph, and an empty
`<ul>` — no sentence, no next action.

Found while surveying the UI for `openspec/design/surfaces/strategy-catalog.json`.

## Why it matters

This is the first screen a newly connected user reaches with nothing set up, so
the empty case is the *first impression*, not an edge case.

It also reads identically to a bug. The `unreadable` branch was written with
real care — it says the strategies are not gone, only unreachable — and that
distinction is lost the moment "you have none" renders as blank space, because
blank space is what a broken page looks like too.

## Evidence

`src/presentation/components/strategy-list.tsx` (PR #3 branch), the return after
the `unreadable` guard: `listings.map(...)` with no length check.

The route above it (`app/(app)/strategies/page.tsx`) does not check either.

## Notes

Recorded in the surface manifest as an `empty` state on `strategy-list`, with
the gap named in `current_implementation` — the design agent should design the
state, and this item covers the code that renders it.

Worth checking the same pattern on the other lists while fixing: `agent-roster`,
`audit-list`, and `journal-view` were not surveyed yet and may share it.

**Do not fix by installing Tailwind and styling around it.** The empty state is
missing markup, not missing style; see `tailwind-classes-with-no-tailwind`.
