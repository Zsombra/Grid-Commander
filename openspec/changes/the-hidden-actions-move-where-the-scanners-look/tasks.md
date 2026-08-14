# Tasks

## 1. The move

- [ ] 1.1 Create `app/(app)/pending/[id]/actions.ts` — module-level
      `'use server'`, exporting `agree` and `decline` unchanged in flow, with
      field reads through `requiredText` (`id`, `agentId`,
      `confirmationToken`, `changes` on agree; `id` on decline). Keep the
      `JSON.parse` try/catch and its "unreadable values" redirect for a
      malformed `changes`; only absence changes outcome.
- [ ] 1.2 `app/(app)/pending/[id]/page.tsx` imports both from `./actions.js`;
      the local `text` helper and the two function bodies leave the page.
- [ ] 1.3 Create `app/connect/actions.ts` — module-level `'use server'`,
      exporting `startAuthorization` verbatim; page imports from
      `./actions.js`.

## 2. The guard

- [ ] 2.1 In `tests/architecture/reachability.test.ts`, add an
      `inlineDirectives(src)` matcher returning the name of every function
      whose body begins with a `'use server'` directive, and a rule asserting
      the UI tree has none — failure text names file and function.
- [ ] 2.2 Add fixture proofs to the matcher-doctrine describe block: the
      matcher catches the exact inline shape the moved actions had, and does
      not report a module-level directive or a function without the directive
      — same matcher the rule runs, not a retyped copy.
- [ ] 2.3 Prove the rule with a planted defect: reintroduce one inline action
      in a UI file, observe the rule fail naming it, remove it. Record the
      observation in the task note, not just "tests pass".

## 3. Coverage now real

- [ ] 3.1 Confirm `a-form-sends-what-its-action-reads.test.ts` discovers
      `agree` and `decline` through the importer walk (pairs gain 2), and
      raise the discovery floor 14 → 16 with a comment naming this change.
- [ ] 3.2 Confirm `reachability.test.ts`'s orphan-action rule now enumerates
      all three moved actions and finds their form bindings.

## 4. Surfaces

- [ ] 4.1 Grep every manifest's `source_digest` for both touched pages (the
      lesson from #260: one file can stale several surfaces), then re-survey
      `pending-proposal` and `connect`, adding the new actions.ts files as
      sources and re-pinning digests.

## 5. Verification

- [ ] 5.1 Quality gates: typecheck, lint, vitest, build, drizzle no-op
      (`test:db` skipped deliberately — the environment's DATABASE_URL now
      points at the LIVE record db and the suite's disposable-database guard
      must refuse it).
- [ ] 5.2 `python3 .claude/tools/openspec.py validate <change>` clean; backlog
      item #263 linked `in-progress` → this change.
