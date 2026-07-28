# Data Pipeline Review — prove-it-runs

- Checklist source: `docs/specs/DATA_PIPELINE_REVIEW_CHECKLIST.md`
- Status: `EXECUTION EVIDENCE COMPLETE`
- Evidence window: `7f4cea3..HEAD`

## Scope Summary

Layers 1 through 4 — the database end of the pipeline. No BattleGrid data is
read, stored, cached, or recomputed. The data in question is Grid-Commander's
own: connections, OAuth transactions, audit entries, confirmations.

The fact that made this review worth doing: **layers 1 to 4 had never
executed.** The schema module, the queries and the mappers had only ever been
checked against each other, in TypeScript. Everything below is the first time
any of them met SQL.

## Source-of-Truth Statement

> BattleGrid is the source of truth for agents, strategies, positions and
> balances. Grid-Commander is the source of truth for who is connected, what
> authority is held, what was done on a user's behalf, and what a user was shown
> before confirming.

Nothing in this change moves a fact across that line.

## Layer Coverage Matrix

| Layer | Touched | Status | Evidence |
|---|:--:|---|---|
| 0 — BattleGrid | ✗ | N/A | Nothing in the diff reaches BattleGrid; the served application made no call |
| 1 — Database | ✓ | PASS | `drizzle/migrations/0000_sleepy_paibok.sql` applied to an empty database: 5 tables, 5 non-PK indexes, 1 foreign key |
| 2 — Schema Definitions | ✓ | PASS | One invented field removed; `db:generate` reports "No schema changes" against the committed migration |
| 3 — Queries | ✓ | PASS | Drizzle builder throughout; user-scoping proven by test rather than by reading |
| 4 — Mappers | ✓ | PASS | `toDomain` unchanged and now exercised against real rows |
| 5 — Use Case | ~ | PASS | `connect.commands.ts` changed — see DL-008. It computes nothing new; it stops substituting its own proposal for the store's answer |
| 6 — Route handlers | ✗ | N/A | Untouched |
| 7 — Client state | ✗ | N/A | None exists |
| 8 — Client components | ✓ | PASS | `app/layout.tsx` renders `children` and nothing else |
| 9 — Pipeline completeness | ✓ | PASS | The pipeline now terminates in a real database rather than in a type |

## Layer 1 — Detail

| # | Check | Status | Evidence |
|---|---|---|---|
| 1 | New data has a migration | PASS | `drizzle/migrations/0000_sleepy_paibok.sql` plus `meta/_journal.json` and `meta/0000_snapshot.json`, committed unedited |
| 2 | Column types match application types | PASS | Proven by round-trip, not by inspection: `text[]` ↔ `readonly Scope[]`, `timestamptz` ↔ `Date` to the millisecond (`tests/db/audit.test.ts`, completed-at assertion), `boolean` ↔ `boolean` |
| 3 | NOT NULL unless genuinely optional | PASS | Four nullable columns, each deliberately so: `refresh_token_encrypted`, `access_token_expires_at` (the server may not tell us), `completed_at` and `failure_reason` (an operation that has not finished has neither), `consumed_at`, `idempotency_key` |
| 4 | No computed columns duplicating application logic | PASS | No generated columns, no defaults beyond `now()` and `audit_entries.actor` |
| 5 | Every user-owned table has a `userId` column and an index on it | PASS with one stated exception | See table below; `oauth_transactions` exempt per DL-005 |

| Table | User-owned | `user_id` | Index | Note |
|---|:--:|:--:|:--:|---|
| `users` | ✓ | `id` **is** the user | PK + `users_battlegrid_subject_idx` (unique) | The subject index is what makes one account one identity |
| `connections` | ✓ | ✓ | `connections_user_id_idx` (unique) | Unique, not merely indexed: one live connection per user |
| `audit_entries` | ✓ | ✓ | `audit_entries_user_id_created_at_idx` | Composite, matching the only read: newest-first for one user |
| `confirmation_tokens` | ✓ | ✓ | `confirmation_tokens_user_id_idx` | |
| `oauth_transactions` | ✗ | — | — | Pre-identity. The row is created before the user is known and consumed at the moment they become known. DL-005 |

## Layer 2 — Detail

