---
id: strategy-unreadable-arrives-without-a-reason
title: The editor's strategy-unreadable branch has no reason to show — the query drops it
type: debt
status: done
priority: p3
created: 2026-08-12
updated: 2026-08-13
change: "the-round-trip-keeps-what-the-person-needs"
capability: strategy-authoring
github: "170"
blocked_by: []
tags: [ui, failure, consistency]
---

# Strategy-unreadable arrives without a reason

## What

`readSectionOptions` collapses a failed strategy read to a bare
`{ kind: 'strategy-unreadable' }` — the port's reason and cause are dropped at
the query boundary. The edit page's branch therefore renders only a heading
("Strategy could not be read") and a back link: no reason, no why-not-loaded
reassurance, unlike every other unreadable branch in the product since
`a-failed-read-explains-itself` landed.

## Why it matters

p3: the branch is reachable only when the roster read fails at the moment of
opening the editor. But the product fought for the rule that a failed read
explains itself (the reassurance is what tells an operator their work still
exists), and this is the one unreadable branch that *cannot* comply — not
because the page forgot, but because the reason never reaches it.

## Evidence

- `src/application/use-cases/read-section-options.query.ts:32` — returns bare
  kind; the port result's reason/cause are discarded.
- `app/(app)/strategies/[id]/edit/page.tsx:50-58` — the branch renders
  heading + link only.
- Contrast: the closed item `an-unreadable-branch-need-not-explain-itself`
  and its change `a-failed-read-explains-itself` fixed the pages that *had*
  reasons.

## Notes

Found while designing DT-0015, which deliberately does not restyle around it:
surfacing a reason is behavior (the query's result shape grows a field), so it
needs a change, not a ticket. The `vocabulary-unreadable` arm of the same
query drops its reasons identically — one change covers both arms.

## Landed 2026-08-13

Both arms of `readSectionOptions` carry `reason` and `cause` now, and both
branches on the edit page render them with `WhyNotLoaded`.

Worth keeping from the build: the two vocabulary reads are checked **separately**
rather than folded into one condition. Only the read that actually failed has a
reason to give — and folding them lost TypeScript's narrowing as well as the
reason, so the compiler said so.
