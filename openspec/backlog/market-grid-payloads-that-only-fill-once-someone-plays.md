---
id: market-grid-payloads-that-only-fill-once-someone-plays
title: Three Market Grid shapes are unobserved for one reason — nobody on this account has played
type: question
status: open
priority: p3
created: 2026-08-06
updated: 2026-08-06
change: ""
capability: market-grid
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

Watch, do not play. Poll `list_market_grid_sessions` for a `PENDING` session
whose `playerCount` is above zero and re-read it; if `coinPicks.top` fills, the
crowd panel is buildable with no stake and no new call. Then follow one session
with players through `LIVE → RESOLVING → SETTLED` and record what
`get_market_grid_results` actually returns.

Settling 1 and 2 needs an entry, which needs the writes — see
`market-grid-is-an-unmodelled-module`.
