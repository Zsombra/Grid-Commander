---
id: the-feasibility-advisory-is-unread
title: feasibilityAdvisory already answers "which coins can this strategy actually trade today" and nothing reads it
type: feature
status: open
priority: p2
created: 2026-08-10
updated: 2026-08-10
change: ""
capability: agent-authoring
blocked_by: []
tags: [battlegrid, advisory, strategy-authoring, ui]
---

# The advisory that already exists, and nothing reads

## What

`update_intelligence_agent` declares a `feasibilityAdvisory` on its output.
Per coin it carries:

| field | |
|---|---|
| `status` | `FEASIBLE` · `STRUCTURAL_ONLY` · `ATR_UNAVAILABLE` |
| `atrPct` | the coin's live ATR |
| `reachableMinPct` / `reachableMaxPct` | the stop band actually constructible today |
| `requestedMinAtrMultiple` / `requestedMinPct` / `requestedMaxPct` | what the strategy asked for |
| **`responsibleBound`** | `MIN_STOP_LOSS_PCT` · `MAX_STOP_LOSS_PCT` · `null` — **which dial blocked it** |
| `shortfallPct` | how far short the request fell |

Nothing in this product reads any of it. Verified against the v16 record.

## Why it matters (p2)

This is the only surface on the platform that answers **"given today's
volatility, which of my armed coins can this strategy actually build a stop
for, and which dial is stopping the rest?"** — and it answers it per coin,
already computed, with the responsible dial named.

That question is not academic here. The fleet's central defect is a stop
floor pinned at 1×ATR (`v15-trade-level-policy-is-declared-but-inert`), and
the advisory is exactly the instrument that would have shown it: every coin
would have come back `FEASIBLE` with `reachableMinPct == atrPct`, which is
the machine-readable form of "your stop is one average bar from entry."

It is also the natural home for the warning copy the dials need. The
platform's own design rationale frames each dial's failure direction, and
the advisory carries every input required to render it:

| dial | turned down | turned up |
|---|---|---|
| Min Stop Loss | quality: tight stops admitted, expect noise stop-outs in chop | opportunity: only wide stops survive, fewer setups, targets sit farther |
| Max Stop Loss | **opportunity**: N of your armed coins cannot build under this ceiling today | risk: up to X% price risk per trade, Y% of margin at this leverage |
| Min Risk:Reward | quality: symmetric setups admitted, profitable only above ~50% win rate | opportunity: menu thins toward one setup per coin |

Note the direction on Max Stop Loss: it is the **low** setting that limits
opportunity. A high ceiling never blocks anything; its warning is risk-side.

## The gap, precisely

What the advisory speaks is **band language** — "reachable stops span
0.76–2.27% on this coin." What an operator setting a dial needs is
**opportunity language**, aggregated — *"at today's volatility, 9 of 12
armed coins can construct under this ceiling; at 2.00% that drops to 4."*

The delta is small and is presentation only: every input already exists in
the DTO, plus agent leverage for the risk-side line. No new platform call.

## Notes

- Blocked in practice by the p1: an advisory that names the dial responsible
  is much less useful while the dials cannot be written. Worth building
  anyway — it is a read, it would have surfaced the 1×ATR problem weeks
  earlier, and it is the right place for the remedy copy the day the write
  path returns.
- `ATR_UNAVAILABLE` is its own shape in the schema (`coinTicker` + `status`
  only, no numbers), so a consumer must handle the union rather than assume
  the numeric fields are present — the same `unreadable`-vs-`empty`
  distinction this product draws everywhere else.
