---
id: the-performance-design-rests-on-a-dead-premise
title: get_agent_performance answers now, and the product is built on it never having answered
type: question
status: open
priority: p2
created: 2026-08-12
updated: 2026-08-12
change: ""
capability: agent-understanding
github: "189"
blocked_by: []
tags: [battlegrid, v18, agent-understanding, live]
---

# The performance design rests on a dead premise

## What

`src/domain/agent/performance.ts` opens by explaining why the product does not
use the tool named for this job:

> The tool named `get_agent_performance` returned nothing on any of the nine
> agents on that account — `pnlCurveUsd` empty, every figure zero — while the
> *roster* payload carried the full record for four of them. A product that had
> gone to the schema for this would have built a surface on a tool that has
> never once answered. So everything here comes from `list_intelligence_agents`.

That reading was correct when it was taken. **At v18.2.0 it is false.** Probed
read-only 2026-08-12, one call per agent:

| agent | realizedPnlUsd | drawdownUsd | pnlCurveUsd |
|---|---|---|---|
| Undertow | −0.84 | 1.9 | **41 points** |
| Breakwater | +0.30 | 0.41 | **25 points** |
| Vanguard | 0 | 0 | empty — and v18 says an empty curve *means* no settlements yet |

The UI carries the premise too. `src/presentation/components/record.tsx:88`
justifies its caveat sentence with "the tool called `get_agent_performance`
exists and answers with zeros. Someone comparing this page against that tool's
output needs to know they are not looking at the same number."

## Why it matters

p2, on two counts.

**The product's stated reasoning is now wrong**, in a comment written to stop a
future reader from "fixing" it by going to the schema. Left alone, it will keep
persuading people of something false — and the more carefully argued the
comment, the longer that lasts.

**There is a capability going unused.** `pnlCurveUsd` is "one point per
settlement, oldest-first, **for a sparkline**" (v18's own words). The product
draws no P&L curve anywhere. It has one available, per agent, already computed
against the drawdown baseline the agent is actually measured on — which is a
different and arguably better number than the roster aggregate, since
`maxCumulativeDrawdownUsd` is the stop the platform enforces.

## Evidence

- `src/domain/agent/performance.ts:1-14` — the premise, quoted above.
- `src/presentation/components/record.tsx:84-95` — the caveat built on it.
- `src/ports/agents.ts:142` — "Read rather than taken from
  `get_agent_performance`, which measures …".
- Live readings above, 2026-08-12, v18.2.0, three of three agents.

## First step

Decide, don't drift. Either:

1. **Use it** — a change that reads the tool and draws the curve, keeping the
   roster aggregate where it is more appropriate and saying which is which. The
   two numbers measure different things (roster = lifetime record; performance
   = since the budget baseline), so this is not a swap, it is a second reading
   with a stated meaning.
2. **Keep the roster and correct the record** — if the roster aggregate is
   still the right source, the comments must stop asserting the tool never
   answers, because it does.

Either way the comments change. Doing nothing leaves the codebase arguing for a
platform behaviour that no longer exists.

## Notes

Found by the read-only sweep the operator asked for, one probe after the
freshness check that caught v18. Related: `performance-and-allocation-are-
unmodelled` (#107), whose allocation half is still open and now known to be
untestable until a position is open.
