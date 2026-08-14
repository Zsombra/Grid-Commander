# Tasks

## 1. The move

- [x] 1.1 Create `app/(app)/pending/[id]/actions.ts` — module-level
      `'use server'`, exporting `agree` and `decline` unchanged in flow, with
      field reads through `requiredText` (`id`, `agentId`,
      `confirmationToken`, `changes` on agree; `id` on decline). Keep the
      `JSON.parse` try/catch and its "unreadable values" redirect for a
      malformed `changes`; only absence changes outcome.
- [x] 1.2 `app/(app)/pending/[id]/page.tsx` imports both from `./actions.js`;
      the local `text` helper and the two function bodies leave the page.
- [x] 1.3 Create `app/connect/actions.ts` — module-level `'use server'`,
      exporting `startAuthorization` verbatim; page imports from
      `./actions.js`.

## 2. The guard

- [x] 2.1 In `tests/architecture/reachability.test.ts`, add an
      `inlineDirectives(src)` matcher returning the name of every function
      whose body begins with a `'use server'` directive, and a rule asserting
      the UI tree has none — failure text names file and function.
- [x] 2.2 Add fixture proofs to the matcher-doctrine describe block: the
      matcher catches the exact inline shape the moved actions had, and does
      not report a module-level directive or a function without the directive
      — same matcher the rule runs, not a retyped copy.
- [x] 2.3 Prove the rule with a planted defect: reintroduce one inline action
      in a UI file, observe the rule fail naming it, remove it. Record the
      observation in the task note, not just "tests pass".

## 3. Coverage now real

- [x] 3.1 Confirm `a-form-sends-what-its-action-reads.test.ts` discovers
      `agree` and `decline` through the importer walk (pairs gain 2), and
      raise the discovery floor 14 → 16 with a comment naming this change.
- [x] 3.2 Confirm `reachability.test.ts`'s orphan-action rule now enumerates
      all three moved actions and finds their form bindings.

## 4. Surfaces

- [x] 4.1 Grep every manifest's `source_digest` for both touched pages (the
      lesson from #260: one file can stale several surfaces), then re-survey
      `pending-proposal` and `connect`, adding the new actions.ts files as
      sources and re-pinning digests.

## 5. Verification

- [x] 5.1 Quality gates: typecheck, lint, vitest, build, drizzle no-op
      (`test:db` skipped deliberately — the environment's DATABASE_URL now
      points at the LIVE record db and the suite's disposable-database guard
      must refuse it).
- [x] 5.2 `python3 .claude/tools/openspec.py validate <change>` clean; backlog
      item #263 linked `in-progress` → this change.

## Execution notes

- Two more checks had pinned the old page path and were carried along —
  neither was in the proposal's impact list, both found by the gates:
  `tests/architecture/proposals-are-inert.test.ts` (write-before-close
  ordering now read from `actions.ts`) and
  `tests/proposal/agreeing-to-a-limit.test.ts` (its ACTIONS list named the
  page and its comment said pending's action was "still in-page").
- Planted-defect proofs, both observed failing before revert: an inline
  `plantedDefect` in `app/connect/page.tsx` fired the new guard naming file
  and function; deleting the `confirmationToken` hidden input fired the field
  cross-check with "agree reads 'confirmationToken', which page.tsx does not
  render" — the RebindConfirm defect class, caught on a formerly invisible
  action.
- Gates: typecheck, lint, vitest 2419/190 files, build, drizzle no-op —
  all pass. `test:db` skipped deliberately (DATABASE_URL points at the LIVE
  record database; the suite's refusal of it is correct).
- Surfaces `pending-proposal` and `connect` re-pinned at `106ddf7` with the
  new actions.ts files as sources; `validate --all` 0 errors.
