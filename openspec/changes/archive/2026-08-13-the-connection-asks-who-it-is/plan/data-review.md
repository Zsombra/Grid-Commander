# Data Pipeline Review — The Connection Asks Who It Is

**Checklist**: `docs/checklists/DATA_PIPELINE_REVIEW_CHECKLIST.md`
**Status**: `EXECUTION EVIDENCE RECORDED`

## Scope Summary

One fact changed provenance: `users.battlegrid_subject`. It used to be copied
from a token response. It is now copied from an authenticated read of the
platform. The column, its type, and every query against it are untouched.

## Contract Map

Traced field by field, because the whole change is one field's provenance.

| Stage | Before | After |
|---|---|---|
| BattleGrid | `POST /token` → `sub` (**never sent**) | `list_user_active_positions` → `userId` (observed `0eccbf37-d90b-4933-88f2-d120627b23f7`) |
| Adapter | `mcp-adapter.tokenRequest` mapped `json.sub` → `TokenGrant.subject`, throwing when absent | `account-adapter.subjectFor:33` maps `payload.userId` → `{kind:'subject', subject}`; `tokenRequest` maps no identity at all |
| Port | `TokenGrant.subject: string` | `AccountIdentityResult` (`account.ts:26`) — `subject` \| `unreadable` \| `unnamed` |
| Use case | `connect.commands` read `grant.subject` | `connect.commands.ts:135` asks; `:136` refuses without an answer |
| DB column | `users.battlegrid_subject` | **unchanged**, same column, same type, same writer |
| Presentation | n/a | n/a — no surface renders the subject |

No DTO reaching a page changed shape.

## The Iron Rule

BattleGrid is the source of truth for account identity. This product stores that
answer and does not compute, derive, or default one.

| Iron Rule check | Evidence | Verdict |
|---|---|---|
| The identity written to the column came from BattleGrid | `connect.commands.ts:145-152` — `battlegridSubject: identity.subject`, and `identity` is the port's answer | IMPLEMENTED |
| No placeholder, empty string, or locally-minted id can reach the column | `account-adapter.ts:71-73` returns `unnamed` for an empty or non-string `userId`; `connect.commands.ts:136` refuses on anything that is not `subject`. Asserted by `connect.test.ts` "refuses on an answer that named nobody" | IMPLEMENTED |
| `asSubject` is called only where the value is BattleGrid's answer | `grep -rn "asSubject(" src/` → `subject.ts` (the definition), `account-adapter.ts:77` (the platform's payload), `resolve-authority.query.ts` (the stored column). The grant call site is gone | IMPLEMENTED |

## Layer Matrix

| Layer | Touched | What changed | Evidence | Verdict |
|---|:--:|---|---|---|
| 0 BattleGrid | ● | one added read, one conditional `revoke` | `account-adapter.ts:44-51`, `connect.commands.ts:182` | IMPLEMENTED |
| 1 Database | ○ | nothing | `npm run db:generate` → "No schema changes, nothing to migrate"; `git diff --quiet drizzle/` clean | N/A |
| 2 Schema definitions | ○ | nothing | same as above | N/A |
| 3 Queries | ○ | `findUserIdBySubject` / `upsert` unchanged | `connect.commands.ts:143-152` — only the argument's origin changed | N/A |
| 4 Mappers | ● | `tokenRequest` maps one less field; `subjectFor` maps three outcomes | `mcp-adapter.tokenRequest`, `account-adapter.ts:33-79` | IMPLEMENTED |
| 5 Use case | ● | the only layer that computes | `connect.commands.ts:135-141`, `:177-186` | IMPLEMENTED |
| 6 Route handlers | ● | two new rendered outcomes, no throw | `route.ts:44-47` | IMPLEMENTED |
| 7 Client state | ○ | nothing | — | N/A |
| 8 Client components | ● | `/connect` names both reasons | `app/connect/page.tsx`; `tests/rendering/connect.test.ts` 9 tests pass | IMPLEMENTED |
| 9 Completeness | ● | every new outcome reaches a surface that states it | `unreadable` and `unnamed` both → `AccountUnidentifiedError` → one of two redirect reasons → two distinct sentences | IMPLEMENTED |

## Anti-Pattern Watch

| Anti-pattern | Result | Evidence |
|---|---|---|
| **Silent Default** | Avoided in both directions | The old code *required* a missing field; the new code neither requires nor defaults one. `account-adapter.ts:71` refuses to invent a subject from an empty string — the same case the deleted guard covered |
| **Two Definitions Of The Same Concept** | Held | `BattlegridSubject` is still branded and still minted only by `asSubject`; `users.id` remains a separate column and a separate type |
| **Stale Snapshot Shown As Live** | Held | `owner-only-user.ts:73-75` caches *unknown* as unknown, never a stale known. Asserted by "remembers an unknown too, rather than re-asking on every request" |
| **Rebuilding What The Server Computed** | Held | The account id is read whole from `payload.userId`; nothing assembles one |

## Multi-Tenancy Check

The failure this change most had to avoid is the one the deleted guard prevented.

| Check | Evidence | Verdict |
|---|---|---|
| Two distinct subjects never resolve to one `users.id` | `connect.test.ts` "treats a different subject as a different user" — two subjects, `connections.size === 2`, different `userId` | IMPLEMENTED |
| An unidentified account creates no row at all | `connect.test.ts` `unidentified_refused_and_released` — `connections.size === 0` on all three branches. **Mutation-checked (M2)** | IMPLEMENTED |
| A returning subject resolves to its existing row, and the session uses the id the **store** confirmed | `connect.test.ts` "recognises a returning user by their BattleGrid subject" — `connections.size === 1`, `second.userId === first.userId`, asserted against the store | IMPLEMENTED |

## Gap

`npm run test:db` did not run: no database credential exists in this environment
(there is no `.env` in the worktree or the main checkout, and the Postgres on
`:5432` requires a password). Scope of the gap, stated precisely: **no test under
`tests/db/` imports or constructs anything this change touched.** The single
mention is a prose comment at `tests/db/connections.test.ts:140`. `typecheck`
covers `tests/` and passes, so the db suite compiles against the new contracts.
See decision log DL-3.

## Verdict

`EXECUTION EVIDENCE RECORDED`
