# Proposal: The Session Page Reads Both Payloads

## Why

The two Market Grid reads **overlap; neither contains the other** — measured
live 2026-08-06 on the same session, recorded in
`openspec/backlog/the-session-page-reads-the-narrower-of-two-payloads.md` and
`docs/battlegrid-mcp-surface.json`. `/arena/[id]` reads only
`get_market_grid_session`, so the page devoted to one session cannot show
twenty fields the list carries about that same session:

- `playersNeeded` / `minimumPlayers` — the arena's headline fact ("needs 5
  more players"), absent from the session's own page
- `hostDisplayName` — the detail carries only `hostUserId`
- `itmPercent`, `calculatedItmCount`, `feeBreakdown`, `alpha`,
  `distributionCurveId` — how the money is split, which is the substance of
  deciding whether to enter
- `totalPrizePool`, `entryFee` — the price, already mapped for the arena and
  never shown here
- `coinPicks` — the pick roster, whose envelope (`rosterSize`, `hasPicks`) is
  observed populated even while its rows never are

## What Changes

- **`OpenGridSessionQuery` takes the summary alongside the detail** — one
  extra read of the list the arena already calls, found by id in the rows the
  mapper already produces. No new port method: `sessionSummary(id)` would be a
  second way to ask for a list row, and there is no tool behind it. The id
  rename (`sessionId` on list rows, `id` on the detail) is already absorbed by
  the adapter, which normalises both to `id`.
- The summary lookup is a **three-state outcome**: the row, `not-listed` (the
  list answered and this session was not among its rows — its own named state,
  not an error and not silently nothing), or `unreadable` with the reason.
- **The reads fail independently.** A page holding the detail and not the list
  (or vice versa) renders what it has and says what it could not read, with
  the `WhyNotLoaded` treatment on the unreadable branch.
- `GridSessionSummary` widens — additively — with the list-only fields the
  page renders: `hostDisplayName`, `itmPercent`, `calculatedItmCount`,
  `alpha`, `distributionCurveId`, `feeBreakdown` (the platform's five
  per-entry amounts), and the pick-roster envelope (`pickRosterSize`,
  `hasPicks`). The adapter maps them from the observed row shape.
- `/arena/[id]` renders, from the summary: players still needed against the
  minimum, the host (or that the platform names none), the entry fee and prize
  pool, the money split in the platform's own figures — read, never derived —
  the coin pool, and the roster fact ("36 coins on offer, nobody has picked"),
  which is an observed, coherent state.

## What this does not do

- **No crowd panel.** `crowdUpPercent` / `crowdDownPercent` have only ever
  been `null` and `coinPicks.top` has never had an entry (all 50 rows,
  2026-08-06 — see `market-grid-payloads-that-only-fill-once-someone-plays`).
  `top[]`'s row shape is unobserved, and modelling a declared-only shape is
  the mistake behind three dead paths in HANDOFF.md. When `hasPicks` is true
  the page says picks exist and are not read, the same treatment the settled
  results payload already gets.
- **`payoutStructure` stays unmapped.** The backlog item lists it among the
  money fields, but it has only ever been observed as an empty array — its
  row shape is exactly as unobserved as `coinPicks.top`.
- **`hostAvatarUrl` stays unmapped.** No surface renders avatars; a field
  must reach a reader to earn a mapping.
- The arena list page is untouched. So are `WatchArenaQuery`, the port's
  method set, and the wiring in `composition.ts` (the query already holds the
  port that lists).

## Capabilities

**Modified**: `market-grid` — one MODIFIED requirement
(`A Session Can Be Opened On Its Own`).
