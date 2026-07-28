# Data Pipeline Review: connect-battlegrid-account

**Checklist**: `docs/specs/DATA_PIPELINE_REVIEW_CHECKLIST.md` v1.0.0
**Status**: EVIDENCE RECORDED

---

## Scope

Two sources of truth are in play. BattleGrid owns tool metadata and the token
grant; Postgres owns connections, audit entries, OAuth transactions and
confirmation tokens. This change writes the second and reads the first.

## Applicable Layers

| Layer | Touched | Rules that apply | Evidence |
|---|---|---|---|
| 0 BattleGrid | yes | pass through unmodified; missing field surfaced, never defaulted | `tokenRequest` leaves `expiresIn` undefined when absent rather than defaulting; `rawDiscoverTools` passes annotations through unchanged |
| 1 Postgres | yes | migration exists; NOT NULL unless genuinely optional; `userId` indexed | `schema/index.ts` — nullable `access_token_expires_at` and `completed_at` are deliberately nullable; `userId` indexed |
| 2 Schema | yes | Drizzle definitions mirror columns 1:1 | 1:1 with columns, no computed fields |
| 3 Queries | yes | builder only; `userId`-scoped; no business calculation in SQL | repositories take `userId`; no raw SQL anywhere |
| 4 Mappers | yes | shape only; **no default that masks missing data** | `envelope.ts` round-trip tested; no `??` default on a server field |
| 5 Use case | yes | the only layer computing derived values | `ListAuditQuery` computes `unresolvedCount`; nothing else derives |
| 6 Server actions | yes | pass-through, auth only | callback route is pass-through |
| 7 Client state | yes | **no credential in any store** | no store holds a token — `boundaries.test.ts` asserts no console leak; tokens never leave the server |
| 8 Components | yes | display only | `audit-list.tsx` and `consent-summary.tsx` read props only, no arithmetic |
| 9 Completeness | yes | every use case reachable from a trigger | every use case reachable; empty and unresolved states rendered |

## Contract Map

| Field | Origin | Path to screen | Evidence |
|---|---|---|---|
| `AuditEntry.outcome` | Postgres | repo → mapper → `ListAuditQuery` → audit page | `audit.test.ts` |
| `Connection.scopes` | BattleGrid token response | adapter → repo → `DescribeGrantQuery` → consent summary | `consent.test.ts` |
| `ToolClass.destructive` | BattleGrid annotations | `tools/list` → `classify()` → adapter | `classify.test.ts`, `discovery.test.ts` |

## Iron Rule Violations

None found. The one place a value could have been derived client-side —
"is this snapshot stale" — does not arise in this change, because nothing here
displays cached BattleGrid state. It will arise in `author-agents`, and the
checklist corollary is written for it.

## Verdict

Compliant.
