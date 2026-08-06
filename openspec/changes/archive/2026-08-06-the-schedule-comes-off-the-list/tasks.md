# Tasks

- [x] 1.1 `GridSessionSummary` carries `status`, `lockAt`, `settleAt`,
      `playerCount`; the list mapper reads them from the row
- [x] 1.2 `WatchArenaQuery` drops the `sessionDetail` fan-out — the submission
      check is the only per-session read left
- [x] 1.3 The arena page reads the schedule off the session and stops saying it
      could not be read; the unread submission check carries its reason
- [x] 1.4 `sessionDetail` stays on the port and on `/arena/[id]`, unchanged
- [x] 1.5 Tests: the mapper keeps the four fields; the arena makes **no** detail
      call; a failed submission check leaves the schedule rendered
- [x] 1.6 `npx tsc --noEmit`, the arena/rendering/architecture suites, and
      `eslint` on the changed files

## The call count, before and after

| | before | after |
|---|---|---|
| list reads | 1 | 1 |
| detail reads | 50 | **0** |
| submission checks | 50 | 50 |
| total | 101 | **51** |

Fifty of the fifty-one that remain are `check_market_grid_submission`, which is
asked about an account rather than a session. No list of sessions answers it,
so it is not removable the way the schedule was.

## Why the detail read is kept rather than deleted

Measured, by taking both payloads for one session on 2026-08-06: the detail
read carries **thirteen keys the list does not** — `id`, `chartIntervalMs`,
`createdAt`, `gridRows`, `gridCols`, `gridSize`, `coinPool` (resolved, where
the list gives `coinPoolPreview`), `coinCount`, `timeframe`, `prizePool`,
`warBondDeployed`, `warBondPoolId`, `coinCaptainBadges`.

None is mapped, because nothing renders them. But the tool is the only route to
them, and `/arena/[id]` is one session and one call. Deleting the port method
would trade a rate limit nobody is hitting for a capability nobody can get
back.

The list, in turn, carries twenty keys the detail does not. The two overlap;
neither contains the other. The only claim this change rests on is the narrow
one it can check: the four schedule fields are identical in both.
