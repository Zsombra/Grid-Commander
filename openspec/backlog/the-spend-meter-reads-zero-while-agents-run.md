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
github: "96"
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

## It is broken, not a window reset

The two branches were distinguishable by re-reading: a rolling window
refills, a broken field stays pinned while work accrues. Re-read at
**12:35Z, ~75 minutes later**:

| | 11:2xZ | 12:35Z |
|---|---|---|
| `last24hCostUsd` (all three) | 0 | **0** |
| Undertow gate blocks (total) | 278 | **317** |
| newest block | 11:19:10 | **12:34:09** |
| open positions | 4 | 4 |

**39 fresh blocked evaluations in that window and the meter did not move off
exactly zero.** A rolling 24h window that had genuinely reset would have
been climbing again within minutes of the first evaluation. The field is
broken.

What remains unknown is only *why* — whether v15 renamed it, moved the
accounting, or stopped billing these agents. None of those are answerable
from the read surface: `get_intelligence_agent` is the only tool that
carries the field.

## Notes

- Do not report fleet spend as "zero" or "improved" on the strength of this
  field. It is unmeasurable right now — a different claim, and the honest
  one.
- Undertow's 278 blocks are almost entirely `OPEN_POSITION_CONFLICT` — it
  re-evaluates coins it already holds, ~31 blocked evaluations an hour.
  That is the cheapest available spend lever and it changes no strategy
  behaviour, but it cannot be justified or measured while the meter is
  dead.
