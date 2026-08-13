# Tasks

## 1. The guard

- [x] 1.1 Add an async check in `tests/db/support.ts` that refuses when
      `connections` holds a row with `status = 'active'`. **Corrected during
      execution**: it runs from `tests/db/global-setup.ts`, once before any file,
      not at the truncation point — see the note below.
- [x] 1.2 The message says what is at stake — the tokens exist only in that row,
      so the grant survives and becomes unrevocable — and names disconnecting
      through the product as the repair. It also gives the direct SQL remedy, so
      nobody is stuck without the app running.
- [x] 1.3 `DB_TESTS_MAY_TRUNCATE=yes` does **not** bypass it, and the comment
      says why: that flag asserts the *database* is disposable, which is a
      different claim from the *data* being disposable. Conflating them is the
      bug.
- [x] 1.4 A missing `connections` table proceeds (nothing can be stranded in a
      table that does not exist). Any other read failure refuses — an unreadable
      table is not permission.

## 2. Verification

- [x] 2.1 An active connection refuses, and **truncates nothing** — assert the
      row still exists after the refusal, not merely that it threw.
- [x] 2.2 No connection proceeds.
- [x] 2.3 A revoked-only connection proceeds.
- [x] 2.4 `DB_TESTS_MAY_TRUNCATE=yes` does not bypass the live-grant refusal,
      while still bypassing the name check — the two are independent.
- [x] 2.5 **Mutation check.** Disable the refusal and confirm 2.1 fails. This
      change exists because a documented hazard fired twice; a guard nobody has
      seen fail is the same thing again.
- [x] 2.6 Quality gates: `npm run typecheck`, `npm run lint`, `npm test`,
      `npm run build`, drizzle schema check, `npm run test:db`.


---

## Execution note — the guard was scoped wrong twice before it was right

The task said "at the truncation point, once, not on every `reset()`". Two
narrower placements were built and both were wrong, and the second failed
loudly enough to be worth recording:

1. **Per `reset()`** — re-asks a question the suite has already answered by
   emptying the table.
2. **Per harness, then a module-level flag** — vitest isolates modules per test
   file, so the flag resets for each one. Scoped that way the check fired on
   `connections.test.ts`'s **own fixtures** and refused **42 tests** in the files
   that ran after it. The guard worked perfectly, against the wrong subject.

The question is only ever whether the database held a live grant **before the
suite started**. Once it is running, every connection in there is its own
fixture. `globalSetup` is the only placement that means what the question means,
and it aborts before a single table is touched.

That mis-scoping is worth keeping in the file rather than tidying away: it is the
same confusion as the bug being fixed, one level down. `assertDisposable` asked
about the database when the fact was in the data; this asked about the run when
the fact was about what preceded it.

**Mutations.** M1 — refusal disabled: the three refusal tests failed, the two
"proceeds" tests correctly did not. M2 — a live connection planted and the real
suite run end to end: it aborted with `no tests` executed, printed the refusal,
and **the row survived**. M2 is the one that matters; it is exactly the run that
destroyed a grant twice today.

**Gates**: `typecheck` PASS · `lint` PASS · `vitest` PASS (2264) · Python harness
PASS (255) · `build` PASS · drizzle clean · `test:db` PASS (**90**, up from 85).
