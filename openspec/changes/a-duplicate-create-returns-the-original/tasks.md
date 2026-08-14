# Tasks

## 1. The key holds exactly one live attempt

- [x] 1.1 Make `audit_entries_user_idempotency_idx` partial:
      `.where(outcome != 'failed')` in `src/infrastructure/db/schema/index.ts`,
      then `npm run db:generate` and commit the migration (the drizzle gate
      diffs `drizzle/` against the schema).
- [x] 1.2 Add `DuplicateIdempotencyKeyError` to `src/domain/errors.ts`,
      carrying `tool` (if known at the throw site) and
      `originalOutcome: 'succeeded' | 'attempted'` as **fields** — no caller
      may need to parse its message.
- [x] 1.3 `DrizzleAuditRepository.begin` catches the unique violation
      (Postgres `23505` naming that index), reads the live entry, and throws
      the typed error. Any other insert failure is rethrown untouched.
- [x] 1.4 Narrow `findByIdempotencyKey` to the live entry: with retries there
      can be several rows per `(user, key)`, and the one that holds the key is
      the non-failed one. Update the port comment to say so.
- [x] 1.5 Mirror the invariant in `tests/support/fakes.ts`: the fake audit
      writer refuses a `begin` whose key collides with a non-failed entry, with
      the same typed error.

## 2. The key reaches the platform

- [x] 2.1 `agent-adapter.ts` `createAgent`: spread `idempotencyKey` into the
      tool `arguments` when present (it is the field
      `create_intelligence_agent` declares), while continuing to pass it in
      `extras` for the audit record.

## 3. The refusal reaches the person

- [x] 3.1 `CreateAgentResult` gains
      `{ kind: 'duplicate', originalOutcome: 'succeeded' | 'attempted' }`;
      the command catches `DuplicateIdempotencyKeyError` around
      `agents.createAgent` **only** — a duplicate raised anywhere else is not
      this refusal and must not be swallowed into it.
- [x] 3.2 The `create` action branches on `duplicate` and redirects to
      `/agents/new?problem=<sentence>`; the two sentences (already created /
      may have landed, check your roster) are chosen from `originalOutcome`.
- [x] 3.3 `/agents/new` reads `searchParams.problem` and mounts
      `CarriedProblem` on **every** branch — at-capacity, unreadable catalog,
      unreadable strategies, empty strategies, and the form itself — so the
      bounce cannot land on a branch that drops it (#240).

## 4. Verification

- [x] 4.1 [db] Two `begin`s, same `(user, key)`: the second throws the typed
      error naming `attempted`. After `complete(id, 'failed')`, a third
      `begin` with the same key **succeeds**; after `complete(id2,
      'succeeded')`, a fourth throws naming `succeeded`.
      (Scenarios: retry after a failure; second press while unknown; second
      press after success; two presses racing — the collision path IS the race
      path, there is no separate check to interleave.)
- [x] 4.2 [db] `findByIdempotencyKey` returns the live entry when failed
      siblings share the key.
- [x] 4.3 [unit] The command maps the typed error to `{ kind: 'duplicate' }`
      with the outcome carried through, and does not catch anything else —
      an unrelated throw from `createAgent` still propagates.
- [x] 4.4 [wire] The fake BattleGrid client receives `idempotencyKey` **inside
      `arguments`** for a create. Mutation-check the idiom, not only the
      behavior: deleting the spread in 2.1 must fail this test even though the
      guard-level plumbing still passes the key — this is exactly the
      plumbing-vs-landing gap the #229 task 3.3 annotation records.
- [x] 4.5 [rendering] `/agents/new?problem=…` shows the carried sentence on
      the form branch and on at least one refusal branch.
- [x] 4.6 Quality gates: typecheck, lint, test, build, db:generate diff,
      test:db (needs DATABASE_URL; skip locally if absent, CI provides it).

> **Executed 2026-08-14**: typecheck, lint, vitest (2362 across 184 files, up
> from 2352/183), build, and `db:generate` ("no schema changes") all pass
> locally. **4.1/4.2 are written but have not executed locally** — no
> DATABASE_URL and no local Postgres, the config's own skip condition. They
> run in CI's `test:db`, which is where the partial index's semantics are
> actually proven; do not archive this change on a red or unrun db suite.
