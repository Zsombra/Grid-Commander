---
id: strategies-may-have-the-same-navigation-gap
title: The strategies section was not walked
type: debt
status: done
priority: p3
created: 2026-07-29
updated: 2026-07-30
change: you-cannot-open-your-own-agent
capability: app-access
blocked_by: []
tags: [app-access, reachability, walk]
---

# The strategies section was not walked

`you-cannot-open-your-own-agent` found three defects on the agents side by
serving the product and clicking through it: the entity's own page unreachable
from its list, sub-pages that named no entity, and sub-pages that led nowhere
back.

The two guards it added are derived, so `/strategies` is covered for the two
properties they express — a list must offer its entity, and nothing may be
reachable only through a mutation, and both pass there today.

**Neither guard covers naming or return paths.** A strategy sub-page could say
"this strategy" on an account with several, or dead-end, and both checks would
stay green — the same two defects the walk found on the agents side, and neither
is statically checkable branch by branch.

## What to do

Serve against the live account and walk `/strategies` → strategy → edit → fork →
archive → restore, clicking only what renders. That is the method that found all
three, and it took one pass.

## Related

- `you-cannot-open-your-own-agent` — declared this out of scope

## Closed 2026-07-30 — walked, and it was right about one of the two

`the-strategies-walk` served the product against a live account at 25/25 capacity
and walked list, detail, edit, fork and archive.

**Right about return paths, and understated.** This item guessed a strategy
sub-page "could dead-end". All four did — `edit`, `archive`, `fork`, `restore` —
plus three `unreadable` branches with no link at all, plus `plan-review.tsx`
offering "Go back and change it" as `href=".."`, which resolves to the roster.
Fixed, and a derived guard now holds it: *a page scoped to an entity offers a way
back to it*, with a second check that a declined confirmation does not land on a
list.

**Wrong about naming.** Every strategy surface already named its strategy; the
agents-side defect was not present here. The list also already linked each
strategy by name.

**What is still open is narrower than this item.** Naming has no automated check
on either side — every cheap static form is misleadingly weak or wrong, and the
property is per-branch. Carried forward as
`naming-an-entity-is-held-by-the-walk-only`, which records why each cheap version
was rejected. This item is superseded rather than merely closed.