| # | Check | Status | Evidence |
|---|---|---|---|
| 1 | Drizzle table definition mirrors the columns exactly | PASS | `confirmation_tokens` in the applied database: `token, user_id, tool, target, consequence, expires_at, consumed_at` — seven, matching the module |
| 2 | **No invented fields absent from the database** | PASS — one removed | `confirmation_tokens.actor` was declared, written by nobody, and read by nobody. Removed before generation, so it never reached SQL at all |
| 3 | Types match between database and application | PASS | `npm run db:generate` reports "No schema changes, nothing to migrate" against the committed migration |

## Layer 3 — Detail

| # | Check | Status | Evidence |
|---|---|---|---|
| 1 | Selects every column downstream layers need | PASS | `select()` unqualified in both readers; `toDomain` consumes the row |
| 2 | JOINs explicit | N/A | No joins in production code |
| 3 | No business calculation in SQL | PASS | Nothing beyond `count(*)` in test assertions |
| 4 | Filtered by `userId` wherever rows are user-owned | PASS | `tests/db/audit.test.ts` "shows a user only their own entries"; `tests/db/confirmations.test.ts` "refuses another user, even with the right token" |

## Layer 4 — Detail

| # | Check | Status | Evidence |
|---|---|---|---|
| 1 | Shape conversion only — no calculation | PASS | `toDomain` at `drizzle-connection-repository.ts:154` |
| 2 | **No fallback that masks missing data** | PASS | `rg "\?\?"` across the touched `src/` paths returns nothing |
| 3 | Nullable sources map to nullable types | PASS | `tests/db/connections.test.ts` "carries an absent expiry as absent, not as an instant" |
| 4 | An unexpected payload shape fails loudly rather than mapping to a partial object | PASS | An unrecognised stored scope is dropped, never carried (`tests/db/connections.test.ts`); an unrecognised stored outcome reads as `attempted`, never as success (`tests/db/audit.test.ts`) |

## Iron Rule Check

> Data is computed once, at its source of truth, and carried unchanged.

| Question | Answer | Evidence |
|---|---|---|
| Does any layer recompute a value another layer already produced? | **One did, and this change stops it.** | `CompleteConnectionCommand` returned the user id *it* proposed rather than the one the store resolved. Under concurrency those differ, and the caller's copy was the wrong one. DL-008 |
| Does any mapper introduce a default that erases "absent"? | No | The two `actor` defaults were the only defaults; one removed, one load-bearing and written on every insert |
| Is any stored value derived from a BattleGrid value? | No | Subject, scopes and tokens are stored as issued |

## Contract Map

Superseded. The plan recorded `N/A — no contract changes`; that was wrong.

| Contract | Before | After | Why |
|---|---|---|---|
| `ConnectionWriter.upsert` | `Promise<string>` — the connection id | `Promise<ResolvedConnection>` — `{ userId, connectionId }` | The caller only *proposes* a user id. It must be told which one the write actually landed under, or a losing concurrent callback signs its user in under an identity holding nothing. DL-008 |

Both fields are identifiers, so the CQRS rule that writers return an identifier
rather than an aggregate still holds.

## Anti-Patterns Checked

| Anti-pattern | Found | Evidence |
|---|:--:|---|
| Stale snapshot shown as live | No | Nothing is cached |
| Rebuilding what the server computed | **Yes — fixed** | The caller rebuilt the identity the store had already resolved. This is the Iron Rule violation the change removes |
| Silent default | No | `rg "\?\?"` clean over touched `src/` paths |
| Two definitions of the same concept | **Yes — fixed** | Two answers to "which user is this" existed: the proposed id and the stored row. Now one, and the store owns it |

## Findings

**F-1 — the Iron Rule was being broken in the one place identity is decided.**
The pattern was not a computation but a substitution: a value the store owns was
answered by the caller from its own guess. It only diverged under concurrency,
which is why nothing caught it.

**F-2 — three predicted schema disagreements, none real.** The backlog item
expected `text[]`, the `(user_id, idempotency_key)` unique index and the
`onConflictDoUpdate` target to fail on first contact. All three work. The two
things that were actually broken — the build, and the identity race — were not
on the list. Reading the code produced three wrong predictions; running it
produced five real findings.

**F-3 — nullable-as-absent held up.** Every nullable column survived a real
round trip carrying null, including the case the checklist warns about
(`accessTokenExpiresAt`, where a default would have invented an expiry).

## Verdict

`EXECUTION EVIDENCE COMPLETE` — ready for the production gate.
