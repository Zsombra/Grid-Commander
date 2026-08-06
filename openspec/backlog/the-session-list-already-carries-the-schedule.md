---
id: the-session-list-already-carries-the-schedule
title: The arena re-reads per session what the session list already returned
type: debt
status: open
priority: p2
created: 2026-08-06
updated: 2026-08-06
change: ""
capability: market-grid
blocked_by: []
tags: [battlegrid, market-grid, rate-limit]
---

# The arena re-reads what the list already returned

`list_market_grid_sessions` returns, per session (observed 2026-08-06, all 50
rows):

```
status  lockAt  settleAt  playerCount
```

`WatchArenaQuery` then calls `get_market_grid_session` once per session to
learn `status`, `lockAt`, `settleAt` and `playerCount`. Fifty sessions, fifty
calls, for four fields already in hand.

## Why it matters

**It is where the rate limit was met.** `all-controllers-probe` hit HTTP 429 on
this exact fan-out, and the fix (`one-bad-session-must-not-take-the-arena-down`)
made the failure survivable rather than unnecessary. Halving the arena's call
count removes the condition instead of degrading under it.

**And the degraded state is currently false.** When a per-session read fails,
the surface says *"This session's schedule could not be read"* — while the
schedule sits in the list payload that rendered the row. It is the honest
sentence for the data the surface holds, and the data is one mapper line short
of making it unnecessary.

## Why it was not done in `the-game-is-legible-before-it-is-played`

That change added fields the list carries and nothing else read (`entryFee`,
`totalPrizePool`, `playersNeeded`, `minimumPlayers`). Taking the *schedule*
off the list is different: it retires the fan-out, and with it three scenarios
of `The Arena Is Watchable Without Being Played` — *One session's detail cannot
be read*, *The platform rate-limits the fan-out*, and part of *Watching the
arena*. That is a MODIFIED requirement, not an addition, and it deserves the
diff of its own rather than riding along.

## First step when taken

Map `status`, `lockAt`, `settleAt` and `playerCount` onto `GridSessionSummary`,
drop the `sessionDetail` fan-out from `WatchArenaQuery`, and rewrite the three
scenarios: the arena's remaining per-session read is the submission check,
which is genuinely per-account and cannot come off the list.

Keep `sessionDetail` on the port — `/arena/[id]` uses it, and the detail tool
declares more than the list carries (`gridRows`/`gridCols`, the resolved
`coinPool` with categories, `chartIntervalMs`, the fee split). None of that has
been observed yet; see
`market-grid-payloads-that-only-fill-once-someone-plays`.
