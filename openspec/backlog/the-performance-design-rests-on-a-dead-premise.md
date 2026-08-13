---
id: the-performance-design-rests-on-a-dead-premise
title: get_agent_performance answers now, and the product is built on it never having answered
type: question
status: done
priority: p2
created: 2026-08-12
updated: 2026-08-13
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


---

# Decided 2026-08-13 — option 2, and the correction was already in the repo

Re-probed live first. The numbers are **identical to 2026-08-12**, so this is
settled behaviour rather than a fluke:

| agent | realized | drawdown | stop | curve |
|---|---|---|---|---|
| Undertow | -0.84 | 1.90 | 6 | 41 pts |
| Breakwater | +0.30 | 0.41 | 5 | 25 pts |
| Vanguard | 0 | 0 | 6 | empty, on nought trades |

## The finding underneath the finding

This item says the product is built on a dead premise. True — but the
correction was **already in this repository**, unnoticed, in a different file:

- `performance.ts:5` — "a tool that has never once answered"
- `ports/agents.ts:142` — "So the tool is not broken"

`ports/agents.ts` worked it out on 2026-08-06: the tool measures P&L *since the
agent's risk-budget baseline*, so an agent with no budget reports zeros while
carrying real closed losses, and one with a budget "agrees with the outcomes to
the cent (-0.23 against -0.23582, a 26-point curve for 26 trades)".

**Two comments in one codebase disagreed, and the emphatic one was wrong.** The
same shape as the render harness and DT-0014 — not a stale fact, but a confident
one that had already been superseded where nobody was looking.

v18 now states it in the tool's own description: *"An empty curve means no
settlements yet, not missing data."*

## The decision

**Option 2 — the roster stays the record source, and the comments are
corrected.** `ports/agents.ts:142`'s argument holds and #189 does not overturn
it: the roster answers the same question the same way whether or not a budget
was ever set, which is what a record has to do.

Corrected:

- `src/domain/agent/performance.ts` — header rewritten. Keeps the conclusion,
  replaces the reasoning, credits `ports/agents.ts` for having got there first,
  and carries the live confirmation.
- `src/presentation/components/record.tsx` — the caveat's justification. The
  rendered sentence is unchanged and still correct; what was wrong was the
  comment telling the next reader *why* it is there.

## What option 1 was actually pointing at

The tool answers a third question neither record does: **realized dollars
against the drawdown stop the platform halts on**, trades and wagers totalled.
Undertow is at 1.90 against a stop of 6 and no surface says so.

That is a real unused capability and it needs a design round for the sparkline,
so it is filed as [[realized-pnl-against-its-stop-is-unread]] (#202) rather than
smuggled into a comment fix.
