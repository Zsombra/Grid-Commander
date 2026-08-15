---
id: market-grid-payloads-that-only-fill-once-someone-plays
title: Three Market Grid shapes are unobserved for one reason — nobody on this account has played
type: question
status: open
priority: p3
created: 2026-08-06
updated: 2026-08-15
change: ""
capability: market-grid
github: "104"
blocked_by: []
tags: [battlegrid, market-grid, unobserved-shape]
---

# Three Market Grid shapes are unobserved, for one reason

`the-game-is-legible-before-it-is-played` mapped everything the platform
answers to an account that watches. These three it does not, and they share a
blocker: **no account here has ever entered a session, or watched one through
settlement.**

## 1. The settled results payload — never seen at all

`get_market_grid_results` declares twenty-two fields — `leaderboard`,
`playerGrids`, `resolutions`, `coinBoard`, `settledMarketData`, per-coin
capture provenance, session accuracy. Every read of it on this account has
answered the pre-settle refusal:

```
CONFLICT  Results are published after the session settles
```

So `GridResultsOutcome.settled` carries `payloadUnmodelled` and `/arena/[id]`
says results exist and that Grid-Commander does not read them. Twenty-two
declared key names are twenty-two guesses; the three dead write paths in
`HANDOFF.md` all began as a declaration read as an observation.

## 2. The player grid — a 500 for the question it exists to answer

`get_market_grid_player_grid` answers `INTERNAL_ERROR` (500) when the account
has not submitted (established live 2026-08-01). It is called nowhere, and the
played fact comes from `check_market_grid_submission` alone — now a scenario in
`openspec/specs/market-grid/spec.md`. Its own payload, the one that would show
what an agent called and how each cell scored, has therefore never been seen
either.

## 3. The crowd consensus and the pick roster — populated fields that are empty

On every one of the 50 sessions the list returned on 2026-08-06:

```json
"crowdUpPercent": null, "crowdDownPercent": null,
"coinPicks": {"hasPicks": false, "top": [], "rosterSize": 0, …}
```

The envelope is real; the rows have never had anything in them. `coinPicks.top`
declares `ticker`, `picks`, `upPct`, `intensity`, `dir` and a `tint` — a
what-is-everyone-else-calling panel, and a good one, the moment a session with
players in it can be observed.

## Why it matters

The crowd panel is the most interesting read in the module: it is the only
thing on the surface that says what other players think, which is the whole
texture of a prediction game. It is also the cheapest — it rides on a list the
arena already calls.

## First step when taken

**There is nothing to poll for.** `list_market_grid_sessions` has now been read
whole three times — 2026-08-06, 2026-08-12, 2026-08-13 — and every session on
every read carried `playerCount: 0`. Running it a fourth time to look for a
session with players in it is a read whose answer is already on record.

What would have to change first is not a read: **one session, anywhere this
listing can see, reaching its five-player minimum** — which would first show as
a row whose `playersNeeded` no longer equals its `minimumPlayers`, meaning at
least one player counted, not yet five. Nothing this account, this product, or
the operator can do produces that; it needs other people to enter. If it ever
happens, the order is unchanged: re-read that row and see whether
`coinPicks.top` and `crowdUpPercent` / `crowdDownPercent` fill — the crowd
panel, buildable with no stake and no new call — then follow that same session
through `LIVE → RESOLVING → SETTLED` and record what `get_market_grid_results`
actually returns.

Settling 1 and 2 needs an entry, which needs the writes — see
`market-grid-is-an-unmodelled-module`.

---

# Re-read 2026-08-06 — one shape was recorded wrong, and nobody is playing

`list_market_grid_sessions` re-read whole, 50 rows.

## The arena is empty, and that is the blocker

```
status:       PENDING 2   CANCELLED 48
playerCount:  0 on all 50 — every session, both statuses
```

The two PENDING sessions (`CRYPTO WARS`, `STOCKS OFFENSIVE`) each need **5**
players and have **0**, with `entryFee: 10`. The 48 CANCELLED ones also have
`playerCount: 0` — so the reason they cancelled is plainly that nobody entered.

This is stronger than "no account here has played". **No account anywhere has
played any session this listing can see.** Polling for a session with players
in it, which this item's first step proposes, has nothing to find at present.

## `coinPicks` was quoted wrong, and the correction matters

The item records `"coinPicks": {"hasPicks": false, "top": [], "rosterSize": 0, …}`.
`rosterSize` is **not** 0. Every row carries a populated roster:

```json
{"top": [], "rosterSize": 36, "others": 36, "hasPicks": false,
 "topLeanUp": 0, "topLeanDown": 0, "topLeanEven": 0}
```

47 rows at `rosterSize: 36`, 3 at `rosterSize: 31`. And three fields the item
never named — `others`, `topLeanUp`, `topLeanDown`, `topLeanEven` — are on the
payload today.

So the envelope is fuller than recorded: the **roster of coins available to be
picked** is real and populated, and only the **picks** are empty. `hasPicks:
false` with `rosterSize: 36` is a coherent state (36 coins on offer, nobody has
picked), not the empty shell the item describes. `top[]` remains unobserved on
every row.

`crowdUpPercent` / `crowdDownPercent` are still `null` on all 50.

## A fourth unobserved shape, and a sentence that is wrong today

`get_market_grid_results` on a **CANCELLED** session:

```
CONFLICT  Results are not available yet: Market Grid session … is CANCELLED.
          Results are published after the session settles.
```

A different message from the pre-settle refusal this item quotes, and it names
the status. But a CANCELLED session **never settles**, so "not available yet"
and "published after the session settles" describe a wait that will not end.
That is the platform's wording, not this product's — but this product repeats
the promise. See `a-cancelled-session-is-told-to-wait-for-settlement`.

