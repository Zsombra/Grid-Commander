# Tasks

- [x] 1.1 `MarketGridPort.gameRules` and a `GamePreset` carrying only fields
      observed populated on 2026-08-06; an absent fee stays null, never 0
- [x] 1.2 The session summary carries what entering costs — entry fee, pool,
      players needed and minimum — mapped from the list the arena already reads
- [x] 1.3 `GridResultsOutcome` gains `unreadable`, and the settled payload is
      renamed `payloadUnmodelled` so its status is in its name
- [x] 1.4 `ReadGameRulesQuery` and `OpenGridSessionQuery`, wired in the
      composition root and in the rendering fakes
- [x] 1.5 `/arena` shows the rulebook and prices each session; every row opens
- [x] 1.6 `/arena/[id]`: schedule, entry state, and results as a state — a
      settled session says results exist and reports no figure from them
- [x] 1.7 `read_game_rules` and `read_grid_session` on the MCP surface, both
      through the use cases, both read-only by reachability
- [x] 1.8 Tests: preset mapping, the price that must not fall back to zero, a
      failed results read that is not "not settled", both pages branch by branch
- [x] 1.9 `all-controllers-probe` walks the two new controllers (26 → 28, with
      `openGridSession` skipped by name when nothing is listed)
- [x] 1.10 Backlog: what was left unbuilt and why — the writes, the unobserved
      payloads, the game-scoped leaderboard, the schedule the list already
      carries

## Notes from the build

**The price was in a payload the product already read.** `entryFee: 10` sits on
every session `list_market_grid_sessions` returns, and the arena has been
calling that tool since 2026-08-01. Nothing was missing from the platform; the
mapper stopped at three fields.

**`results()` was dead code with a live contract.** It has been on the port
since the arena shipped and no caller ever existed, which is why it could still
throw: nothing was there to be broken by it. Wiring a page to it turned a
latent 500 into a real one, so it now returns `unreadable` like every read
beside it — and the test that used to assert `rejects.toThrow` now asserts the
distinction that actually matters, that a failed read is not the not-settled
state.

**Three of the ten Market Grid tools stay uncalled on purpose**, and each for a
different reason: the submit family stakes real money, the player grid answers
a 500 for the question it exists to answer, and the settled results payload has
never been seen. Only the first is a product decision; the other two are the
observation rule this repository has paid for three times.
