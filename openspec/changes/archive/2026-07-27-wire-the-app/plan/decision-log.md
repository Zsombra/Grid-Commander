# Decision Log: wire-the-app

---

## Phase 1 — Planning

### 2026-07-27 · WL-1 · Scope · This change exists because a gate found it

**Decision**: Build the session, the persistence, the composition root and the
routes as one change, ahead of `author-strategies`.

**Reason**: PG-103. Two changes shipped every requirement in their delta specs
and no user could reach a line of either. The gate declined to block
`author-agents` for a gap it inherited, and escalated it to P1 instead. This is
the action that finding called for.

**Approved by**: owner (full autonomy granted 2026-07-27).

---

### 2026-07-27 · WL-2 · Discovery · The persistence layer was also missing

**Decision**: Implement the four Drizzle repositories here.

**Reason**: `src/infrastructure/db/repositories/` was an empty directory.
`connect-battlegrid-account` shipped the schema and the ports and nothing that
implements them — every test in both prior changes runs against in-memory
doubles.

**This widens what `no-composition-root` said.** That item described missing
routes and a missing session; the truth was that nothing had ever written a row.
The backlog entry understated it, and the correction belongs on the record rather
than in a quiet fix.

**Approved by**: owner.

---

### 2026-07-27 · WL-3 · Design · The session is a signed pointer, not a server record

**Decision**: An HMAC over `userId.issuedAt` in an httpOnly, secure, sameSite=lax
cookie. No BattleGrid token, no scopes.

**Reason**: change 1 encrypted tokens at rest so a database dump alone would not
be usable; putting one in a cookie hands it to every browser. A random session id
in a table is the more conventional answer and buys instant server-side
invalidation, at the cost of a table, a read per request, and a cleanup job. The
deciding factor is that this product's authority is already revocable at its
source — a stolen session survives as a pointer to a user whose connection can be
made to hold nothing.

**Accepted limitation, with a trigger**: a leaked cookie stays valid until it
expires or the connection is revoked. **If this product ever holds anything not
gated by the BattleGrid connection, revisit.**

**Approved by**: owner.

---

## Phase 2 — Execution

### 2026-07-27 · WL-4 · Finding · The confirmation store would have been replayable

**Decision**: Every condition — token, user, tool, target, unconsumed,
unexpired — lives in the `WHERE` of the consuming update.

**Reason**: the first implementation checked single-use and expiry *after* the
update, reading them from `.returning()`. That returns the row as it now is, so
`consumedAt !== null` could never fail: it would always see the value the
statement had just written. A spent confirmation token would have been reusable.

**Why this one matters more than its size**: the confirmation token is the
guarantee the whole rebind design rests on (DL-5, AL-6), and both prior changes'
tests prove the *domain* enforces single use — against a fake that got it right.
The real implementation would have silently not.

**Impacted**: `drizzle-audit-repository.ts`. Putting the conditions in the `WHERE`
also makes the check atomic, so two concurrent requests cannot both spend one
token.

**Approved by**: owner.

---

### 2026-07-27 · WL-5 · Finding · The route boundary found drift on its first run

**Decision**: `audit-list.tsx` moved from `app/(app)/audit/` to
`src/presentation/components/`.

**Reason**: the new structural rule — nothing under `app/` imports the domain or
infrastructure — flagged it. It was a component living in a route directory,
placed there in change 1. Moving it is the fix; the rule finding it on its first
execution is the argument for the rule.

---

### 2026-07-27 · WL-6 · Deviation · Two surfaces are partial, and say so

**Decision**: Ship `/agents/[id]/rebind` taking its target as a query parameter,
and the agent detail page without a full edit form.

**Reason**: rebinding needs a strategy browser, which is `author-strategies`. The
edit form needs the trading-config UI, which is a substantial surface of its own.
Both underlying use cases are wired and tested; what is missing is chrome.

**Filed as**: `agent-edit-form`. The rebind placeholder disappears when change 3
lands. Both are stated in `uiux-review.md` rather than ticked off silently.

---

### 2026-07-27 · WL-7 · Known gap · No migration has been generated

**Decision**: Ship without running `drizzle-kit generate`.

**Reason**: the schema is complete and the repositories typecheck against it, but
no SQL has been executed and there is no database in this environment to execute
it against. Generating a migration that has never been applied would be a file
claiming more than it has earned.

**Filed as**: `generate-initial-migration`. The first deployment cannot happen
without it, and it is the first thing to do when there is a database.

---

### 2026-07-27 · WL-8 · Executor handoff

**Decision**: Execution complete. 254 tests, up from 223.

**Mutation-checked**:
- session signature not verified → 2 failures
- refresh never triggered → 4 failures

**The test that matters most** is `tests/access/end-to-end.test.ts`. It drives
session → authority → guard sequence → adapter → BattleGrid with a double only at
`fetch`, and proves through the real path that a destructive call without a
confirmation is refused before it is attempted, writes no audit row, and that a
confirmation for one destination does not authorise another. That was the
assumption three changes had been resting on.

**Next action**: production gate.

---

## Phase 3 — Production Gate

### 2026-07-27 · WL-9 · AUDIT · The same defect, a third time — now guarded mechanically

**Decision**: PASS. Three MAJOR fixed, PG-204 deferred at P1, PG-205 deferred.

**PG-201** — the routes read `Number(formData.get('expectedRevision'))`.
`Number(null)` is 0 and `Number('nonsense')` is NaN, and either would have been
sent to BattleGrid as the concurrency token for a destructive rebind.

**PG-202** — `String(formData.get('risk')) as Risk`. The cast type-checks and
asserts nothing; `isRisk`, `isOutlook` and `isConviction` were written in
`author-agents` and called by nothing until now. A guard nobody calls is not a
guard.

**PG-203** — the confirmation store's single-use check read from `.returning()`,
which is the post-update row, so it could never fail. A spent token would have
been reusable. Found by reading, not by a test — which is PG-204.

**The pattern**: PG-201 is the third appearance of one defect in this project —
`expectedRevision ?? -1`, `slotUsage.limit ?? 0`, and now a form coercion.
Different layers, different fields, one shape. The lesson was written into the
journal twice and recurred anyway, which is the argument that a written lesson
is not a control. It is a test now:
`tests/agent/concurrency.test.ts::no identifier is coerced into existence` fails
the build on a fourth occurrence.

**PG-204 escalated**: four repositories have never executed a statement. PG-203
was caught by reading; a second defect of that kind would not be. Filed as
`generate-initial-migration` at P1, owned by the first deployment.

**Next action**: archiver.
