# Proposal: The Schedule Comes Off The List

## Why

`list_market_grid_sessions` returns, per session — observed 2026-08-06 on all
50 rows, recorded in `docs/battlegrid-mcp-surface.json`:

```
status  lockAt  settleAt  playerCount
```

`WatchArenaQuery` then called `get_market_grid_session` **once per session** to
learn those same four fields. Fifty sessions, fifty calls, for data that
arrived in the first one.

That the second call adds nothing is measured, not inferred. Both reads taken
for session `9954544c-3847-4297-be78-bd9c77da481d` on 2026-08-06 22:00Z:

| field | list | detail | |
|---|---|---|---|
| `status` | `"PENDING"` | `"PENDING"` | same |
| `lockAt` | `2026-08-06T22:00:00.000Z` | `2026-08-06T22:00:00.000Z` | same |
| `settleAt` | `2026-08-06T23:00:00.000Z` | `2026-08-06T23:00:00.000Z` | same |
| `playerCount` | `0` | `0` | same |

**That fan-out is where the rate limit was met.** `all-controllers-probe` hit
HTTP 429 on it, and `one-bad-session-must-not-take-the-arena-down` made the
failure survivable rather than unnecessary. Halving the arena's call count
removes the condition instead of degrading under it.

## The second defect, which is the one a reader sees

When a per-session read failed, the arena said:

> This session's schedule could not be read.

While the schedule sat in the list payload that rendered the row. It was the
honest sentence for the data the surface *held*, and the surface held more than
it knew — the same shape as `list_entry_decisions` returning 35 fields to a
mapper that kept 11, and `list_signal_logs` returning 23 keys the product read
while `get_signal_log`'s 31 went unasked. This is that mistake in the other
direction: a detail call made for fields the list already answered.

## What Changes

- `GridSessionSummary` carries `status`, `lockAt`, `settleAt` and
  `playerCount`, mapped from the list rows the platform already sends.
- `WatchArenaQuery` stops calling `sessionDetail`. The arena's remaining
  per-session read is `hasSubmitted`, which is asked about an *account* and
  which no list can answer.
- The arena stops claiming a schedule is unreadable while it holds one. The
  degradation that stays is the one that is still real: `entered` remains
  three-valued, and an unanswered submission check renders as unknown with its
  reason — never as "has not entered", which is a claim.
- `sessionDetail` **stays on the port**. `/arena/[id]` calls it, once, for the
  session a reader opened, and the detail read genuinely carries thirteen keys
  the list does not — measured against the two live payloads, not asserted:

  ```
  id  chartIntervalMs  createdAt  gridRows  gridCols  gridSize
  coinPool  coinCount  timeframe  prizePool
  warBondDeployed  warBondPoolId  coinCaptainBadges
  ```

  Including the *resolved* `coinPool`, where the list carries only
  `coinPoolPreview`. None of it is modelled here — nothing renders it; see
  `market-grid-payloads-that-only-fill-once-someone-plays`.

## The two reads overlap; neither contains the other

The list carries twenty keys the detail payload does not, among them
`minimumPlayers`, `playersNeeded`, `coinPicks`, `crowdUpPercent`,
`crowdDownPercent` and `hostDisplayName`. So "the list is a subset of the
detail" was never true, and the rule this change encodes is narrower and
checkable: **the four schedule fields are identical in both, so the arena reads
them once.**

One consequence is left unbuilt on purpose: `/arena/[id]` reads only the detail
and may therefore be missing fields the list would have given it — the players
it still needs, most obviously. That is a different surface and a different
diff.

## What this does not do

It does not map the rest of what the list carries. `feeBreakdown`,
`payoutBandSummary`, `jackpotPayoutHighlights`, `warBond*` and the crowd
consensus are all on the wire and nothing renders them — mapping a field nobody
shows is how a mapper acquires a shape nobody checks.

It also claims nothing about what the arena holds. On 2026-08-06 the list
answered 2 PENDING sessions and 48 CANCELLED, every one with `playerCount: 0`;
the fixtures here are examples, and no scenario is written as if sessions are
running.

## Capabilities

**Modified**: `market-grid` — one MODIFIED requirement.
