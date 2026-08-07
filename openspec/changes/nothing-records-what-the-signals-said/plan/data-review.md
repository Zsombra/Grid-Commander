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
  use-case layer only, shipped as first-class DTO fields.

## Contract map

| Contract | Direction | Shape source |
|---|---|---|
| `get_coin_signal_preview` payload | platform → product | observed shape, v11.0.0, `docs/battlegrid-mcp-surface.json` |
| `signal_captures` / `signal_readings` rows | product ↔ product | Drizzle schema, additive migration |
| History / coverage DTOs | use-case → pages + MCP | one definition per derived value, in the query |

## Checklist matrix (to be filled with evidence by the executor)

| Layer | Rule under review | Evidence (file:line / test) | Status |
|-------|-------------------|------------------------------|--------|
| 0. BattleGrid | Passed through unmodified; missing surfaced as missing; unknown enums render as themselves | — | PENDING |
| 0. BattleGrid | Every displayed reading carries its capture time | — | PENDING |
| 1. Database | Migration exists; NOT NULL only where genuinely required; `user_id` + index on both tables | — | PENDING |
| 2. Schema | Tables mirror columns 1:1; `captured_at` from injected clock, not `defaultNow()` | — | PENDING |
| 3. Queries | Builder only; every query `userId`-scoped; no business calc in SQL | — | PENDING |
| 4. Mappers | Shape only; no masking defaults; unexpected payload fails loudly; raw stored pre-mapper | — | PENDING |
| 5. Use Case | Gap definition exists exactly once (`read-record-coverage.query.ts`); summaries computed here only | — | PENDING |
| 6. Routes/pages | Pass-through + `acting()` auth only | — | PENDING |
| 7. Client state | None introduced | — | PENDING |
| 8. Components | Display only; no arithmetic on DTO fields; missing renders as unknown | — | PENDING |
| 9. Completeness | Capture ← CLI; history/coverage ← pages + MCP; unreadable/empty/never-recorded all rendered | — | PENDING |

## Iron Rule violations found

(none recorded — execution has not started)

Status: PENDING EXECUTION EVIDENCE
