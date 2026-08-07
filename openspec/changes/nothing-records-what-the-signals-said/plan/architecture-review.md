# Architecture Review — nothing-records-what-the-signals-said

**Checklist source**: `docs/checklists/ARCHITECTURE_REVIEW_CHECKLIST.md`
**Scope**: one new command, two new queries, one new store port + Drizzle
implementation, two port methods + adapter implementations, one mapper, one
CLI entry, composition wiring, two MCP tool entries, one shared guard
derivation.

## Checklist matrix

| Component | Category | Rule under review | Evidence | Status |
|-----------|----------|-------------------|----------|--------|
| `capture-signals.command.ts` | Use Case / SRP | One purpose; delegates persistence to the store port; no query logic mixed in | One `execute`; store/market/radar/clock injected `private readonly`; history/coverage live in separate queries | IMPLEMENTED |
| `capture-signals.command.ts` | Use Case / DIP | Ports only; no infrastructure imports | Imports: domain types + `@/ports/{clock,market,radar,signal-record}` only; `tests/architecture/boundaries.test.ts` green | IMPLEMENTED |
| `capture-signals.command.ts` | Error handling | One coin's failure recorded, loop continues; nothing swallowed; failure in the type | Per-coin try/catch → failed-capture row with reason (`capture.test.ts` "turns a thrown read into that coin's failure and continues"); covered-nothing is a result kind, not a null | IMPLEMENTED |
| `read-signal-history.query.ts`, `read-record-coverage.query.ts` | CQRS | Queries separate from the command; readers return DTOs | Two query classes; readers return result unions; store readers return domain objects | IMPLEMENTED |
| `src/ports/signal-record.ts` | Ports | Interface in the port layer; store provably separate from anything reaching BattleGrid | Port file imports domain only; `DrizzleSignalRecordStore` holds a `Db` and nothing else — no BattleGrid reach by construction | IMPLEMENTED |
| `drizzle-signal-record-store.ts` | Repository | Naming convention; builder-only; `userId` everywhere; writers return id; capture atomic | `drizzle-*` name (DL-002); no `sql.raw`; every read `userId`-filtered in the WHERE; `appendCapture` wraps capture+readings in `db.transaction`; `tests/db/signal-record.test.ts` | IMPLEMENTED |
| `drizzle-signal-record-store.ts` | Mapper | Row→domain defaults nothing; nullable stays nullable | `toCapture` throws on a recorded row missing metrics; `platformVersion` null passes through (db test "recorded as unknown, not guessed"); unknown provenance kinds map to `nothing` with a reason naming what was found, never invented coins | IMPLEMENTED |
| `signal-preview-mapper.ts` | Infrastructure adapter | Every observed field kept; loud on unexpected shape | `preview-mapper.test.ts` "keeps all twelve fields"; `UnmappablePreviewError` on each missing header fact | IMPLEMENTED |
| `market-adapter.ts` | Port implementation | Implements `coinSignalPreview`/`platformVersion` exactly; infra errors → domain unreadable; fake exists | `unreadable(err)`/`malformed(…)` at the boundary, raw attached on malformed; `ScriptedMarket` + extended `FakeMarketPort` fakes | IMPLEMENTED |
| `mcp-adapter.ts` | P6 One Way In | Version accessor only; MCP client still constructed nowhere else | `serverVersion` is a metadata read on the adapter's own fetch path; the optional `BattleGridPort.serverVersion` member documents the null-on-unknown contract | IMPLEMENTED |
| `composition.ts` | DI wiring | Store + use-cases wired only here; no circular refs | `DrizzleSignalRecordStore(db, randomUUID)` in the infra block; `captureSignals`/`readSignalHistory`/`readRecordCoverage` in `app()`; typecheck + boundaries green | IMPLEMENTED |
| `bin/grid-commander-record.ts` | P6 / boot | Reaches BattleGrid only through `app()`; refuses without authority naming what is missing | Mirrors `grid-commander-mcp.ts`: `app(NO_COOKIES)` → `currentUser` → refuse with the missing-key sentence; parse+exit logic extracted pure (`recorder-cli.ts`, `cli-exit.test.ts`) | IMPLEMENTED |
| capture path | P1 Scope | No code treats read scope as safe-by-itself | Every platform call goes through `callTool`'s full guard sequence (classify → scope → audit); the recorder adds no shortcut | IMPLEMENTED |
| capture path | P2 Discovery | No hard-coded tool list beyond the adapter's own alias; no compiled-in enums | Intervals come from the operator or deployment rows; the vocabulary guard (`tests/strategy/structure.test.ts`) rejected a draft that wrote a signal id into a tool description — shipped text names none | IMPLEMENTED |
| capture path | P3 Audit | No BattleGrid write exists on the path | DL-004; `live-writes` pins `commandCanWrite('CaptureSignalsCommand') === false` by derivation; `callTool` still audits the reads it makes through the standard path | IMPLEMENTED |
| `src/mcp/tools.ts` entries | MCP surface | Table-driven; use-cases only; read-only guard green; descriptions state no counts | Two `ToolDefinition` entries with `useCase` keys; `mcp-read-only` 12/12 with no exemption; `annotations` green (no `persists`); descriptions name states, no counts, no platform vocabulary | IMPLEMENTED |
| `tests/support/write-reachability.ts` | Guards | A unification ships its guard in the same diff | Both architecture guards import the one derivation; the refinement is pinned both directions inside `live-writes` (a real write still gated; unresolvable fails closed) — DL-008 | IMPLEMENTED |
| Logging | Standards | Structured logger; never a token | No logging added anywhere in the change (consistent with every sibling use-case); the CLI prints its summary to stdout and never a credential | IMPLEMENTED |
| Quality gate | Gate | All commands pass | `./scripts/ci.sh` with DATABASE_URL: harness+validate, typecheck, lint, vitest (1876), drizzle-check, migrate, test:db (80), build — all ok (2026-08-07; freshness/serving named skips, keyless/opt-in) | IMPLEMENTED |

## Issues found

1. **Adjacent, filed not fixed**: `proposals.user_id` FKs `users.id` while
   personal mode acts as `owner` with no users row — recording a proposal on
   a personal deployment should FK-fail. Surfaced by designing the recorder's
   tables around exactly that trap. Backlog:
   `a-proposal-cannot-be-recorded-on-a-personal-deployment` (p2).
2. **Guard evolution inside the change it guards** (for the auditor's eyes):
   `live-writes`' Command arm was refined from spelling to reachability to
   admit the recorder's read-only probe — DL-008 records the reasoning and
   the pinned counter-assertions.

Status: EXECUTION EVIDENCE COMPLETE
