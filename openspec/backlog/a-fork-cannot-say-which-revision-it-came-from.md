---
id: a-fork-cannot-say-which-revision-it-came-from
title: A fork records which strategy it came from and not which revision, so its lineage cannot be stated
type: question
status: open
priority: p3
created: 2026-08-06
updated: 2026-08-06
change: ""
capability: strategy-authoring
github: "97"
blocked_by: []
tags: [battlegrid, fork, lineage, unobserved]
---

# A fork knows its parent and not its parent's revision

`fork_strategy` **requires** `sourceRevision`:

```
fork_strategy   required: strategyId, sourceRevision   optional: name
```

So every fork is pinned to a revision of its parent and receives that
revision's content. The strategy payload does not carry it back. Full key set
of a fork, read 2026-08-06:

```
boundAgentCount, cadence, conditions, createdAt, description,
forkedFromStrategyId, id, isActive, marketReadText, minAggregateScore,
minAtrPct, minRequiredCount, name, openPositionCount, ownerUserId,
regimeAutoDerive, regimeTimeframe, revision, scope, sections, signalRules,
systemKey, tagline, timeframe, updatedAt, visibility
```

`forkedFromStrategyId` and no revision beside it. `revision` is the fork's
**own** counter, which starts fresh.

## Why it matters

This is exactly what made `a-fork-appears-to-arrive-without-conditions` take a
census to answer. Five forks on one account have no conditions and twenty-two
on another have their parent's two — and the field that explains it, the source
revision, is not on any payload. The answer had to be reconstructed from
`createdAt` against the parents' `updatedAt`, which works once and does not
generalise.

It matters to a reader for the same reason. A fork of `Stalingrad` taken at
revision 2 and a fork taken at revision 5 are different strategies with the
same name and the same `forkedFromStrategyId`, and nothing on either says so.
The parent moves on — all twelve SYSTEM strategies were edited on 2026-08-05 —
and a fork silently becomes a snapshot of something that no longer exists in
that form.

## Why it is p3

Nothing is claimed falsely. The product does not render fork lineage beyond the
parent's name, so there is no sentence to be wrong. It becomes p2 if a surface
ever tells an operator their fork is "based on" a parent without qualifying
which version of it — that would be a claim the payload cannot back.

## What could be done

Nothing on the product side alone. Three options, in ascending cost:

- **Say less.** Where a fork's parent is named, do not imply currency: "forked
  from Stalingrad" rather than "based on Stalingrad", and never render the
  parent's *current* revision next to a fork.
- **Record it at fork time.** This product does not fork today, but if it ever
  calls `fork_strategy` it chooses `sourceRevision` and could store it locally
  — the one place the fact is available.
- **Ask BattleGrid** to return `forkedFromRevision` beside `forkedFromStrategyId`.
  It is one field and the server plainly has it, since it required it as input.

## Evidence

- `docs/battlegrid-mcp-capabilities.json` — `fork_strategy`, `required:
  ["strategyId", "sourceRevision"]`
- `a-fork-appears-to-arrive-without-conditions` — the census that needed this
  field and worked around its absence
