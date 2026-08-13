# Architecture Review — The Connection Asks Who It Is

**Checklist**: `docs/checklists/ARCHITECTURE_REVIEW_CHECKLIST.md`
**Status**: `EXECUTION EVIDENCE RECORDED`

## Scope Summary

Two port contracts changed (`TokenGrant`, `AccountPort.subjectFor`), one use case
gained a dependency and a refusal branch, one route handler gained two rendered
outcomes. No schema change, no new adapter, no new BattleGrid tool beyond one
already-implemented read and the existing `revoke`.

## Component Checklist Matrix

| # | Rule (Quick Reference Card) | Applies to | Evidence | Verdict |
|---|---|---|---|---|
| 1 | Domain interfaces and ports only; never import infrastructure in a use case | `connect.commands.ts`, `owner-only-user.ts` | `connect.commands.ts:11` imports `type { AccountPort } from '@/ports/account.js'` — a type-only import of an interface. `owner-only-user.ts` unchanged in its imports. `tests/architecture/boundaries.test.ts` passes in the full run | IMPLEMENTED |
| 2 | BattleGrid always through the port; MCP client only at the composition root | the identity read, the release | `connect.commands.ts:135` calls `this.account.subjectFor`; `:182` calls `this.battlegrid.revoke`. The only `new McpAccountAdapter` is `composition.ts:261` | IMPLEMENTED |
| 3 | Scope is never a safety signal — classify the tool | `list_user_active_positions`, `revoke` | Both reach BattleGrid via `callTool`/`revoke`, which classify unchanged. This change adds no scope check and removes none | IMPLEMENTED |
| 4 | Unknown tools fail closed | untouched | N/A — no tool classification changed. `tests/architecture/` suite green | N/A |
| 5 | Audit written before the attempt, updated with the outcome | `revoke` on the refusal path | `revoke` runs the adapter's existing audited path, the same one `DisconnectCommand` uses. No new call path was introduced for it | IMPLEMENTED |
| 6 | `expectedRevision` on every mutation; surface conflicts, never retry | N/A | No revisioned entity is mutated. The `upsert` race tolerance at `connect.commands.ts:145-152` is byte-identical to before — only its key changed from `grant.subject` to `identity.subject` | N/A |
| 7 | Logging structured, contextual, **never a token** | the refusal path | `AccountUnidentifiedError` (`errors.ts:115`) takes `(released, reason)` and never the token. The redirect uses a fixed enum, not the platform's words: `route.ts:45` builds `unidentified` / `unidentified-standing`. Asserted by `connect.test.ts` "never puts the credential in the message a user could see" | IMPLEMENTED |
| 8 | Drizzle builder only, always scoped by `userId` | untouched | No query changed; `npm run db:generate` reports "No schema changes, nothing to migrate" and `git diff --quiet drizzle/` is clean | N/A |
| 9 | Quality gate passes | whole change | `typecheck` PASS · `lint` PASS · `test` PASS (2248) · `build` PASS · drizzle check PASS · **`test:db` NOT RUN — no database credential available in this environment**, see decision log DL-3 | PARTIAL — one gate unrun, scoped below |

## Contract Change Register

| Contract | Before | After | Callers updated | Evidence |
|---|---|---|---|---|
| `TokenGrant` | carried `subject: string` | no identity field | `mcp-adapter.tokenRequest`, `connect.commands.ts`, `connect.test.ts`, `revoke.test.ts` | `battlegrid.ts` — `TokenGrant` now documents *why* there is no subject. `revoke.test.ts` asserts the whole key set: `['accessToken','expiresIn','refreshToken','scopes']` |
| `AccountPort.subjectFor` | `Promise<BattlegridSubject \| null>` | `Promise<AccountIdentityResult>` | `owner-only-user.ts:73`, `account-adapter.ts:33`, `connect.commands.ts:135`, `personal-key.test.ts` | `account.ts:26-32` defines the three outcomes; `account.ts:36-57` carries the rewritten contract note naming both callers |
| `CompleteConnectionCommand` | 5 constructor deps | 6 (adds `AccountPort`, position 2) | `composition.ts:275-281`, `connect.test.ts` | Arity change caught by `typecheck` at both sites, which is how they were found |

## SOLID Notes

| Principle | Where it bites here | Evidence |
|---|---|---|
| Single responsibility | `tokenRequest` maps a token response and no longer adjudicates identity | `mcp-adapter.ts` `tokenRequest` — the `sub` read, the throw, and the mapped field are gone; the reasoning moved to `connect.commands.ts:137-140` rather than being deleted |
| Interface segregation | `AccountPort` stayed one question with one method; the failure *policy* moved to callers | `account.ts:36-57`, and the two opposite call sites at `owner-only-user.ts:73` and `connect.commands.ts:136` |
| Dependency inversion | `CompleteConnectionCommand` depends on the interface | `connect.commands.ts:11` (type-only import); construction only at `composition.ts:277` |

## Specific Risks Checked

| Risk | Result | Evidence |
|---|---|---|
| A fake still supplies `subject` on a grant | **Closed.** No fixture carries one | `grep -rn "subject:" tests/` finds no `TokenGrant` literal with a subject; `revoke.test.ts` asserts the key set exhaustively and `expect(grant).not.toHaveProperty('subject')` |
| `revoke` asserted as "called" rather than "called with the exchanged token" | **Closed.** The argument is asserted | `connect.test.ts` — `expect(revoked).toEqual(['at-1'])`, and `expect(account.calls).toEqual(['at-1'])` for the identity read |
| Personal mode drifts | **Closed.** Two tests added, including the one the old suite lacked | `personal-key.test.ts` — "treats an answer that names nobody exactly like a read that failed" and "remembers an unknown too, rather than re-asking on every request" (the `null`-cache case was previously uncovered) |
| A token reaches a redirect query string | **Closed by construction** | `route.ts:45` emits a fixed enum value, never `err.message` |
| The refusal escapes as a throw | **Closed** | `route.ts:44-47` catches `AccountUnidentifiedError`; `tests/rendering/connect.test.ts` covers both reasons and asserts neither degrades into the raw-value fallback |

## Unplanned Change

`tests/architecture/one-destination.test.ts` was modified — not in the planned
inventory. See decision log **DL-2**. The corrected comment in `src/config.ts`
quotes `https://mcp.battlegrid.trade/register`, which made that file appear twice
in the guard's provenance string. The set of hosts — the thing the rule is for —
was unchanged. Fixed by deduplicating files per host, and the deduplicated guard
was mutation-checked (M3) by planting a second host and confirming it fails.

## Verdict

`EXECUTION EVIDENCE RECORDED` — one gate unrun (`test:db`), scoped in DL-3. The
auditor decides.
