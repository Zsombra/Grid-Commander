---
id: the-session-page-reads-the-narrower-of-two-payloads
title: /arena/[id] reads only the detail payload, so it cannot show the twenty fields only the list carries
type: debt
status: done
priority: p3
created: 2026-08-06
updated: 2026-08-07
change: "the-session-page-reads-both-payloads"
capability: market-grid
blocked_by: []
tags: [battlegrid, market-grid, overlapping-payloads]
---

# The session page reads the narrower of two overlapping payloads

`the-schedule-comes-off-the-list` retired the arena's per-session fan-out
because the list already carried what the detail was being asked for. Measuring
that turned up the mirror image, one surface over.

The two reads **overlap; neither contains the other.** Measured live
2026-08-06 on the same session:

**Only `get_market_grid_session` carries** (13):

```
id, chartIntervalMs, createdAt, gridRows, gridCols, gridSize, coinPool,
coinCount, timeframe, prizePool, warBondDeployed, warBondPoolId,
coinCaptainBadges
```

**Only `list_market_grid_sessions` carries** (20):

```
sessionId, selectedCoinId, coinPoolPreview, regimeReferenceTicker,
regimeReferenceTimeframe, minimumPlayers, playersNeeded, totalPrizePool,
warBondCycleStarted, payoutStructure, distributionCurveId, itmPercent, alpha,
feeBreakdown, calculatedItmCount, hostDisplayName, hostAvatarUrl, coinPicks,
crowdUpPercent, crowdDownPercent, source
```

`/arena/[id]` reads the detail only. So the session's own page cannot show:

- **`playersNeeded` / `minimumPlayers`** — the arena's headline fact. The list
  page can say "needs 5 more players"; the page devoted to that session cannot.
- **`hostDisplayName` / `hostAvatarUrl`** — who is running it. The detail
  carries `hostUserId` and no name.
- **`coinPicks`, `crowdUpPercent`, `crowdDownPercent`** — the crowd panel, when
  it ever fills (`market-grid-payloads-that-only-fill-once-someone-plays`).
- **`payoutStructure`, `itmPercent`, `feeBreakdown`, `calculatedItmCount`,
  `alpha`, `distributionCurveId`** — how the money is split, which is the
  substance of deciding whether to enter.

## Why it is p3

Nothing is claimed falsely; the page shows less than it could. That is a gap,
not a defect, and the gap is invisible to a reader who has not seen the other
payload.

It stops being p3 the moment the crowd panel becomes buildable, because
`coinPicks` is list-only and the session page is where a crowd panel belongs.

## Two ways to fix it

- **`OpenGridSessionQuery` takes the summary alongside the detail** — one extra
  read of a list the arena already calls, and the summary is already mapped.
  Cheapest, and it makes the page's data model honest: this session, as both
  reads describe it.
- **The port grows `sessionSummary(id)`** — narrower, but it is a second way to
  ask for a list row and there is no tool behind it.

The first is almost certainly right. It costs one call and no new mapping.

## Evidence

Key-set comparison run live 2026-08-06 against the same session id through
both tools; both key lists above are verbatim output.
