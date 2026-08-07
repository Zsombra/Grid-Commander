# nothing-records-what-the-signals-said Decision Log

## Purpose

Track high-signal decisions across planner, executor, and auditor phases.
Do not log cosmetic updates. Log only items that affect scope, risk,
validation, waivers, or handoff clarity.

## Entry Format (Required)

- Timestamp: `<YYYY-MM-DD HH:MM TZ>`
- Phase: `PLANNING | EXECUTION | AUDIT`
- Type: `scope-change | exception | risk | waiver | handoff`
- Decision: `<what was decided>`
- Impacted files: `<path list>`
- Reason: `<why>`
- Approved by: `<name/role>`
- Next action: `<required follow-up>`

## Entries

### DL-001

- Timestamp: `2026-08-07 07:30 UTC`
- Phase: `PLANNING`
- Type: `handoff`
- Decision: Scope boundaries fixed to the proposal: capture + store + coverage
  + web/MCP reads. The six out-of-scope items (analysis, evaluation retention,
  weighted captures, other market data, scheduler, retention controls) are not
  to be implemented in any form; three are filed as backlog items.
- Impacted files: whole change folder
- Reason: The proposal's Out of Scope section is the contract; two of the cuts
  (weighted captures, other market data) are safe because the recorded raw
  scores/allocations and the platform's own retroactive reads make them
  recoverable later.
- Approved by: operator (proposal approved 2026-08-07, PR #74)
- Next action: Executor implements phases A–H only.

### DL-002

- Timestamp: `2026-08-07 07:30 UTC`
- Phase: `PLANNING`
- Type: `exception`
- Decision: The platform read lands on `MarketPort` as `coinSignalPreview`,
  and the store implementation is named
  `drizzle-signal-record-store.ts` — diverging from `design.md`'s File
  Changes sketch (`src/ports/strategies.ts`, `signal-record-repo.ts`).
- Impacted files: `src/ports/market.ts`,
  `src/infrastructure/db/repositories/drizzle-signal-record-store.ts`
- Reason: `MarketPort`'s own doc comment claims exactly this territory —
  agent-independent market reads (`get_top_ranked_coins` precedent) — and the
  unweighted preview is agent-independent by construction. Store naming
  follows the existing `drizzle-proposal-store.ts` convention. The planner
  does not edit `design.md` (outside `plan/`); the executor updates its File
  Changes list to match when implementation starts, keeping artifacts
  truthful.
- Approved by: planner (placement is planning detail; behavior unchanged)
- Next action: Executor reconciles `design.md` File Changes in Phase B.

### DL-003

- Timestamp: `2026-08-07 07:30 UTC`
- Phase: `PLANNING`
- Type: `risk`
- Decision: The platform server version is read from the MCP client's
  `initialize` handshake (SDK `getServerVersion()` or equivalent accessor
  exposed by `mcp-adapter.ts`), stored nullable, and rendered as
  version-unknown when absent.
- Impacted files: `src/infrastructure/battlegrid/mcp-adapter.ts`,
  `src/infrastructure/battlegrid/market-adapter.ts`,
  `src/infrastructure/db/schema/index.ts`
- Reason: The product currently has no path to the live server version (only
  `tests/live/surface-freshness.test.ts` reads it, via a raw HTTP
  `initialize`). The capture requirement stamps each row with the platform
  generation; the handshake is the zero-extra-call source. If the SDK version
  in use does not expose it, recording `null` is honest and the schema
  permits it — inventing or omitting the column is not.
- Approved by: planner
- Next action: Executor verifies the SDK accessor exists in Phase B; if not,
  exposes the handshake result from the adapter's own connect path.

### DL-004

- Timestamp: `2026-08-07 07:30 UTC`
- Phase: `PLANNING`
- Type: `exception`
- Decision: Capture writes no audit entry.
- Impacted files: `src/application/use-cases/capture-signals.command.ts`
- Reason: Policy P3 and the audit spec cover writes made on the user's behalf
  **to BattleGrid**; capture calls read-annotated tools only and mutates
  nothing on any account. Its own record (the capture row, including failed
  captures) is the accountability trail for what it did. This mirrors the
  proposals store precedent: recording in our own store is not a platform
  write. The read-only and live-writes guards still apply to the probe and
  the MCP tools.
- Approved by: planner
- Next action: Auditor verifies no mutating tool is reachable from the
  capture path at gate time.

### DL-005

- Timestamp: `2026-08-07 07:30 UTC`
- Phase: `PLANNING`
- Type: `handoff`
- Decision: One definition of a coverage gap, owned by
  `read-record-coverage.query.ts`: a spacing between consecutive captures of
  a coin+interval series greater than 2× that series' median spacing, plus
  the open interval since the last capture when it exceeds the same bound.
  Failed captures count as attempts (they interrupt a gap) but are reported
  distinctly.
- Impacted files: `src/application/use-cases/read-record-coverage.query.ts`,
  `tests/recording/coverage.test.ts`
- Reason: The spec requires gaps to be visible without prescribing the
  arithmetic; the Iron Rule requires exactly one definition, computed in the
  use-case layer. Median-relative is cadence-agnostic (hourly and daily
  recorders both get honest gaps) and needs no configured constant. The
  executor may refine the bound with a decision-log entry if tests show it
  misleads at real cadences — the requirement is "never present the record
  as more continuous than it is", not the multiplier.
- Approved by: planner
- Next action: Executor implements and tests the daily-cadence/3-day-hole
  scenario against exactly this definition.

### DL-006

- Timestamp: `2026-08-07 07:30 UTC`
- Phase: `PLANNING`
- Type: `handoff`
- Decision: Executor handoff notes. (1) The capture loop's per-coin isolation
  is the load-bearing behavior — one coin's refusal or mapper throw becomes a
  failed-capture row and the loop continues; assert it with a fake that
  throws mid-sequence. (2) The raw payload column stores the platform's
  answer as received (post-envelope-unwrap, pre-mapper); the db test must
  prove a key absent from the domain type survives round-trip. (3) The CLI
  boot mirrors `bin/grid-commander-mcp.ts` including the refusal message
  pattern; `exitCodeFor` is a pure exported function so exit semantics are
  unit-testable without spawning. (4) MCP tool descriptions follow the
  no-counts rule — say "every evaluated signal", never "84 signals". (5) Add
  the two new tables to `tests/db/support.ts`'s truncation list or every
  later db test inherits leakage.
- Impacted files: phases A–H per the master plan
- Reason: These are the five places the codebase's own history says this
  kind of work goes wrong (mapper drops, vacuous fakes, silent skips).
- Approved by: planner
- Next action: Executor begins Phase A after operator approval of the plan.
