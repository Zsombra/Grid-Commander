# Data Pipeline Review — nothing-records-what-the-signals-said

**Checklist source**: `docs/checklists/DATA_PIPELINE_REVIEW_CHECKLIST.md`
**Scope**: the capture pipeline (BattleGrid preview → mapper → store) and the
read pipeline (store → queries → pages/MCP).

## Source-of-truth statement

- BattleGrid owns what signals say **now**; nothing it returns is recomputed.
- This product's PostgreSQL owns what signals **said** — capture rows are our
  record (like `audit_entries`), not a cache: the platform serves no signal
  history to re-fetch, which is the change's entire reason to exist.
- The raw payload column preserves the platform's answer verbatim inside our
  record, so the mapper is never the only custodian of history.
- Derived values (coverage gaps, capture summaries) are computed in the
  domain/use-case layer only, shipped as first-class DTO fields.

## Contract map

| Contract | Direction | Shape source | As implemented |
|---|---|---|---|
| `get_coin_signal_preview` payload | platform → product | observed shape, v11.0.0, `docs/battlegrid-mcp-surface.json` | `signal-preview-mapper.ts`; fixture `aPreviewPayload` in `tests/support/recording-fakes.ts` mirrors it |
| `signal_capture_runs` / `signal_captures` / `signal_readings` | product ↔ product | Drizzle schema, migration `0002_medical_marvex.sql` | run = provenance + platform version; capture = metrics + raw + outcome; reading = per-signal row |
| History / coverage DTOs | use-case → pages + MCP | `read-signal-history.query.ts`, `read-record-coverage.query.ts` | `TimelineEntry`, `SignalHistoryPoint`, `SeriesCoverage`, `NeverCapturedSeries` — one definition each |

## Checklist matrix

| Layer | Rule under review | Evidence | Status |
|-------|-------------------|----------|--------|
| 0. BattleGrid | Passed through unmodified; missing surfaced as missing; unknown enums render as themselves | Mapper keeps every observed field (`tests/recording/preview-mapper.test.ts` "keeps all twelve fields"); absent per-signal fields map to null, never defaulted ("maps an absent per-signal field to null, never a default"); bias/direction render verbatim in `signal-record.tsx` | IMPLEMENTED |
| 0. BattleGrid | Every displayed reading carries its capture time | `signal-record.tsx` `CapturedAt` on every capture and signal point; `tests/rendering/recorder.test.ts` counts one "captured <stamp>" per rendered capture | IMPLEMENTED |
| 1. Database | Migration exists; NOT NULL only where genuinely required; `user_id` + index on all three tables | `drizzle/migrations/0002_medical_marvex.sql`; nullable exactly where the domain is (`platform_version`, failed-capture metrics, per-signal nullables — schema comments state why); indexes `signal_captures_user_series_idx`, `signal_readings_user_signal_idx`, `signal_capture_runs_user_id_started_at_idx` | IMPLEMENTED |
| 2. Schema | Drizzle mirrors columns 1:1; `captured_at`/`started_at` from injected clock, not `defaultNow()` | `src/infrastructure/db/schema/index.ts` (recorder block; no `defaultNow` on any recorder column); `tests/recording/capture.test.ts` asserts clock-stamped times | IMPLEMENTED |
| 3. Queries | Builder only; every query `userId`-scoped; no business calc in SQL | `drizzle-signal-record-store.ts` — all reads `and(eq(userId,…),…)`; grouping in TS, not SQL; `tests/db/signal-record.test.ts` "never serves another account" | IMPLEMENTED |
| 4. Mappers | Shape only; no masking defaults; unexpected payload fails loudly; raw stored pre-mapper | `signal-preview-mapper.ts` throws `UnmappablePreviewError` on missing header facts ("refuses a preview missing…" ×5); row mappers in the store default nothing (`toCapture` throws on a recorded row missing metrics); raw rides the port result and survives even mapper failure (`appendFailure.raw`, `capture.test.ts` "keeps an answer that arrived but could not be read") | IMPLEMENTED |
| 5. Use Case | Gap definition exists exactly once; summaries computed here only | `deriveSeriesCoverage` in `src/domain/recording/coverage.ts`, called only by `read-record-coverage.query.ts`; `exitCodeFor` and capture summary in the command; components do no arithmetic on DTO fields | IMPLEMENTED |
| 6. Routes/pages | Pass-through + `acting()` auth only | `app/(app)/recorder/page.tsx`, `[ticker]/page.tsx` — `acting()` guard, use-case call, render; no field additions | IMPLEMENTED |
| 7. Client state | None introduced | No store added; `section-nav.tsx` remains the product's only client component | IMPLEMENTED |
| 8. Components | Display only; missing renders as unknown; nothing passed off as now | `signal-record.tsx`: platform-version-null renders "platform generation unknown"; nullable reading fields render only when present; every reading time-stamped | IMPLEMENTED |
| 9. Completeness | Every use case reachable; failure paths rendered | Capture ← CLI (`bin/grid-commander-record.ts`) and nothing else (deliberate — not on MCP); history/coverage ← pages + two MCP tools; unreadable/empty/never-recorded/never-captured all rendered distinctly (`tests/rendering/recorder.test.ts`) and crossed distinctly (`tests/mcp/recorder-tools.test.ts`) | IMPLEMENTED |

## Iron Rule violations found

None found in self-review. One near-miss recorded: the first coverage-query
draft dropped series with zero successful captures, which would have rendered
a failure-only coin as never-attempted — caught before commit, fixed as the
`neverCaptured` state, tested (`coverage.test.ts` "keeps a coin whose every
read failed visible"). DL-007.

Status: EXECUTION EVIDENCE COMPLETE
