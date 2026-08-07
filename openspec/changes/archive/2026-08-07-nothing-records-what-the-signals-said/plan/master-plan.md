# Nothing Records What The Signals Said - Implementation Plan (Master Handoff Document)

## Status

- Change ID: `nothing-records-what-the-signals-said`
- Change folder: `openspec/changes/nothing-records-what-the-signals-said/`
- Track: `full`
- Current phase: `Ready for Production Gate`
- Base ref for diffs: `origin/main`
- Last updated: `2026-08-07` (execution complete)

## Objective

Record what BattleGrid's signals said — per coin, per interval, with the price
and platform version at each capture — into the product's own store, so
forward evidence for strategy claims starts accumulating instead of being
permanently lost each day. Serve the record honestly (gaps stated, readings
timestamped) on the web and over the MCP surface.

## Requirement Coverage Matrix

| Requirement | Capability | Delta op | Implementing file(s) | Scenario → verification |
|---|---|---|---|---|
| A Capture Records What Every Signal Said | `signal-recording` | ADDED | `src/domain/recording/capture.ts` (create), `src/ports/market.ts` (modify), `src/infrastructure/battlegrid/signal-preview-mapper.ts` (create), `src/infrastructure/battlegrid/market-adapter.ts` (modify), `src/application/use-cases/capture-signals.command.ts` (create) | "A capture on a connected account" → `tests/recording/capture.test.ts` + `tests/live/recorder-probe.test.ts`; "The account is untouched" → `tests/architecture/live-writes.test.ts` (probe names no mutating tool) + `tests/recording/capture.test.ts` (fake port records reads only) |
| The Platform's Answer Is Kept Whole | `signal-recording` | ADDED | `src/infrastructure/db/schema/index.ts` (modify: raw column), `src/infrastructure/db/repositories/drizzle-signal-record-store.ts` (create), `src/ports/signal-record.ts` (create) | "A field the product does not yet read" → `tests/db/signal-record.test.ts` (raw round-trips a key the mapper does not carry); "The whole answer is retrievable" → `tests/db/signal-record.test.ts` (byte-faithful retrieval) |
| A Failed Read Is A Recorded Gap, Not Silence | `signal-recording` | ADDED | `src/application/use-cases/capture-signals.command.ts` (create), `src/domain/recording/capture.ts` (create: failed-capture shape) | "One coin fails, the rest record" → `tests/recording/capture.test.ts`; "The platform is down" → `tests/recording/capture.test.ts` (all-unreadable fake) |
| The Record States Its Own Coverage | `signal-recording` | ADDED | `src/application/use-cases/read-record-coverage.query.ts` (create), `app/(app)/recorder/page.tsx` (create), `src/presentation/components/signal-record.tsx` (create) | "A gap is visible" → `tests/recording/coverage.test.ts` (daily cadence, 3-day hole → one gap); "Nothing recorded yet" → `tests/recording/coverage.test.ts` + `tests/rendering/recorder.test.ts` (never-recorded vs store-unreadable render differently) |
| Recorded History Is Readable By Coin And By Signal | `signal-recording` | ADDED | `src/application/use-cases/read-signal-history.query.ts` (create), `app/(app)/recorder/[ticker]/page.tsx` (create), `src/presentation/components/signal-record.tsx` (create) | "A coin's timeline" → `tests/rendering/recorder.test.ts`; "One signal across time" → `tests/rendering/recorder.test.ts`; "A reading is never passed off as now" → `tests/rendering/recorder.test.ts` (capture time asserted on every rendered reading); "The store cannot be read" → `tests/recording/history.test.ts` (unreadable store → unreadable result, not empty) |
| A Capture Runs Unattended And Refuses Without Authority | `signal-recording` | ADDED | `bin/grid-commander-record.ts` (create), `src/application/use-cases/capture-signals.command.ts` (create: result → exit mapping exported) | "No credential" → `tests/recording/cli-exit.test.ts` (refusal path names the missing authority, maps to nonzero); "A scheduler can tell success from failure" → `tests/recording/cli-exit.test.ts` (≥1 coin recorded → 0; zero recorded → nonzero) |
| The Coins Captured And Why Are Recorded | `signal-recording` | ADDED | `src/application/use-cases/capture-signals.command.ts` (create), `src/domain/recording/capture.ts` (create: provenance union), `src/presentation/components/signal-record.tsx` (create: provenance rendered) | "Named coins" → `tests/recording/capture.test.ts`; "Defaulting to the deployments" → `tests/recording/capture.test.ts` (fake RadarPort supplies (coin, timeframe) pairs); "Nothing to cover" → `tests/recording/capture.test.ts` (no coins, unreadable deployments → covered-nothing outcome with reason, no capture rows) |
| The Record Belongs To The Account That Captured It | `signal-recording` | ADDED | `src/infrastructure/db/repositories/drizzle-signal-record-store.ts` (create: every query `userId`-scoped), `src/infrastructure/db/schema/index.ts` (modify: `user_id` columns + indexes) | "Another account's record is not shown" → `tests/db/signal-record.test.ts` (two users' rows never cross on history or coverage) |
| The Recorded Signal History Is Readable By A Model | `mcp-control` | ADDED | `src/mcp/tools.ts` (modify: two table entries) | "A model reads a coin's recorded history" → `tests/mcp/recorder-tools.test.ts`; "A gap crosses the boundary as a gap" → `tests/mcp/recorder-tools.test.ts`; "Recording has not started" → `tests/mcp/recorder-tools.test.ts`; read-only + description rules → existing `tests/architecture/mcp-read-only.test.ts`, `tests/mcp/annotations.test.ts`, `tests/mcp/descriptions.test.ts` (no-count rule) pick the entries up from the table |

Out of scope (from the proposal — do not implement):

- Grading claims against the record (analysis layer) — `recorded-signals-are-not-yet-evidence`
- Recording agent evaluations (`list_signal_logs`) — `agent-evaluations-are-not-recorded`
- Agent-weighted captures (recomputable from recorded raw scores + allocations)
- Recording candles, regime, or market context (retroactively readable on the platform)
- An in-product scheduler, worker, or retry loop
- Deleting or trimming the record — `the-record-cannot-be-forgotten`

## Non-Negotiable Constraints

From `docs/checklists/ARCHITECTURE_REVIEW_CHECKLIST.md` (Quick Reference Card):

- Dependencies: domain interfaces and ports only; never import infrastructure in a use case
- BattleGrid always through the port; the MCP client exists only at the composition root
- Scope is never a safety signal — classify the tool (capture calls read-annotated tools; the classification still decides, not the scope)
- Unknown tools fail closed — mutating and destructive until proven otherwise
- Audit written before the attempt for BattleGrid writes (capture makes none — see decision log D5)
- Concurrency: `expectedRevision` on every mutation (none here)
- Logging: structured, contextual, never a token
- Queries: Drizzle builder only, always scoped by `userId`
- Quality gate (from `openspec/config.yaml` `quality_gates`): `npm run typecheck` · `npm run lint` · `npm test` · `npm run build` · `npm run db:generate && git diff --quiet drizzle/` · `npm run test:db`

## Architectural Boundaries (Design Slice)

- Packages/apps touched: `app/(app)/recorder/` (new route group area), `bin/`, `src/domain/`, `src/ports/`, `src/application/use-cases/`, `src/infrastructure/battlegrid/`, `src/infrastructure/db/`, `src/mcp/`, `src/presentation/components/`, `drizzle/` (generated), `tests/`, `docs/`
- Layers touched (architecture checklist Layer Overview): Presentation (`app/`, `src/presentation/`), Application (`src/application/use-cases/`), Domain (`src/domain/`, `src/ports/`), Infrastructure (`src/infrastructure/`)
- Contracts impacted: `MarketPort` gains one read; new `SignalRecordStore` port; `App` (composition) gains three use-cases; MCP tool table gains two read entries; DB schema gains two tables. No existing DTO changes shape.

## File & Responsibility Inventory (SOLID)

### Component / Module Hierarchy (Touched)

```text
bin/
  grid-commander-record.ts
src/
  domain/recording/capture.ts
  ports/market.ts
  ports/signal-record.ts
  application/use-cases/
    capture-signals.command.ts
    read-signal-history.query.ts
    read-record-coverage.query.ts
  infrastructure/
    battlegrid/signal-preview-mapper.ts
    battlegrid/market-adapter.ts
    battlegrid/mcp-adapter.ts
    db/schema/index.ts
    db/repositories/drizzle-signal-record-store.ts
  mcp/tools.ts
  presentation/components/signal-record.tsx
  composition.ts
app/(app)/recorder/
  page.tsx
  [ticker]/page.tsx
tests/
  recording/{capture,history,coverage,cli-exit}.test.ts
  db/signal-record.test.ts   (+ support.ts truncation list)
  mcp/recorder-tools.test.ts
  rendering/recorder.test.ts
  live/recorder-probe.test.ts
  support/recording-fakes.ts
docs/
  BATTLEGRID_SURFACE_MAP.md
  MCP_SERVER.md
  FIRST_SESSION.md
```

### Inventory Table

| File | Action | Replace/Move To | Layer/Area | Responsibility (SRP) | SOLID Notes |
|------|--------|-----------------|------------|-----------------------|-------------|
| `src/domain/recording/capture.ts` | create | N/A | Domain | Types for a capture, a reading, provenance, failure, and coverage — no I/O, no imports from outside domain | Pure types; the union carries failure as data (no null-signalling) |
| `src/ports/market.ts` | modify | N/A | Domain (ports) | Gains `coinSignalPreview(params)` returning the full evaluated-signal set + price + platform version, or unreadable-with-reason | ISP: read stays on the market port (agent-independent), not on a fat BattleGrid port |
| `src/ports/signal-record.ts` | create | N/A | Domain (ports) | `SignalRecordStore`: append capture (readings + raw, atomic per coin), append failed capture, history by coin, one signal across captures, coverage, raw by capture id — all userId-scoped | DIP: use-cases see this interface, never Drizzle |
| `src/infrastructure/battlegrid/signal-preview-mapper.ts` | create | N/A | Infrastructure | Observed v11.0.0 payload → domain reading list; shape only, no defaults that mask absence; unexpected shape fails loudly | Mapper rule (pipeline checklist L4) |
| `src/infrastructure/battlegrid/market-adapter.ts` | modify | N/A | Infrastructure | Implements the new port read: envelope unwrap, mapper call, raw payload passthrough, platform version from the client handshake (null when unavailable) | Port implementation; no public method beyond the interface |
| `src/infrastructure/battlegrid/mcp-adapter.ts` | modify (only if needed) | N/A | Infrastructure | Expose the connected client's `serverInfo.version` to adapters (SDK `getServerVersion()`); nothing else | Smallest possible accessor; see decision log D4 |
| `src/infrastructure/db/schema/index.ts` | modify | N/A | Infrastructure (schema) | Add `signal_captures` (header + raw jsonb + provenance + outcome + platform version + captured_at from injected clock) and `signal_readings` (per-signal row, FK to capture); userId columns + indexes | 1:1 mirror; nullable stays nullable (platform version can be unknown) |
| `drizzle/` migration | generate | N/A | Infrastructure (DB) | Additive migration for the two tables | Generated by `npm run db:generate`, checked by the gate |
| `src/infrastructure/db/repositories/drizzle-signal-record-store.ts` | create | N/A | Infrastructure | Drizzle implementation of `SignalRecordStore`; every query filtered by `userId`; capture+readings+raw in one transaction | Naming follows `drizzle-proposal-store.ts` |
| `src/application/use-cases/capture-signals.command.ts` | create | N/A | Application | Resolve coin set (named \| deployments \| refuse-with-reason), loop coins, persist readings/failures, return a summary the CLI can map to an exit code (mapping exported as a pure function) | Single command; delegates reads to ports; only layer computing the summary |
| `src/application/use-cases/read-signal-history.query.ts` | create | N/A | Application | Coin timeline and one-signal-across-captures DTOs, each reading carrying its capture time; store-unreadable crosses as unreadable | Derivations live here (Iron Rule L5) |
| `src/application/use-cases/read-record-coverage.query.ts` | create | N/A | Application | Coverage DTO: first, latest, count, gaps (spacing > 2× the series median — one definition, here only), never-recorded state | One definition of "gap" in the codebase |
| `src/composition.ts` | modify | N/A | Composition root | Wire `DrizzleSignalRecordStore` + the three use-cases (`captureSignals`, `readSignalHistory`, `readRecordCoverage`) | Only place constructing infrastructure |
| `bin/grid-commander-record.ts` | create | N/A | Presentation (headless) | Boot via composition root, refuse without authority naming what is missing, run one capture, print summary, exit by the exported mapping | Mirrors `bin/grid-commander-mcp.ts`; no logic beyond arg parsing + exit mapping |
| `app/(app)/recorder/page.tsx` | create | N/A | Presentation | Coverage surface: per coin+interval coverage, never-recorded guidance, store-unreadable state; renders only | Server component; `acting()` guard |
| `app/(app)/recorder/[ticker]/page.tsx` | create | N/A | Presentation | One coin: capture timeline + per-signal history (signal chosen by query param); renders only | Server component |
| `src/presentation/components/signal-record.tsx` | create | N/A | Presentation | Presentational components: coverage table, timeline, signal history, provenance and capture-time labels | Props-typed; no fetching; no arithmetic on DTO fields |
| `src/mcp/tools.ts` | modify | N/A | MCP surface | Two table entries → `readSignalHistory`, `readRecordCoverage`; descriptions name states (gap, never-recorded, unreadable), state no counts | Table-driven so the read-only guard and annotation checks see them |
| `tests/support/recording-fakes.ts` | create | N/A | Tests | Fake `MarketPort.coinSignalPreview` (scripted per coin) and in-memory `SignalRecordStore` | Fake per port, as the adapter checklist requires |
| `tests/recording/capture.test.ts` | create | N/A | Tests | Command behavior: full capture, partial failure, total failure, provenance branches, covered-nothing | — |
| `tests/recording/history.test.ts` | create | N/A | Tests | History query: readings carry times; unreadable ≠ empty | — |
| `tests/recording/coverage.test.ts` | create | N/A | Tests | Gap derivation: daily cadence + 3-day hole → one gap; never-recorded | — |
| `tests/recording/cli-exit.test.ts` | create | N/A | Tests | Exit mapping: ≥1 recorded → 0, zero recorded → nonzero, refusals named | — |
| `tests/db/signal-record.test.ts` | create | N/A | Tests (DB) | Store round-trip, raw fidelity, cross-account isolation | — |
| `tests/db/support.ts` | modify | N/A | Tests (DB) | Add the two tables to the truncation list | — |
| `tests/mcp/recorder-tools.test.ts` | create | N/A | Tests (MCP) | The three mcp-control scenarios over the server with fakes | — |
| `tests/rendering/recorder.test.ts` | create | N/A | Tests | Rendered states: gap visible, capture-time labels, never-recorded vs unreadable | — |
| `tests/live/recorder-probe.test.ts` | create | N/A | Tests (live, key-gated) | One real `get_coin_signal_preview` through adapter+mapper; asserts signal population; prints raw-vs-mapped key counts; store side over the in-memory fake | Reads only; no `BATTLEGRID_LIVE_WRITES` |
| `docs/BATTLEGRID_SURFACE_MAP.md` | modify | N/A | Docs | `get_coin_signal_preview` → consumed table (52 → 53) | — |
| `docs/MCP_SERVER.md` | modify | N/A | Docs | The two tools; the record is this product's own store | — |
| `docs/FIRST_SESSION.md` | modify | N/A | Docs | Starting the recorder: the one-line cron, why gaps are permanent | — |
| `src/domain/recording/coverage.ts` | create (added in execution) | N/A | Domain | The one gap definition — `deriveSeriesCoverage`, pure | Business rule in a domain service, not the query |
| `src/presentation/recorder-cli.ts` | create (added in execution) | N/A | Presentation | CLI arg parsing + run summary, pure and unit-testable | Keeps `bin/` free of logic |
| `src/ports/battlegrid.ts` | modify (added in execution) | N/A | Domain (ports) | Optional `serverVersion` member — null-on-unknown contract | Optional so ~25 literal fakes stay valid; DL-003 |
| `src/presentation/components/section-nav.tsx` | modify (added in execution) | N/A | Presentation | `/recorder` in the one nav | — |
| `tests/support/write-reachability.ts` | create (added in execution) | N/A | Tests (shared) | The write-reachability derivation both architecture guards read | DL-008 |
| `tests/architecture/live-writes.test.ts`, `tests/architecture/mcp-read-only.test.ts` | modify (added in execution) | N/A | Tests | Command arm derives reach; shared module adopted | DL-008 |
| `tests/architecture/reachability.test.ts`, `tests/architecture/failure-is-explained.test.ts` | modify (added in execution) | N/A | Tests | Derived-list updates for `/recorder`; own-store exemptions with reasons | — |
| `tests/rendering/support/fake-acting.ts`, `tests/support/market-fakes.ts`, `tests/agent/coin-qualification.test.ts`, `tests/db/support.ts` | modify (added in execution) | N/A | Tests | Harness wiring for the new ports; truncation list | — |
| `openspec/changes/…/verification.md` | create (added in execution) | N/A | Change artifacts | The scenario walk (task 10.2) | — |

## Dependency / Call-Tree Sketch

```text
cron → bin/grid-commander-record.ts
         → composition.app(NO_COOKIES).currentUser        (refuse without authority)
         → app.captureSignals.execute
              → RadarPort.listDeployments                  (only when no coins named)
              → MarketPort.coinSignalPreview  (per coin)   → McpMarketAdapter → BattleGridPort(MCP client)
              → SignalRecordStore.appendCapture | appendFailedCapture
         → exitCodeFor(summary)

app/(app)/recorder/page.tsx        → app.readRecordCoverage → SignalRecordStore
app/(app)/recorder/[ticker]/page.tsx → app.readSignalHistory → SignalRecordStore
src/mcp/tools.ts (2 entries)       → the same two queries   → SignalRecordStore
```

## DATA_PIPELINE_REVIEW_CHECKLIST Coverage

- Checklist source: `docs/checklists/DATA_PIPELINE_REVIEW_CHECKLIST.md`
- Source-of-truth statement: BattleGrid is the source of truth for what
  signals say **now**; this product's PostgreSQL becomes the source of truth
  for what they **said** — a capture row is our record (like audit entries),
  not a cache of theirs, because the platform serves no signal history to
  re-fetch. The raw payload column preserves layer-0 truth verbatim inside
  our layer-1 record.
- Contract map status: Included (new tables + one new port read; no existing
  contract changes shape)

### Layer Coverage Matrix

| Layer | Requirement | Planned Coverage | Status |
|-------|-------------|------------------|--------|
| 0. BattleGrid | Values passed through unmodified; missing fields surfaced as missing | Mapper keeps every observed field; raw stored verbatim; platform version nullable when handshake does not say | Planned |
| 1. PostgreSQL | New data has a migration; userId column + index on user-owned tables | Two tables, additive migration, `(user_id, …)` indexes | Planned |
| 2. Schema | Drizzle mirrors columns 1:1; no invented fields | `signal_captures` / `signal_readings` mirror the domain record; `captured_at` written from the injected clock, not `defaultNow()` | Planned |
| 3. Queries | Filter/join/aggregate only; userId-scoped | All store queries scoped; coverage counts via builder aggregation | Planned |
| 4. Mappers | Shape only; no masking defaults; unexpected shape fails loudly | `signal-preview-mapper.ts` (platform→domain) and row mappers in the store | Planned |
| 5. Use Case | The only layer computing derived values | Gap derivation and capture summary in the queries/command only | Planned |
| 6. Route handlers | Pass-through + auth | Pages call use-cases via `acting()`; no field additions | Planned |
| 7. Client state | N/A — no client store needed (server components) | No Zustand store added | Planned |
| 8. Components | Display only; missing renders as unknown; snapshots labelled | Capture-time on every reading; gap and never-recorded states rendered | Planned |
| 9. Completeness | Every use case reachable; failure paths rendered | Capture ← CLI; queries ← pages + MCP; unreadable/empty/never states all rendered | Planned |

## ARCHITECTURE_REVIEW_CHECKLIST Coverage

- Checklist source: `docs/checklists/ARCHITECTURE_REVIEW_CHECKLIST.md`
- Architecture verdict: `Pending execution`

### Component Checklist Matrix

| Component | Checklist Category | Mandatory Rule |
|-----------|-------------------|----------------|
| `capture-signals.command.ts` | Use Case — SOLID / Clean Architecture | Constructor injection; ports only; no infrastructure imports; failure in the type, not null |
| `read-signal-history.query.ts`, `read-record-coverage.query.ts` | Use Case — CQRS | Queries separate from the command; derived values computed here only |
| `drizzle-signal-record-store.ts` | Repository | Drizzle builder only; every query `userId`-filtered; writers return void/id; mapper defaults nothing |
| `signal-preview-mapper.ts` | Mapper Pattern | Shape only; no fallback masking a missing field; loud on unexpected shape |
| `market-adapter.ts` (new method) | Infrastructure Adapter | Implements the port exactly; infrastructure errors → domain unreadable before the boundary |
| `composition.ts` | DI Wiring | Only the composition root constructs the store and wires the use-cases |
| `bin/grid-commander-record.ts` | P6 One Way In | Reaches BattleGrid only through `app()`'s use-cases → ports |
| capture path (whole) | P1/P2/P3 | Read-annotated tools only, classification still consulted, no hard-coded tool list beyond the port's own call; no BattleGrid write → no audit row required (decision log D5) |

## UI_COMPONENT_REVIEW_CHECKLIST Coverage

- Checklist source: `docs/checklists/UI_COMPONENT_REVIEW_CHECKLIST.md`
- UI scope touched: `Yes`
- Verdict: `Pending execution`

### UI Scope Matrix

| UI Category | Scope File(s) | Requirement | Status |
|-------------|---------------|-------------|--------|
| Component Structure | `app/(app)/recorder/*.tsx`, `signal-record.tsx` | Server components fetch; presentational components take props; no fetching or business logic in components; files kebab-case, one component per concern | Planned |
| Store Design | — | No client store: pages are server-rendered reads | N/A (planned none) |
| Consequence & Confirmation | — | No mutation on these surfaces; nothing to confirm | N/A |
| State & Interaction | recorder pages | Loading/empty/error: never-recorded, store-unreadable, gap states all rendered distinctly | Planned |
| Accessibility & Semantics | `signal-record.tsx` | Tables with headers; time elements carry datetime; states conveyed in text, not color alone | Planned |
| Tailwind / tokens | `signal-record.tsx` | Tokenised classes per the design system (no raw values) | Planned |

## Phase 1 - Planning (Implementation Plan)

### Assumptions / Open Questions

- The MCP SDK client exposes the server's `initialize` implementation info
  (`getServerVersion()`); if it does not at our SDK version, the adapter
  records `null` and the record says version-unknown — never a guess.
- `get_coin_signal_preview` remains read-annotated at execution time; the
  adapter still routes through classification, so a platform reclassification
  fails closed rather than silently proceeding.
- Deployment rows carry (coin, timeframe) pairs sufficient for the fallback
  coin set (confirmed against `RadarPort.listDeployments` and the deployment
  domain type).
- Volume: ~84 reading rows + one raw payload (~tens of KB) per coin per
  capture is acceptable Postgres load at the operator's scale; retention is
  explicitly out of scope (`the-record-cannot-be-forgotten`).

### Decision Log Requirements

- Decision log file: `openspec/changes/nothing-records-what-the-signals-said/plan/decision-log.md`
- Required entry fields: `Timestamp`, `Phase`, `Type`, `Decision`, `Impacted files`, `Reason`, `Approved by`, `Next action`
- Phase 1 minimum entries: scope boundaries · key assumptions · planned exceptions · executor handoff notes

### Phase-by-Phase Tasks

Phase A: The record (domain + schema + store)
- File: `src/domain/recording/capture.ts`
  - Action: create
  - Change: capture/reading/provenance/failure/coverage types
  - Notes: failure and never-recorded are union members, not nulls; no imports from outside domain
- File: `src/ports/signal-record.ts`
  - Action: create
  - Change: `SignalRecordStore` interface per the inventory
  - Notes: append is atomic per coin (readings + raw with the header)
- File: `src/infrastructure/db/schema/index.ts`
  - Action: modify
  - Change: `signal_captures`, `signal_readings` tables
  - Code region: append after `proposals` table (~line 133)
  - Notes: `captured_at` from injected clock (mirror `proposals.recordedAt` comment rationale); `platform_version` nullable; raw as jsonb
- File: `src/infrastructure/db/repositories/drizzle-signal-record-store.ts`
  - Action: create
  - Change: store implementation
  - Notes: transaction per capture; every read `userId`-scoped
- Files: `tests/db/signal-record.test.ts` (create), `tests/db/support.ts` (modify: truncation list)
  - Notes: raw fidelity asserts a key the domain mapper does not carry survives round-trip

Phase B: The platform read
- File: `src/ports/market.ts`
  - Action: modify
  - Change: `coinSignalPreview` + result types (readings, price, platform version, unreadable)
  - Code region: after `rankingVocabulary` (~line 40)
- File: `src/infrastructure/battlegrid/signal-preview-mapper.ts`
  - Action: create
  - Change: observed-shape mapper, every field kept
- File: `src/infrastructure/battlegrid/market-adapter.ts`
  - Action: modify
  - Change: implement the read; return raw beside mapped; platform version from handshake accessor
- File: `src/infrastructure/battlegrid/mcp-adapter.ts`
  - Action: modify (only if no accessor exists)
  - Change: expose connected client server version
- File: `tests/support/recording-fakes.ts`
  - Action: create
  - Change: fake market port + in-memory store

Phase C: The capture command
- File: `src/application/use-cases/capture-signals.command.ts`
  - Action: create
  - Change: coin-set resolution (named | deployments | covered-nothing), per-coin loop with per-coin failure capture, summary + exported `exitCodeFor`
  - Notes: injected clock stamps `capturedAt`; provenance recorded on every capture row; one coin's throw must not abort siblings
- File: `tests/recording/capture.test.ts`
  - Action: create
  - Change: five behaviors per the coverage matrix

Phase D: Unattended entry
- File: `bin/grid-commander-record.ts`
  - Action: create
  - Change: boot, refuse-without-authority, arg parsing (`--coins`, `--interval`), capture, summary, exit
  - Notes: mirrors `bin/grid-commander-mcp.ts` boot exactly; no logic beyond parse + call + exit
- File: `tests/recording/cli-exit.test.ts`
  - Action: create

Phase E: Read surfaces
- Files: `src/application/use-cases/read-signal-history.query.ts`, `read-record-coverage.query.ts`
  - Action: create
  - Notes: gap = spacing > 2× series median, defined once in the coverage query; unreadable store crosses as unreadable
- Files: `app/(app)/recorder/page.tsx`, `app/(app)/recorder/[ticker]/page.tsx`, `src/presentation/components/signal-record.tsx`
  - Action: create
  - Notes: `acting()` guard; per-signal view by query param; capture time on every reading; provenance labelled
- Files: `tests/recording/history.test.ts`, `tests/recording/coverage.test.ts`, `tests/rendering/recorder.test.ts`
  - Action: create

Phase F: The MCP boundary
- File: `src/mcp/tools.ts`
  - Action: modify
  - Change: two `ToolDefinition` entries → `readSignalHistory`, `readRecordCoverage`
  - Notes: descriptions name gap/never-recorded/unreadable states, state no counts; `persists` false
- File: `tests/mcp/recorder-tools.test.ts`
  - Action: create

Phase G: Wiring + guards
- File: `src/composition.ts`
  - Action: modify
  - Change: `DrizzleSignalRecordStore` in the infra block (~line 159); three use-cases in `app()` (~line 278)
- Verify existing suites pick everything up: `mcp-read-only`, `annotations`, `reachability`, `boundaries`, `live-writes` — fix what they flag, never exempt

Phase H: Live proof + docs
- File: `tests/live/recorder-probe.test.ts`
  - Action: create
  - Notes: key-gated; reads only; asserts signal population and prints raw-vs-mapped key counts; one full capture against a local DB run once and its counts recorded in the change folder
- Files: `docs/BATTLEGRID_SURFACE_MAP.md`, `docs/MCP_SERVER.md`, `docs/FIRST_SESSION.md`
  - Action: modify

## Phase 1 Review Checklist (Planner-Owned)

- [x] Objective and constraints are explicit and testable.
- [x] Constraints extracted from project checklists (not hardcoded).
- [x] File inventory covers all expected touched files.
- [x] Dependency/call-tree sketch is included.
- [x] Data pipeline checklist coverage is mapped.
- [x] Architecture checklist coverage is mapped.
- [x] UI checklist coverage is mapped (or N/A with rationale).
- [x] Artifacts section lists all required review docs.
- [x] Decision log exists and has Phase 1 entries.
- [x] Final line is set to `PLAN READY FOR REVIEW`.

## Phase 2 - Execution (TODO Checklist)

- [x] Phase A: The record
  - [x] `src/domain/recording/capture.ts` - types
  - [x] `src/ports/signal-record.ts` - store port
  - [x] `src/infrastructure/db/schema/index.ts` - two tables
  - [x] `drizzle/` - generated migration, gate clean
  - [x] `src/infrastructure/db/repositories/drizzle-signal-record-store.ts` - implementation
  - [x] `tests/db/signal-record.test.ts` + `tests/db/support.ts` - round-trip, raw fidelity, isolation
- [x] Phase B: The platform read
  - [x] `src/ports/market.ts` - `coinSignalPreview`
  - [x] `src/infrastructure/battlegrid/signal-preview-mapper.ts` - mapper
  - [x] `src/infrastructure/battlegrid/market-adapter.ts` - implementation
  - [x] `src/infrastructure/battlegrid/mcp-adapter.ts` - version accessor (if absent)
  - [x] `tests/support/recording-fakes.ts` - fakes
- [x] Phase C: `src/application/use-cases/capture-signals.command.ts` + `tests/recording/capture.test.ts`
- [x] Phase D: `bin/grid-commander-record.ts` + `tests/recording/cli-exit.test.ts`
- [x] Phase E: history + coverage queries, recorder pages, `signal-record.tsx`, their tests
- [x] Phase F: `src/mcp/tools.ts` two entries + `tests/mcp/recorder-tools.test.ts`
- [x] Phase G: `src/composition.ts` wiring; all architecture suites green without exemptions
- [x] Phase H: `tests/live/recorder-probe.test.ts`; docs updated (surface map 52→53, MCP_SERVER, FIRST_SESSION)

## Phase 2 Review Checklist (Executor-Owned)

- [x] Execution TODO checklist reflects real progress.
- [x] Inventory and module hierarchy match actual changed files.
- [x] Data review includes implementation evidence.
- [x] Architecture review includes implementation evidence.
- [x] UI/UX review includes implementation evidence or explicit N/A.
- [x] Decision log has execution entries for scope changes/exceptions/handoff notes.
- [x] Quality gate: `npm run typecheck`
- [x] Quality gate: `npm run lint`
- [x] Quality gate: `npm test`
- [x] Quality gate: `npm run build`
- [x] Quality gate: `npm run db:generate && git diff --quiet drizzle/`
- [x] Quality gate: `npm run test:db` (DATABASE_URL required — the suite refuses to skip)
- [x] Final line is set to `EXECUTION READY FOR PRODUCTION GATE`.

## Phase 3 Review Checklist (Production-Gate Auditor-Owned)

- [ ] Execution handoff integrity validated.
- [ ] Data pipeline parity verified against live code.
- [ ] Architecture parity verified against live code.
- [ ] UI parity verified against live code (or N/A evidence).
- [ ] Technical debt scan clean (no stale/redundant/deprecated/fallback code).
- [ ] Contract consistency verified across touched layers.
- [ ] Production gate tracker updated: `openspec/changes/nothing-records-what-the-signals-said/plan/production-gate.md`.
- [ ] Decision log reviewed and updated with gate rationale/waivers.
- [ ] Gate decision is `PASS` only when zero open violations remain.

## Artifacts

- Master plan: `openspec/changes/nothing-records-what-the-signals-said/plan/master-plan.md`
- Data review: `openspec/changes/nothing-records-what-the-signals-said/plan/data-review.md`
- Architecture review: `openspec/changes/nothing-records-what-the-signals-said/plan/architecture-review.md`
- UI/UX review: `openspec/changes/nothing-records-what-the-signals-said/plan/uiux-review.md`
- Decision log: `openspec/changes/nothing-records-what-the-signals-said/plan/decision-log.md`
- Production gate tracker: `openspec/changes/nothing-records-what-the-signals-said/plan/production-gate.md` (created by the auditor)

EXECUTION READY FOR PRODUCTION GATE