## What this does to the item

It stays open and its first step stands, unchanged in substance and weaker in
prospects: watch, do not play. But it should be re-read as **blocked on the
platform having players at all**, not on this account choosing to enter. Nothing
here can be settled by anything this session or the operator does.

The one thing that did move: the crowd panel's roster half is observed. Still
not buildable — `top[]` is where the tickers, `picks`, `upPct`, `intensity`,
`dir` and `tint` live, and it has never had an entry.

---

# Re-checked 2026-08-12 — unchanged on v17.2.0

50 rows again: PENDING 2, CANCELLED 48, `playerCount: 0` on every one.
Six days and two platform majors after the last read, still no account
anywhere visible has entered a session. The item stays blocked on the
platform having players at all; nothing to poll for.

---

# Re-checked 2026-08-13 — third confirmation, now on v18.2.0

`list_market_grid_sessions` read whole at ~20:00 UTC, read-only, against the
account whose `get_account_state` answers `username: "Fibonacci"`, BattleGrid
v18.2.0.

```
rows:           50   (payload key is `sessions`, not `entries`)
status:         PENDING 2   CANCELLED 48
playerCount:    0 on all 50
minimumPlayers: 5 on all 50
playersNeeded:  5 on all 50
```

`playersNeeded` equal to `minimumPlayers` on every row is the same fact as
`playerCount: 0`, said from the other side: not one player is counted against
any session's minimum, on either status.

## Three reads, one week apart, and no player anywhere

| Read | Platform | Rows | PENDING | CANCELLED | `playerCount` |
|---|---|---|---|---|---|
| 2026-08-06 | not recorded here — two majors before v17.2.0, per the 2026-08-12 note | 50 | 2 | 48 | 0 on all 50 |
| 2026-08-12 | v17.2.0 | 50 | 2 | 48 | 0 on all 50 |
| 2026-08-13 | v18.2.0 | 50 | 2 | 48 | 0 on all 50 |

Three reads spanning a week and at least three platform versions, and not one
session this listing reaches has ever had a player on it.

**48 of 50 CANCELLED is the answer, not a hole in it.** What is measured is the
pair: CANCELLED on 48 rows, `playerCount: 0` on every one of them. That they
cancelled *for want of* the five-player minimum is inferred from that pair — no
field read here states a cancellation reason. The life cycle that inference
describes is sessions created, never filled, expiring unplayed. The empty crowd
panel is not a payload this account has failed to catch; it is a state the
platform has not produced anywhere this listing reaches.

## Row keys, and the envelope confirmed

The row keys recorded today are `alpha`, `calculatedItmCount`, `coinPicks`,
`coinPoolPreview`, `crowdDownPercent`, `crowdUpPercent`, `displayName`,
`distributionCurveId`, `entryFee`, `feeBreakdown`, `feeConfig`,
`finalScoringSource`, `gamePresetId`, `gameType`. That sample is alphabetical
and stops at `gameType` — it is a prefix of the row's keys, not an inventory of
them, and nothing here says a key is absent.

Two things follow. First, `coinPicks`, `crowdUpPercent` and `crowdDownPercent`
are all still present at v18.2.0 — the envelope this item is about has held
across all three reads. Their *values* were not recorded in this read; with
`playerCount: 0` on every row they cannot have filled, but that is inferred
from the player count, not read off the fields.

Second, the list payload's rows sit under `sessions`. That matches
`src/infrastructure/battlegrid/market-grid-adapter.ts:70`, which reads
`content['sessions']` and raises `GridPayloadError('sessions')` otherwise. Worth
stating because other BattleGrid list tools use an `entries` envelope
(`src/infrastructure/battlegrid/agent-adapter.ts:367`) and this one does not.
Nothing to change.

## What this does to the item

It stays open. All three shapes it exists for — the settled results payload, the
player grid, and a populated `coinPicks.top` — remain unobserved, and remain
unobservable by anything this account does.

What moved is the first step, rewritten above. The 2026-08-06 note that the
first step "stands, unchanged in substance" no longer holds: polling for a
session with players now has three reads of evidence against it, and this item
should not send a fourth reader to run it. The condition to watch for is stated
in its place — a row where `playersNeeded` falls below `minimumPlayers` — along
with the fact that no amount of polling makes it arrive sooner.

---

# Re-checked 2026-08-15 — fifth confirmation, same shape

Tripwire sweep, one shared listing read: 50 rows, PENDING 2 / CANCELLED 48,
`playersNeeded == minimumPlayers == 5` and `playerCount: 0` on every row.
The watch condition and follow-up order below stand unchanged.

Later sweeps the same local day repeated the read with the identical shape
on every row — sixth and seventh confirmations in the refill and census
sessions (recorded in their journal entries), and an eighth at
2026-08-14T21:51Z (04:51 local Aug 15): 50 rows, 0 with
`playersNeeded < minimumPlayers`.

---

# Re-checked 2026-08-14 — fourth confirmation, as a tripwire not a poll

Read as part of the operator-directed session-start tripwire sweep (one
listing read shared with the other tripwires, not a dedicated poll — the
2026-08-13 advice against sending a fourth reader stands for dedicated
reads). 50 rows: PENDING 2, CANCELLED 48, `playersNeeded == minimumPlayers
== 5` and `playerCount: 0` on every row. Four reads across eight days and
four platform states, no player anywhere this listing reaches. The watch
condition is unchanged: a row where `playersNeeded < minimumPlayers` is the
first sign of life, and the follow-up order stands (re-read that row's
`coinPicks.top` and crowd percentages, then follow the same session through
`LIVE → RESOLVING → SETTLED`).
