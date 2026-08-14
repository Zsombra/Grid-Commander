# Tasks

## 1. Route conformance — fourteen actions move

- [x] 1.1 `app/(app)/agents/[id]/archive`: extract `performArchive` to
      `actions.ts` (`'use server'` top, imports carried), page imports
      `./actions.js`
- [x] 1.2 Same for `agents/[id]/deploy` (`performDeploy`)
- [x] 1.3 Same for `agents/[id]/edit` (`applyEdit`)
- [x] 1.4 Same for `agents/[id]/reactivate` (`reactivate`)
- [x] 1.5 Same for `agents/[id]/rebind` (`performRebind`)
- [x] 1.6 Same for `agents/[id]/undeploy/[coin]` (`performUndeploy`)
- [x] 1.7 Same for `agents/new` (`create`)
- [x] 1.8 Same for `recorder/trim` (`performTrim`)
- [x] 1.9 Same for `strategies/[id]/archive` (`archiveStrategy`)
- [x] 1.10 Same for `strategies/[id]/conditions/save` (`saveConditions`)
- [x] 1.11 Same for `strategies/[id]/edit` (`apply`)
- [x] 1.12 Same for `strategies/[id]/fork` (`forkStrategy`)
- [x] 1.13 Same for `strategies/[id]/restore` (`restoreStrategy`)
- [x] 1.14 Same for `strategies/[id]/rules/[signalId]` (`performRetune`)
- [x] 1.15 `agents/new/page.tsx`: drop the `= {}` parameter default so the
      props type stops widening to `| undefined` (PageProps scenario)

## 2. The gate

- [x] 2.1 `tsconfig.json`: `exclude` stops swallowing `.next/types`
      (drop `.next`; fall back to narrow enumeration only if 2.2 shows sweep)
- [x] 2.2 After a real `npm run build` into `.next`, confirm via
      `tsc --listFiles` (or `--explainFiles`) that the only `.next` files in
      the program are under `.next/types`
- [x] 2.3 Confirm `next build` no longer rewrites `tsconfig.json` (or that
      what it writes back is what we committed) — the item records the
      rewrite as the trap for any exclude-based fix
- [x] 2.4 Prove the gate: re-add one forbidden export temporarily, watch
      `npm run build` fail naming the route, revert (contract-violation
      scenario)
- [x] 2.5 Revert the investigation artifacts: `next.config.ts` distDir
      wiring out, `.next-gate/` deleted, Next's `.next-gate` include entry
      out of `tsconfig.json`

## 3. Test ecosystem follows the move

- [x] 3.1 Re-point named-action imports:
      `tests/rendering/lifecycle-actions.test.ts` (3),
      `tests/rendering/fork-preflight.test.ts` (1),
      `tests/rendering/new-agent.test.ts` (2 × `create`)
- [x] 3.2 `tests/rendering/new-agent.test.ts`: three bare `Page()` calls
      become `Page({})`
- [x] 3.3 `a-form-sends-what-its-action-reads.test.ts`: resolve the form for
      an action declared in `actions.ts` through the page that imports it;
      floors (`pairs.length >= 8`, no-form-resolved empty) unchanged and
      passing non-vacuously — assert the pair count did not drop below the
      pre-move count of 14
- [x] 3.4 Re-point source-slicing tests the move breaks:
      `tests/agent/rename.test.ts` (`applyEdit` slice),
      `tests/architecture/a-create-carries-a-dedupe-key.test.ts` (`create`
      slice), then run the full suite and re-point every further failure the
      same way
- [x] 3.5 Vacuity sweep of the re-points: for each test re-pointed in 3.4,
      break the moved code once (mutate the asserted text in `actions.ts`)
      and confirm the test fails before restoring — a slice that greps a
      file its subject left passes by finding nothing

## 4. The coherence guard

- [x] 4.1 New `tests/architecture/tsconfig-coherence.test.ts`: parse
      `tsconfig.json` (strip comments first — it is JSONC), fail when any
      `include` entry's path falls under any `exclude` entry, and assert
      `.next/types/**/*.ts` is present in `include`
- [x] 4.2 Prove it per the guard-proof requirement: the proof drives the
      same matcher the live scan uses; blind-both-ways (match-nothing and
      match-everything mutations fail); clean pass includes an input the
      matcher must not report (e.g. `exclude: ["node_modules"]` against
      `include: ["**/*.ts"]`); run
      `node tools/mutate-guard.mjs` against it to confirm

## 5. Design layer bookkeeping

- [x] 5.1 Re-pin every surface manifest staled by the page edits, adding the
      route's `actions.ts` to `source_files` while re-reading the prose
      (re-survey means reading, not digest refresh)
- [x] 5.2 File the backlog item for the scanner-invisible unexported actions
      (`pending/[id]` `agree`/`decline`, `connect`'s action) with a GitHub
      mirror, per the proposal's Out of Scope — filed at propose time:
      `three-actions-live-outside-the-form-field-cross-check` (#263)

## 6. Verification

- [x] 6.1 Quality gates green in sequence: `npm run typecheck`,
      `npm run lint`, `npm test`, `npm run build`,
      `npm run db:generate && git diff --quiet drizzle/`; `npm run test:db`
      skipped if no `DATABASE_URL` (state so)
- [x] 6.2 Clean-tree scenario: `npm run build` passes with the exclusion
      fixed and all fourteen routes conforming
- [x] 6.3 Update backlog item
      `the-build-never-checks-nexts-generated-route-types` → `in-progress`,
      `change:` linked (done at propose time; flip to `done` at archive)
- [x] 6.4 `python3 .claude/tools/openspec.py validate
      the-build-checks-what-next-generates` and `validate --all` clean of
      new errors
