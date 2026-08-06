# Proposal: The Game Is Legible Before It Is Played

## Why

Market Grid is a whole module of BattleGrid — the operator's own framing
(`docs/BATTLEGRID_PRODUCT_MODEL.md`, 2026-07-31): a prediction game where each
session deals **nine coins** and you deploy an already-configured agent to call
them. Around ten tools serve it. Grid-Commander reads three.

What `/arena` shows today is a schedule. It lists sessions with their lock and
settle times, their coin pools and whether this account entered — and says
nothing about **what the game is or what it costs**, while the platform has
been answering both all along:

```
list_game_presets    CRYPTO WARS · MARKET_GRID · 1H · 3×3 grid of 9
                     entryFee 10 · change ×100 · captain ×2 (×2 wrong)
                     wrong ×1 · jackpot, perfect game required
                     minimum 4 players, cancels below it
list_market_grid_…   entryFee 10 · totalPrizePool · playersNeeded · minimumPlayers
                     on all 50 sessions
```

A surface that shows a game without its price is describing a free one. The
entry fee is the single most consequential number in this capability: it is why
the capability reads and does not play.

The second gap is `get_market_grid_results`. It has been on the port since
`the-arena-is-watchable` and **nothing has ever called it** — so the one thing
an arena is for, seeing how a session came out, has never been asked.

## What Changes

- **The rulebook** — `list_game_presets`, one unscoped call, read into the
  arena: grid shape and coins per game, window, entry fee, the multipliers for
  a right call, a captain pick and a wrong one, the jackpot condition, and the
  player minimum a session is cancelled below.
- **The price on every session** — `entryFee`, `totalPrizePool`,
  `playersNeeded` and `minimumPlayers` come off the list, so they are known for
  every session that appears at all, including one whose per-session reads
  failed.
- **A session opens** — `/arena/[id]` reads that session's detail, its
  submission check and its results. Results are read here rather than in the
  arena's fan-out: the list carries fifty sessions and is already where the
  platform's rate limit was met.
- **Results become a state.** The pre-settle CONFLICT was already understood as
  "not yet"; a results read that *fails* is now `unreadable` rather than a
  thrown error, because a route calls it now and a throw at a route is a 500 —
  the outcome `one-bad-session-must-not-take-the-arena-down` made
  unrepresentable for the two reads beside it.
- **The model surface follows**: `read_game_rules` and `read_grid_session`
  alongside `watch_arena`, both reads, both through the same use cases.

## What is deliberately not here

- **Playing.** `submit_market_grid`, `random_submit_market_grid`,
  `update_market_grid`, `submit_agent_grid` and `generate_agent_grid` stake a
  real entry fee — 10 per session, observed. Offering any of them means the
  full describe → confirm → perform ceremony, consequence wording, and a
  product decision about whether this client moves a user's stake at all. It
  stays in `market-grid-is-an-unmodelled-module`, unchanged by this change.
- **The settled results payload.** Never observed: no session on this account
  has ever been entered or watched through settlement. It is carried opaque and
  the surface says so. Filed as
  `market-grid-payloads-that-only-fill-once-someone-plays`.
- **The player grid.** `get_market_grid_player_grid` answers a **500** for "you
  have not played", so it cannot be used to ask the question it exists for. It
  is not called anywhere, and the played fact still comes from
  `check_market_grid_submission` alone.
- **The crowd consensus and the pick roster.** `crowdUpPercent`,
  `crowdDownPercent` and `coinPicks.top` are on every session row and have only
  ever come back null, null and empty. Same filing as the settled payload.
- **A Market Grid leaderboard.** `get_leaderboard` is already consumed — by
  `agent-comparison`, unfiltered — and its `metric`/`timeframe` arguments are
  long since read from the discovery, which closes that bullet of the backlog
  item. Its **rows** have never been observed populated by anything, on either
  account, and `/explorer` renders only `currentUser` from it. The game-scoped
  version is one declared enum argument (`gameType: MARKET_GRID`) on a tool the
  product already calls, so the honest build is to widen the existing read, not
  to grow a second leaderboard mapper inside this capability. Filed as
  `market-grid-standings-need-a-gametype-not-a-second-mapper`.
- **The schedule the list already carries.** `list_market_grid_sessions`
  returns `status`, `lockAt`, `settleAt` and `playerCount` for every row, which
  the arena re-reads per session through `get_market_grid_session`. Taking them
  off the list would retire that fan-out and three spec scenarios with it —
  a behaviour change to a requirement, not an addition. Filed as
  `the-session-list-already-carries-the-schedule`.
- **The fee split, payout bands, jackpot highlight table, war bond and host
  columns.** Populated, real, and rendered by nothing. Mapping a field no
  surface reads is how a mapper acquires a shape no test checks.

## Capabilities

**Modified**: `market-grid` — three ADDED requirements. The existing
requirement, *The Arena Is Watchable Without Being Played*, is untouched: every
one of its scenarios still holds, and the capability's Purpose — reads only —
is what this change spends most of its words honouring.
