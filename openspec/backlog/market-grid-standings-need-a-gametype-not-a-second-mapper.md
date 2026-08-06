---
id: market-grid-standings-need-a-gametype-not-a-second-mapper
title: A Market Grid leaderboard is one argument on a read the product already makes
type: feature
status: open
priority: p3
created: 2026-08-06
updated: 2026-08-06
change: ""
capability: agent-comparison
blocked_by: []
tags: [battlegrid, market-grid, explorer, unobserved-shape]
---

# A Market Grid leaderboard is one argument, not a second mapper

`market-grid-is-an-unmodelled-module` listed `get_leaderboard` as needing its
arg shapes read before use. They have been read for days:

```
get_leaderboard   required: metric (PROFIT|VOLUME|SCORE), timeframe (DAILY|…|ALL_TIME)
                  optional: gameType (MARKET_GRID|COIN_GRID|ALL), limit (1-100)
```

and the product **already calls it** — `McpExplorerAdapter.readLeaderboard`,
from `ReadFieldQuery`, with no `gameType`, which means `ALL`. So the arena's
"who is winning this game" is that same call with one declared enum value
added.

## Why it was not built into market-grid

Two reasons, and the second is the stronger one.

**It would be a second leaderboard mapper.** `ExplorerPort` already models the
envelope (`filter`, `generatedAt`), the rows (`rank`, `displayName`, `value`)
and `currentUser` as `OwnStanding`. A parallel mapper inside
`market-grid-adapter.ts` is two places that must agree about one tool — the
drift this repository has a comment about in six files.

**The rows have never been observed populated.** The 2026-08-06 probe recorded
`"leaderboard": []` with `"currentUser": null`, and `/explorer` renders *only*
`currentUser` — so no surface in this product has ever displayed a leaderboard
row. `currentUser` has been seen populated (rank 7 by profit, 97th percentile,
2026-08-03), the rows have not.

## First step when taken

1. Call `get_leaderboard` with `gameType: MARKET_GRID` and each metric, on both
   accounts, and record whether rows arrive. If they stay empty, stop — there
   is nothing to render and that is the finding.
2. If rows arrive: widen `ExplorerPort.readLeaderboard` with the platform's own
   `gameType` enum (defaulting to today's `ALL`, so `/explorer` is unchanged),
   and let the arena ask for the Market Grid one. That is a change in
   `agent-comparison` with a read-only consumer in `market-grid`.

## Notes

`get_top_ranked_coins` — the other half of that old bullet — is likewise
already consumed, by `McpMarketAdapter`, with `interval` + `metric` from the
discovery. Nothing is outstanding there.
