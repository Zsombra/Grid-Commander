---
id: the-spend-meter-reads-zero-while-agents-run
title: last24hCostUsd reads 0 for every agent while they are demonstrably evaluating — the only spend number we have is unusable
type: risk
status: open
priority: p2
created: 2026-08-09
updated: 2026-08-09
change: ""
capability: agent-introspection
blocked_by: []
tags: [battlegrid, v15, money, live, measurement]
---

# The only spend number the platform gives us went to zero

## What

`get_intelligence_agent` returns `last24hCostUsd` per agent. It is the sole
model-spend figure anywhere on the surface — `get_agent_explorer` does not
carry the field at all (checked: zero occurrences across every agent on the
platform), and no other tool reports cost.

Tracked across 2026-08-09:

| read | Undertow | Breakwater | Vanguard | fleet |
|---|---|---|---|---|
| ~05:00Z | 1.94 | 0.48 | 0.13 | 2.55 |
| ~07:00Z | — | — | — | 2.80 |
| ~09:20Z | — | — | — | 3.26 |
| ~10:20Z | 2.37 | 0.81 | 0.21 | 3.39 |
| **11:2xZ** | **0** | **0** | **0** | **0** |

Zero is not plausible. At the same read the agents were plainly working:
four positions open (two entered at 10:30:08 and 11:01:31 that same hour),
and Undertow's gate-block log holds 278 entries with the newest stamped
11:19:10.

## Why it matters

Model spend had become the **dominant cost line** — $3.39/24h against a
$43.56 account and roughly $0.80 of realized trading loss, so it was
running ~4× the thing it was supposed to be optimising. The operator was
asked to rule on accept-as-tuition versus cutting evaluation volume, and
**that decision needs this number**. With the meter at zero there is
nothing to rule on and no way to tell whether a mitigation worked.

## What is not yet known

- whether v15 broke, moved or renamed the field
- whether it is a rolling-window reset that will refill over the next hours
- whether the platform stopped billing these agents

The first two are distinguishable by re-reading over the next few hours: a
window reset climbs again, a broken field stays pinned at zero while
positions and blocks keep accruing.

## Notes

- Do not report fleet spend as "zero" or "improved" on the strength of this
  field. It is unmeasurable right now — a different claim, and the honest
  one.
- Undertow's 278 blocks are almost entirely `OPEN_POSITION_CONFLICT` — it
  re-evaluates coins it already holds, ~31 blocked evaluations an hour.
  That is the cheapest available spend lever and it changes no strategy
  behaviour, but it cannot be justified or measured while the meter is
  dead.
