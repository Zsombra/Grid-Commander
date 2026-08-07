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

---

# Step 1 taken, 2026-08-06 — rows arrive, and the two game types are the same list

`get_leaderboard` was called with every `gameType` × every `metric` at
`timeframe: ALL_TIME, limit: 10`, on account 1.

| gameType | PROFIT | VOLUME | SCORE |
|---|---|---|---|
| `ALL` | 10 rows | 10 rows | 10 rows |
| `MARKET_GRID` | 10 rows | 10 rows | 10 rows |
| `COIN_GRID` | **0 rows, `currentUser: null`** | 0 rows | 0 rows |

**`ALL` and `MARKET_GRID` return byte-identical payloads** — same rank 1
(`PrawnCocktail`, 371.7 by profit), same values, same `currentUser` (rank 7 by
profit at the 97th percentile, rank 1 by both volume and score). `COIN_GRID`
answers with nothing at all.

## So the item's own premise is refuted, in both directions

**"The rows have never been observed populated" is no longer true.** They are
populated on every metric. Filed separately as
`the-leaderboard-has-rows-and-no-surface-shows-them`, because that is a
different and larger finding than this item: `/explorer` maps the rows onto
`Leaderboard.entries` and renders none of them.

**And the `gameType` argument buys nothing today.** The reason to add it was to
let the arena ask "who is winning *this* game". Right now every player on the
platform is a Market Grid player — `ALL` and `MARKET_GRID` are the same ten
people — so a Market Grid leaderboard would be the leaderboard `/explorer`
already reads, rendered twice.

## What that changes about the recommendation

The item's step 2 said: if rows arrive, widen `ExplorerPort.readLeaderboard`
with the platform's own `gameType` enum, defaulting to today's `ALL`. That is
still the right shape and it is still cheap — one declared enum value on a call
the product already makes, no second mapper. But it should be built **for the
arena, when the arena has a leaderboard panel to put it in**, not on its own:
adding an argument whose two live values return the same bytes, with no surface
asking the question, is a widening nobody can test the point of.

The order is therefore: render the rows on `/explorer` first (the sibling item),
and take `gameType` when the arena wants its own copy of that panel.

`COIN_GRID` returning empty is worth one line in whatever ships: it is the
platform declaring a game type that has no players yet, not a failure, and a
surface that asked for it must say "nobody is ranked" rather than "could not be
read".
