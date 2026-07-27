# Data Pipeline Review: connect-battlegrid-account

**Checklist**: `docs/specs/DATA_PIPELINE_REVIEW_CHECKLIST.md` v1.0.0
**Status**: PENDING EXECUTION EVIDENCE

---

## Scope

Two sources of truth are in play. BattleGrid owns tool metadata and the token
grant; Postgres owns connections, audit entries, OAuth transactions and
confirmation tokens. This change writes the second and reads the first.

## Applicable Layers

| Layer | Touched | Rules that apply | Evidence |
|---|---|---|---|
| 0 BattleGrid | yes | pass through unmodified; missing field surfaced, never defaulted | _pending_ |
| 1 Postgres | yes | migration exists; NOT NULL unless genuinely optional; `userId` indexed | _pending_ |
| 2 Schema | yes | Drizzle definitions mirror columns 1:1 | _pending_ |
| 3 Queries | yes | builder only; `userId`-scoped; no business calculation in SQL | _pending_ |
| 4 Mappers | yes | shape only; **no default that masks missing data** | _pending_ |
| 5 Use case | yes | the only layer computing derived values | _pending_ |
| 6 Server actions | yes | pass-through, auth only | _pending_ |
| 7 Client state | yes | **no credential in any store** | _pending_ |
| 8 Components | yes | display only | _pending_ |
| 9 Completeness | yes | every use case reachable from a trigger | _pending_ |

## Contract Map

| Field | Origin | Path to screen | Evidence |
|---|---|---|---|
| `AuditEntry.outcome` | Postgres | repo → mapper → `ListAuditQuery` → audit page | _pending_ |
| `Connection.scopes` | BattleGrid token response | oauth-client → repo → `DescribeGrantQuery` → consent summary | _pending_ |
| `ToolClass.destructive` | BattleGrid annotations | `tools/list` → `classify()` → adapter | _pending_ |

## Iron Rule Violations

_To be filled by the executor._

## Verdict

_Pending._
