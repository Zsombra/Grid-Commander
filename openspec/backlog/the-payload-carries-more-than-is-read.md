---
id: the-payload-carries-more-than-is-read
title: The agent payload carries six more fields nothing reads
type: question
status: open
priority: p3
created: 2026-07-29
updated: 2026-07-29
change: performance-was-already-in-the-payload
capability: agent-understanding
blocked_by: []
tags: [battlegrid, agent-understanding, mapping]
---

# The agent payload carries six more fields nothing reads

`list_intelligence_agents` and `get_intelligence_agent` return the identical
thirty keys. After `performance-was-already-in-the-payload`, these are unmapped:

```
last24hCostUsd        activeGameCount     hasActiveAssignments
provider              modelDisplayName    avatarUrl / modelImageUrl
```

**`last24hCostUsd` is the one worth looking at.** The older account showed that
an agent can be stopped by spend, not just by loss:

```
COST_LIMIT_REACHED   { error: "Daily cost limit reached ($6.0544 / $6)",
                       errorCategory: "COST_LIMIT" }
SKIPPED_COST_LIMIT   (thought outcome, twice)
```

So there is a ceiling that halts an agent, and the product's `/limits` page —
titled *what would stop this agent* — does not mention it. That page shows four
gauges from `get_agent_budget`, all about money lost or at risk. Spend is a
fifth way to be stopped and it is invisible there.

Whether the cap itself is readable is unknown; only the breach event and the
running total have been seen. Worth one probe before any modelling.

## Not the same as the others

`modelDisplayName` and `provider` are the human names for a brain the agent page
currently shows as `CUSTOM` — cosmetic, but cheap. `avatarUrl` and
`modelImageUrl` are presentation the product has no use for.
`hasActiveAssignments` and `activeGameCount` are unexplained.

These stay unmapped because nothing has asked for them — deliberately a
different reason from the performance block, which was excluded by a rule that
turned out to be one step too wide.

## Related

- `performance-was-already-in-the-payload` — declared these out of scope
