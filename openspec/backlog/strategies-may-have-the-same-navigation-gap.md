---
id: strategies-may-have-the-same-navigation-gap
title: The strategies section was not walked
type: debt
status: open
priority: p3
created: 2026-07-29
updated: 2026-07-29
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
