# Tasks

## 1. The diagnostic

- [x] 1.1 Add `design_surface_denies_client_js` (warning) to `openspec.py`'s
      design validation pass: for each surface manifest whose raw text matches
      `/no client js/i`, read the head of every `source_digest` file for a
      bare `'use client'` directive line; report claim + declaration, naming
      the manifest and the declaring file. A recorded source absent from the
      tree is skipped, never treated as declaring.
- [x] 1.2 Harness-suite fixtures for the new code: a lying manifest+source
      pair fires with warning severity; a truthful claiming pair is silent;
      the corrected wording ("the only client code is …") over a client
      source is silent; a claim whose recorded source is absent is silent for
      that file. (The fixture-coverage requirement fails the suite if 1.1
      lands without this.)
- [x] 1.3 Planted-defect proof against the real tree, before any correction:
      run `validate --all` with the diagnostic in place and observe it fire on
      exactly the fourteen measured manifests and none of the six truthful
      ones. Record the observed list in the decision trail (journal entry at
      handoff).

## 2. The corrections

- [x] 2.1 Correct every claim site in the fourteen manifests
      (agent-archive-confirm, agent-deploy-confirm, agent-edit,
      agent-reactivate-confirm, agent-rebind-confirm, agent-undeploy-confirm,
      connect, pending-proposal, recorder-trim, strategy-archive-confirm,
      strategy-conditions-save, strategy-fork-confirm,
      strategy-restore-confirm, strategy-rule-editor) — `constraints`,
      `notes`, `current_implementation`, and per-component descriptions —
      using agent-edit's constraints[] template: full navigation and no
      client state asserted, `PerformButton` named as the one exception, the
      design veto kept. No `source_digest`, digest value, or
      `generated_at_commit` changes.
- [x] 2.2 Re-run `validate --all`: the new diagnostic reports nothing; the
      warning count is back to the standing baseline (the known 14: the
      assistant-capability seven, agent-roster #237, DT-0003/0004/0014 six).

## 3. Verification

- [x] 3.1 `npm ci` (fresh worktree), then gates: `npm run typecheck`,
      `npm run lint`, `npm test` (vitest, 2419+/190 baseline), `npm run
      build`, `npm run db:generate && git diff --quiet drizzle/`. `test:db`
      deliberately skipped: `DATABASE_URL` now reaches sessions and the db
      suite's disposable-database guard must refuse the live record database
      — that refusal is correct.
- [x] 3.2 Run the harness tool's Python suite and confirm the new fixtures
      pass and no diagnostic code is uncovered.
- [x] 3.3 Close the loop on the source item: backlog
      `a-surface-forbids-client-js-while-rendering-it` → `done`, issue #243
      commented and closed, when this change archives.
