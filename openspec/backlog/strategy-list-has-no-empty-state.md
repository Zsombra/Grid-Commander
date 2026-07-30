---
id: strategy-list-has-no-empty-state
title: The strategy roster renders an empty list with nothing in it
type: bug
status: done
priority: p2
created: 2026-07-28
updated: 2026-07-28
change: a-catalog-with-nothing-in-it
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

## Confirmed as an inconsistency, not just an omission (2026-07-28)

Surveying `agent-roster` found the same problem already solved, one capability
over. `RosterResult` carries a distinct `'empty'` kind and `AgentRoster` renders
it as its own branch, with a comment saying exactly why:

> An account with no agents and an account whose roster failed to load look
> identical if you branch on `length === 0`, and telling the second user they
> have no agents is how someone recreates work they already own — or concludes
> something deleted it.

`StrategyListResult` has no `'empty'` kind and `StrategyList` branches only on
`unreadable`. So this is not an oversight in isolation — it is one capability
having learned something the other has not.

Fixing it properly means adding `'empty'` to the port result rather than a
`listings.length === 0` check in the component, so the two capabilities model
the distinction the same way. That may make it a spec change rather than a
styling fix; check `openspec/specs/strategy-authoring/spec.md` before starting.

`audit-list` handles its own empty case inline and reads fine, so this is
specifically about the two roster-shaped surfaces.
