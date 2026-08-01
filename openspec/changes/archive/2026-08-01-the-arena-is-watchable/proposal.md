# Proposal: The Arena Is Watchable

## Why

Step one of `market-grid-is-an-unmodelled-module` — the last of the
operator's four BattleGrid modules with zero product surface. The read-only
slice first, the same watch-before-acting pattern every capability followed
(deployment visibility before deploy; roster before create). The shapes
were observed live 2026-08-01 and are recorded in the item: presets carry
the economics, sessions carry the schedule and coin pool, results refuse
honestly before settle, and one platform 500 needs routing around.

## What Changes

- **`MarketGridPort`** + `McpMarketGridAdapter`: `listSessions`,
  `sessionDetail`, `results`, `hasSubmitted` — reads only. The adapter
  encodes the observed platform rules: a results request before settle is a
  distinct `not-settled` state (the CONFLICT refusal), and the player-grid
  500 is never interpreted — played/not-played comes only from
  `check_market_grid_submission`.
- **`/arena` page** (linked from the main nav): the sessions list — name,
  status, lock/settle times, coin pool, player count — and per-session
  whether this account has entered. Unreadable states render as unknown,
  never as empty.
- Rendering tests per branch (the new layer), mapper refusal tests,
  composition wiring.

## Capabilities

**New**: `market-grid` — watching the arena. (Playing it — the submit tools
carry a real entry fee — is explicitly out of scope and stays behind full
ceremony.)

## Out of Scope

- All writes (`submit_market_grid`, `random_submit_market_grid`,
  `submit_agent_grid`, `generate_agent_grid`, `update_market_grid`).
- Leaderboard and top-coins (arg shapes unread; their own slice).
- Results rendering beyond the settled/not-settled distinction (the settled
  payload is large and unobserved on this account — modelling it from the
  declaration alone is the mistake this project does not repeat).
