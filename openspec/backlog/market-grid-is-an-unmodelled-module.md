---
id: market-grid-is-an-unmodelled-module
title: The Market Grid prediction game is a whole module the app does not model
type: feature
status: open
priority: p3
created: 2026-07-31
updated: 2026-08-06
change: "the-game-is-legible-before-it-is-played"
capability: "market-grid"
blocked_by: []
tags: [battlegrid, market-grid, product-model]
---

# The Market Grid prediction game is a whole module the app does not model

## What

The operator (2026-07-31, `docs/BATTLEGRID_PRODUCT_MODEL.md`): a prediction
game, separate from radar — each session assigns nine coins, and the user
deploys an already-configured agent to play; the agent chooses the coins
itself. Ten tools serve it (sessions, player grids, results, submission
checks, three submit variants plus agent-grid generation, game presets), plus
`get_leaderboard`. Grid-Commander uses none of them.

## Why P3

It reuses agents the app already authors, so the entry point exists; but it is
a self-contained game loop, not a gap in the current authoring promise. Worth
modelling after the radar question (`does-an-agent-act-without-a-radar-deployment`)
settles the deployment story.

## First step when taken

Read-only: sessions list + results + leaderboard as an "arena" surface —
watching before playing, the same read-first pattern every other capability
followed. The submit tools are writes and one
(`random_submit_market_grid`) smells like a stake; classification and
consequence wording before any of them is offered.

## First observation done (2026-08-01, read-only, live)

The read surface answered; the shapes an arena surface needs are recorded:

- **`list_game_presets`** — the game's rulebook, per preset ("CRYPTO WARS",
  `MARKET_GRID`): `timeRangeKey 1H`, 3×3 grid of 9, `entryFee 10`,
  `changeMultiplier 100`, `captainMultiplier 2`, wrong-penalty multipliers,
  perfect-game jackpot condition, regime reference `BTC/4h`. The economics
  live here, not on the session.
- **`list_market_grid_sessions`** — `sessionId`, preset id, display name,
  `timeRangeKey`, `coinPoolPreview` (coinId+ticker pairs: BTC, BNB, APT,
  AVAX, ETH, HYPE, …).
- **`get_market_grid_session`** — `status PENDING`, `lockAt`/`settleAt`
  (hourly cadence observed), `chartIntervalMs 300000`, `playerCount`.
- **`get_market_grid_results` before settle** — an honest refusal:
  `CONFLICT "Results are published after the session settles"`. A state the
  surface renders, not an error.
- **`check_market_grid_submission`** — clean `{hasSubmitted: false}`.
- **`list_session_agent_positions`** — rich zeroed totals (margined / open
  value / notional / unrealized PnL, long/short counts) for a session the
  account has not played.
- **PLATFORM MISMATCH: `get_market_grid_player_grid` with no submission
  answers `INTERNAL_ERROR` (500)**, not a clean "no grid" — the
  `get_market_context` shape of defect, again. Any surface must treat that
  500 as "not played yet" only after `check_market_grid_submission` says so,
  never by interpreting the 500 itself.
- `get_leaderboard` and `get_top_ranked_coins` refused guessed args —
  their declared shapes need reading from the discovery before use.

**Ready to take**: the read-only arena slice (sessions + per-session state
+ results-after-settle + submission status), one describe-block of
rendering tests per state, refusal-honest throughout. The submit tools
(`submit_market_grid`, `random_submit_market_grid` — entry fee 10 means
REAL STAKE) stay out of scope until consequence wording and classification
are settled through the full ceremony.

## The arena slice shipped (2026-08-01)

`the-arena-is-watchable` (archived, capability `market-grid`): `/arena`
lists every session with schedule, coin pool and the entered fact — the
entered fact from `check_market_grid_submission` alone, the player-grid
tool never called (the 500 rule, now a spec scenario). What remains of this
item:

- **The writes** — `submit_market_grid` / `random_submit_market_grid`
  stake a real entry fee; consequence wording + classification through the
  full ceremony before either is offered.
- **`get_leaderboard` / `get_top_ranked_coins`** — declared arg shapes
  still need the discovery read before any surface uses them.
- **The settled-results payload** — still never observed on this account;
  the port carries it opaque until one settles with a submission in.

## The read half shipped (2026-08-06)

`the-game-is-legible-before-it-is-played` (capability `market-grid`): the
rulebook from `list_game_presets`, the price and player counts off the session
list, `/arena/[id]` opening one session, and `get_market_grid_results` finally
called — as a state, with the settled payload carried opaque.

Two of the three bullets above are settled:

- **The arg shapes are read.** `get_leaderboard` (metric + timeframe, optional
  `gameType` / `limit`) has been consumed by `agent-comparison` since
  `the-field-is-visible`, and `get_top_ranked_coins` (interval + metric) by the
  market adapter. Nothing about either is guessed any more. What is left of
  that bullet is narrower and filed as
  `market-grid-standings-need-a-gametype-not-a-second-mapper`.
- **The settled payload** moved to
  `market-grid-payloads-that-only-fill-once-someone-plays`, with the player
  grid and the crowd consensus beside it — three shapes, one blocker.

**What remains here is the writes, and only the writes.** Entry fee 10 per
session, observed on all 50 rows the list returned on 2026-08-06. Whether this
client moves a user's stake at all is a product decision before it is an
engineering one.
