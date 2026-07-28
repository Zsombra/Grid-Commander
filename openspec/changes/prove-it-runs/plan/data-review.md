# Data Pipeline Review — prove-it-runs

- Checklist source: `docs/specs/DATA_PIPELINE_REVIEW_CHECKLIST.md`
- Status: `PENDING EXECUTION EVIDENCE`

## Scope Summary

This change touches the database end of the pipeline only — layers 1 through 4.
No BattleGrid data is read, stored, or recomputed. The data in question is
Grid-Commander's own: connections, OAuth transactions, audit entries,
confirmations.

The relevant fact for this review is that **layers 1 to 4 have never executed**.
The schema module, the queries and the mappers have only ever been checked
against each other, in TypeScript. This change is the first time any of them
meets SQL.

## Source-of-Truth Statement

> BattleGrid is the source of truth for agents, strategies, positions and
> balances. Grid-Commander is the source of truth for who is connected, what
> authority is held, what was done on a user's behalf, and what a user was shown
> before confirming.

Nothing in this change moves a fact across that line.

## Layer Coverage Matrix

| Layer | Touched | Checklist checks that apply | Status | Evidence |
|---|:--:|---|---|---|
| 0 — BattleGrid | ✗ | — | N/A | Nothing in the diff reaches BattleGrid |
| 1 — Database | ✓ | 1 new data has a migration; 2 column types match application types; 3 NOT NULL unless genuinely optional; 4 no computed columns; 5 user-owned tables have `userId` + index | PENDING | |
| 2 — Schema Definitions | ✓ | 1 mirrors columns exactly; 2 no invented fields; 3 types match | PENDING | |
| 3 — Queries | ✓ | 1 selects every column downstream needs; 3 no business calculation in SQL; 4 filtered by `userId` where user-owned | PENDING | |
| 4 — Mappers | ✓ | 1 shape conversion only; 2 no fallback masking missing data; 3 nullable → nullable; 4 unexpected shape fails loudly | PENDING | |
| 5 — Use Case | ✗ | — | N/A | No use case in the diff |
| 6 — Route handlers | ✗ | — | N/A | |
| 7 — Client state | ✗ | — | N/A | None exists |
| 8 — Client components | ✗ | — | N/A | The root layout renders `children` |
| 9 — Pipeline completeness | ✓ | The feature's pipeline reaches a real store | PENDING | |

## Layer 1 — Detail

| # | Check | Status | Evidence |
|---|---|---|---|
| 1 | New data has a migration | PENDING | |
| 2 | Column types match application types | PENDING | |
| 3 | NOT NULL unless genuinely optional | PENDING | |
| 4 | No computed columns duplicating application logic | PENDING | |
| 5 | Every user-owned table has a `userId` column and an index on it | PENDING | `oauth_transactions` exempt — see DL-005 |

Table-by-table for check 5, to be confirmed against the applied schema:

| Table | User-owned | `user_id` | Index | Note |
|---|:--:|:--:|:--:|---|
| `users` | ✓ | `id` is the user | PK | |
| `connections` | ✓ | ✓ | `connections_user_id_idx` (unique) | |
| `audit_entries` | ✓ | ✓ | `audit_entries_user_id_created_at_idx` | |
| `confirmation_tokens` | ✓ | ✓ | `confirmation_tokens_user_id_idx` | |
| `oauth_transactions` | ✗ | — | — | Pre-identity; DL-005 |

## Iron Rule Check

> Data is computed once, at its source of truth, and carried unchanged.

| Question | Answer | Evidence |
|---|---|---|
| Does any layer recompute a value another layer already produced? | PENDING | |
| Does any mapper introduce a default that erases "absent"? | PENDING | The two `actor` column defaults are the only defaults in the schema; one is removed by this change |
| Is any stored value derived from a BattleGrid value? | PENDING | |

## Contract Map

`N/A — No contract changes.` No port signature, DTO, or domain type changes in
this diff. `DrizzleConnectionRepository.upsert` keeps its signature; what changes
is which identifier it resolves internally.

## Anti-Patterns Checked

| Anti-pattern | Found | Evidence |
|---|:--:|---|
| Stale snapshot shown as live | PENDING | |
| Rebuilding what the server computed | PENDING | |
| Silent default | PENDING | |
| Two definitions of the same concept | PENDING | |

## Findings

_To be filled by the executor with `path:line` evidence._

## Verdict

`PENDING EXECUTION EVIDENCE`
