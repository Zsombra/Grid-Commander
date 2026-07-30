---
id: ci-startup-failure
title: Every workflow run since 7f1cb28 is a startup_failure, and the diff did not cause it
type: bug
status: done
priority: p1
created: 2026-07-28
updated: 2026-07-28
change: ""
capability: ""
blocked_by: []
tags: [ci, github-actions, blocked]
---

# Every workflow run since 7f1cb28 is a startup_failure

## What

From `7f1cb28` onward, every push produces **two** workflow runs that never
start, and the real workflow does not run at all.

```
ed17330  startup_failure   09:00   name:""  path: BuildFailed
ed17330  startup_failure   09:00   name:""  path: BuildFailed
76aed9b  startup_failure   08:44   name:""  path: BuildFailed
76aed9b  startup_failure   08:43   name:""  path: BuildFailed
7f1cb28  startup_failure   08:31   name:""  path: BuildFailed
7f1cb28  startup_failure   08:31   name:""  path: BuildFailed
4890081  success           07:54   name:"Spec Layer"      <- last real run
```

Each failing run has `name: ""`, `display_title: "(Unknown event)"`,
`event: pull_request`, and `path: BuildFailed`. `BuildFailed` is not a path in
this repository — it is what GitHub records when it cannot construct the run.

## Why the change did not cause it

- `git diff 4890081..HEAD -- .github/` is **empty**. The workflow is
  byte-identical to the last green run.
- It parses locally; jobs `tests`, `app`, `validate` all resolve.
- It is tracked at HEAD and is the only file under `.github/workflows/`.
- `7f1cb28`, the first failing commit, touched **only five markdown files**
  under `openspec/changes/close-the-reachability-gap/plan/`. Nothing there can
  affect a workflow.

## Why it matters

**Three commits have never been verified by CI**: the plan (`7f1cb28`), the five
routes and four form bindings (`76aed9b`), and the execution evidence
(`ed17330`).

All local gates are green — typecheck, lint, 394 tests, build, 51 database
tests, `openspec validate --all` — and the served probe returned 200 on all 16
routes. But a local green and a CI green are different claims, and this project
has spent a day learning what happens when one is read as the other. The
production gate for `close-the-reachability-gap` should not record CI as
passing, because it has not run.

## What was tried

`rerun_workflow_run` on run `30344722550` returns
`403 Resource not accessible by integration` — the session token cannot re-run
workflows.

Deliberately **not** tried: editing `.github/workflows/validate.yml` to force a
new run. The file is provably unchanged since the last green run, so any edit
would be a fabricated fix for a problem outside the diff, and it would land in
the history as though it were the cause.

## Refinement — 10:34 UTC

Filtering runs by `validate.yml` specifically changes the picture:

```
4890081  success  "Spec Layer"  07:54   <- most recent run of validate.yml
841218f  success  "Spec Layer"  06:53
837d9f4  success  "Spec Layer"  06:35
```

**`validate.yml` has not been triggered since `4890081`.** It is not failing —
it is not running. The `startup_failure` runs belong to a *different*
`workflow_id` (322017131) whose `path` is the literal string `BuildFailed`,
which is not a file in this repository.

So the earlier framing ("the workflow fails to start") was wrong in a way worth
correcting: the repository's own workflow is simply never invoked, and something
else is producing two dead runs per push. That points at the trigger or the
account, not at YAML — and rules out anything in the diff even more firmly than
the byte-identical check did.

Two API calls now return `403 Resource not accessible by integration`:
`POST .../runs/{id}/rerun` and `GET .../commits/{sha}/status`. `get_check_runs`
is permitted and returns zero. Whether the session token's permissions narrowed
around 08:31 is **not established** — `get_check_runs` still answering argues
against it — but it is the first thing to check, because if the token lost
visibility then "zero check runs" means "I cannot see them", not "they do not
exist". Those are different problems and only one of them is GitHub's.

## Fix

0. **Look at the Actions tab in the UI first.** That answers in one glance what
   this session could not: whether "Spec Layer" runs exist and are invisible to
   the token, or genuinely never started.
1. Re-run from the UI: <https://github.com/Zsombra/Grid-Commander/actions/runs/30344722550>,
   or push any commit to retrigger.
2. If it recurs, look outside the code. The transition is sharp — green at
   07:54, broken at 08:31, with only markdown in between — which points at an
   account or repository-level change around that time: Actions minutes, a
   permissions change, or a GitHub incident.
3. Once green, re-check that the `app` job's six steps still pass, particularly
   the new `reachability` guard on a clean checkout. It reads the filesystem, so
   a case-sensitivity or path difference on the runner is the one plausible
   CI-only failure in this change.
