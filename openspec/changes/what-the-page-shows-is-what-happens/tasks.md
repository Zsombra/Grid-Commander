# Tasks

## 1. The fork takes the revision the page named (#165)

- [x] 1.1 Carry the rendered revision through the fork form as a hidden input,
      beside `strategyId` and `name`. Traces to: **A Fork Is Taken At The
      Revision The Page Named**.
- [x] 1.2 `forkStrategy` sends that revision as `sourceRevision` instead of
      `listing.strategy.revision` from the re-read. Keep the re-read — it is the
      still-exists check, and its failure path already bounces correctly.
- [x] 1.3 Correct `fork/page.tsx:18` and `:150`. They currently assert the
      guarantee this change is adding; once it is real they should describe how
      it is kept, not claim it as given.
- [x] 1.4 Do **not** add a refusal path for a revision that is no longer
      current. `fork_strategy` takes `sourceRevision` by design.

## 2. Restore consults state before address (#165)

- [x] 2.1 Move the `strategy.isActive` branch above the
      `outcome === 'repair-required'` branch in
      `app/(app)/strategies/[id]/restore/page.tsx`. Both sit after
      `const { strategy } = listing`, so this is an ordering change only.
      Traces to: **A Stale Address Does Not Describe A Current State**.

## 3. The conditions lists key on identity (#167)

- [x] 3.1 Key the four lists in `app/(app)/strategies/[id]/conditions/save/page.tsx`
      on position (or a composite carrying it) rather than display text —
      `:193`, `:230`, `:250`, and the `named` list at `:279`. Traces to:
      **A Listing Shows Every Entry It Was Given**.
- [x] 3.2 Leave `'(an entry with no key)'` as the *displayed* text. It is the
      honest label; it was only ever wrong as a React key.

## 4. Tests

- [x] 4.1 Fork: the revision on the form is the revision sent, and a parent
      edited between render and perform does not change it.
- [x] 4.2 Restore: a `?outcome=repair-required` address on an active strategy
      renders the not-archived state, not the needs-rebuilding one.
- [ ] 4.3 Conditions-save: two key-less entries both render; two identical
      refusal reasons both render. **This page has no test file today** — it is
      created here.

## 5. Gates

- [x] 5.1 `npm run typecheck`
- [x] 5.2 `npm run lint`
- [x] 5.3 `npm test`
- [x] 5.4 `npm run build`
- [x] 5.5 `npm run db:generate && git diff --quiet drizzle/`
- [ ] 5.6 `npm run test:db` — blocked on database credentials, as on the
      previous change. Report as blocked, never as passed.

## Execution record — 2026-08-13

**Gates**: typecheck PASS · lint PASS · `npm test` PASS (169 files / **2213**
tests, up from 2210) · build PASS · db:generate + drizzle clean PASS.
`npm run test:db` **BLOCKED** on database credentials, unchanged from the
previous change — reported blocked, never passed.

**1.x — the fork.** `ForkStrategyRequest` gained a required `sourceRevision`;
`strategy-lifecycle.command.ts:46` sends it instead of `req.strategy.revision`.
Making it **required rather than optional** was the decision worth having: the
compiler then named all six call sites, and a defaulted field would have let
exactly the old behaviour survive silently in any caller that forgot it.

**4.1 — the test that could not fail before.** `lifecycle.test.ts` already had
*"copies the revision the user was looking at"*, and it passed under the old
code because the command read `strategy.revision`. It now sets `sourceRevision`
explicitly, and a **new** case — *"copies what the page named, not what the
re-read found"* — passes `strategy: {revision: 9}` with `sourceRevision: 2` and
asserts 2 wins. That is the case the old assertion was blind to.

## Corrections to this plan

**DL-1 — the conditions-save page does have tests.** Task 4.3 said "This page
has no test file today — it is created here." Wrong:
`tests/rendering/condition-write.test.ts` renders it. Nothing was created; the
claim was checked before acting on it, which is why no duplicate file exists.

**DL-2 — one of the four key sites was never vulnerable.** Every string in
`parsed.problems` is generated as `Row ${index + 1} …`
(`src/presentation/condition-form.ts:129-198`), so that list **cannot** contain
duplicates and keying it by text was already safe. The fix is kept — a key that
is unique only by accident of its wording is a trap for the next edit — but
#167's claim was overstated for that one. The genuinely collapsing case is
`named` at `:279`, where every key-less entry maps to the *same literal*.

## Not done

- [ ] 4.3 **Conditions-save key scenarios cannot be covered — see #194.**
      The fixture turned out to be reachable (`listedKeys` maps a missing key to
      `null`, and the fake port's `conditionsAsGiven` feeds it), so a test was
      written and it passed. It then **passed identically against the old,
      broken keying**, verified by reverting the fix and re-running: 17 passed
      both ways.

      The harness never reconciles. `tests/rendering/support/render.ts` walks
      the element tree, and a key collision only exists during reconciliation —
      two `<li>` with one key are two nodes in the tree and one in the DOM. So
      **no test in this project can observe this class of defect**, and the one
      written was vacuous. It was removed rather than kept.

      The code fix stays: it is correct in a browser, which is where it matters.
      The requirement stays: it is observable, just not here. Filed as **#194**,
      including the reproduction. The two scenarios are **knowingly uncovered**,
      and that is a fact about the suite, not a shortcut taken here.
- [ ] 5.6 `npm run test:db` — blocked on credentials.
