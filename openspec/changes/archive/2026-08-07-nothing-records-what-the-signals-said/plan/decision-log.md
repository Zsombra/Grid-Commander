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

### DL-007

- Timestamp: `2026-08-07 08:00 UTC`
- Phase: `EXECUTION`
- Type: `exception`
- Decision: Refined DL-005's gap semantics: gaps are derived over **recorded
  captures only**; failed attempts are counted apart (`failedAttemptCount`)
  and never interrupt a gap. A series with attempts and zero successes is a
  distinct coverage state (`neverCaptured`), listed rather than dropped.
- Impacted files: `src/domain/recording/coverage.ts`,
  `src/application/use-cases/read-record-coverage.query.ts`,
  `tests/recording/coverage.test.ts`
- Reason: DL-005 said failed captures "interrupt a gap"; implementing showed
  that misleads — a three-day span of nothing-but-failures has no readings,
  and presenting it gap-less renders a data hole as coverage. The failure
  counts beside the gap explain it without filling it. And the first draft of
  the query silently dropped all-failed series from the coverage list, which
  is precisely the "failure indistinguishable from never-attempted" state the
  spec forbids — caught in self-review, fixed as `neverCaptured`.
- Approved by: executor (within DL-005's stated refinement latitude)
- Next action: none — tested at the definition and the surface.

### DL-008

- Timestamp: `2026-08-07 08:10 UTC`
- Phase: `EXECUTION`
- Type: `exception`
- Decision: The live-writes guard's `*Command` arm now derives what a class
  can reach instead of matching its spelling, via a derivation shared with
  `mcp-read-only.test.ts` (`tests/support/write-reachability.ts`): a Command
  is gated iff its use-case file can reach a mutating port method, and an
  unresolvable class fails closed. Both guards' mention-checks also now read
  comment-stripped source. `mcp-read-only` was refactored onto the shared
  module with behavior unchanged (12/12 green).
- Impacted files: `tests/support/write-reachability.ts` (new),
  `tests/architecture/live-writes.test.ts`,
  `tests/architecture/mcp-read-only.test.ts`
- Reason: `recorder-probe.test.ts` constructs `CaptureSignalsCommand`, whose
  every platform call is a read — the guard's own comment had priced this
  case as "costs nothing", but the cost was real: a read probe locked out of
  every keyed CI run behind a *writes* opt-in. The standing corollary
  applied: when a rule and an honest new case disagree, fix the rule by
  deriving from reachability, never by exempting the file. The refinement is
  pinned both directions in the guard (`ForkStrategyCommand` still writes;
  `MadeUpCommand` fails closed).
- Approved by: executor; flagged for the auditor's attention as a guard
  change inside the change it guards
- Next action: Auditor re-checks the pinned assertions against the merged
  tree.

### DL-009

- Timestamp: `2026-08-07 08:15 UTC`
- Phase: `EXECUTION`
- Type: `scope-change`
- Decision: Two artifacts reconciled to implementation truth: `design.md`'s
  File Changes rewritten (DL-002's placement executed: `MarketPort` +
  `drizzle-signal-record-store.ts`; the run table and shared derivation
  added), and a third table (`signal_capture_runs`) added beyond the
  proposal's "two tables" impact estimate — provenance and platform version
  are run facts, and duplicating them per coin row would let two rows of one
  run disagree.
- Impacted files: `openspec/changes/…/design.md`,
  `src/infrastructure/db/schema/index.ts`
- Reason: The artifacts must describe what is true, not what was guessed;
  behavior (the delta specs) is unchanged.
- Approved by: executor
- Next action: none.

### DL-010

- Timestamp: `2026-08-07 08:20 UTC`
- Phase: `EXECUTION`
- Type: `risk`
- Decision: Task 8.2 (one full capture against the real platform) stays open:
  this environment holds no `BATTLEGRID_API_KEY`, by design. The key-gated
  probe is written and runs with the first keyed `tests/live/` invocation.
- Impacted files: `tests/live/recorder-probe.test.ts`, `tasks.md`,
  `verification.md`
- Reason: The live proof is one command away for the operator and impossible
  here; shipping the probe un-run is the same posture every capability in
  this product shipped with. The mapper's contract is additionally held by
  the observed-shape fixture and the db suite's raw round-trip.
- Approved by: executor
- Next action: Operator (or first keyed session) runs
  `BATTLEGRID_API_KEY=… npx vitest run tests/live/recorder-probe.test.ts`.

### DL-011

- Timestamp: `2026-08-07 08:25 UTC`
- Phase: `EXECUTION`
- Type: `handoff`
- Decision: Auditor handoff notes. (1) The no-users-row property is
  load-bearing for personal deployments — `tests/db/signal-record.test.ts`
  "needs no users row" pins it, and the same inspection surfaced a suspected
  latent FK bug in the proposals table, filed as
  `a-proposal-cannot-be-recorded-on-a-personal-deployment` (p2), not fixed
  here. (2) The bin refusal branch is verified by construction, not by test —
  `verification.md` states it plainly. (3) The MCP tool descriptions were
  rewritten once after the vocabulary guard rejected a real signal id in an
  example; the shipped text names no platform vocabulary and no counts.
  (4) `docs/MCP_SERVER.md`'s prose tool count was found two stale and now
  says to trust `tools/list`.
- Impacted files: see master plan inventory
- Reason: What the gate should know that the matrices alone do not say.
- Approved by: executor
- Next action: verifier, then auditor.

### DL-012

- Timestamp: `2026-08-07 08:25 UTC`
- Phase: `EXECUTION`
- Type: `exception`
- Decision: Verifier remediation. (1) The "No credential" error scenario,
  reported as untestable in the first scenario walk, is now spawn-tested on
  the real process (`tests/recording/cli-spawn.test.ts`) — both refusal
  paths, ~10s. The claim "cannot be unit-driven without real config" was
  false: the delegated-mode session read touches no database, so dummy
  config boots. (2) The open live-proof task (8.2) is now tracked as
  `the-recorder-is-unproven-against-live` (p2, waiting-on-operator) rather
  than only as an annotated checkbox.
- Impacted files: `tests/recording/cli-spawn.test.ts` (new),
  `openspec/backlog/the-recorder-is-unproven-against-live.md` (new),
  `verification.md`
- Reason: An error scenario without a test is the exact class the verifier
  exists to catch, and it caught one written by the same hands that built
  the feature — which is the argument for running it even on one's own work.
- Approved by: executor
- Next action: auditor.

### DL-013

- Timestamp: `2026-08-07 08:35 UTC`
- Phase: `AUDIT`
- Type: `handoff`
- Decision: Production gate **PASS**, zero open violations. One MAJOR found
  and fixed in-round (PG-001: a literal NUL byte in the store's grouping key
  made the file binary to every text scan — found because the audit's
  ripgrep pass refused to read it, which is the mechanical-scan argument in
  one line). One MINOR tracked (PG-002: `rawAnswer` has no product consumer
  yet; the analysis-layer item notes it). Spec parity 9/9 with all 21
  scenarios covered; quality gates rerun green after remediation; scope
  deviations all pre-recorded (DL-008/009). The deferred live proof stays a
  tracked item (`the-recorder-is-unproven-against-live`), declared since the
  proposal.
- Impacted files: `plan/production-gate.md` (new),
  `src/infrastructure/db/repositories/drizzle-signal-record-store.ts`
  (PG-001 fix, commit `c1ee554`)
- Reason: Gate rationale recorded where the tracker points.
- Approved by: auditor
- Next action: archiver — merge the deltas into `openspec/specs/` so the
  spec layer describes the product again.
