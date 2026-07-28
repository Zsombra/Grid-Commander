---
id: ci-creates-no-runs
title: GitHub Actions stopped creating workflow runs entirely on 2026-07-28
type: risk
status: open
priority: p1
created: 2026-07-28
updated: 2026-07-28
change: ""
capability: ""
blocked_by: []
tags: [ci, infrastructure]
---

# GitHub Actions stopped creating workflow runs entirely on 2026-07-28

## What

At `2026-07-28T07:54:54Z` the repository created its last workflow run. Every
push after that — on both open branches — produced **no run at all**. Not a
failing run, not a cancelled one: nothing is created, so there is nothing to
open and no log to read.

## This supersedes `ci-startup-failure`

That item (filed on `claude/work-review-next-steps-clb36a`) describes the
symptom as a `startup_failure` with `path: BuildFailed`, and everything
downstream — including several comments on PR #4 — repeated it. **It is not
what is happening**, and the distinction changes who can fix it:

| | `startup_failure` | what is actually happening |
|---|---|---|
| A run exists | yes, conclusion `startup_failure` | no run exists |
| Cause | workflow file GitHub cannot start | Actions not dispatching at all |
| Fixable by a commit | yes | no |

## Evidence

Queried 2026-07-28 against workflow `321156959` (`.github/workflows/validate.yml`):

- **37 runs total. Zero with conclusion `startup_failure`.** The 30 most recent
  are all `conclusion: success`.
- All 37 are `event: pull_request` on `claude/work-review-next-steps-clb36a`.
  None on `main` — consistent with `push` being scoped to `branches: [main]`
  and `main` not having moved.
- Newest run: `30340242741`, head `48900816`, created `2026-07-28T07:54:54Z`.
- **PR #3's head is now `52ea2b5` and has zero check runs.** It pushed after
  07:54 and got nothing, which is what makes this repo-wide rather than
  specific to one branch or PR.
- **PR #4 has zero check runs across four pushes** (`a1bba39`, `aa34bbb`,
  `9198cd7`, `1dbf70e`), the first ~3 hours after runs stopped.
- The workflow object reports `state: active`.
- `.github/workflows/validate.yml` parses as valid YAML on both branches and
  declares a `pull_request` trigger.

A workflow that is active, valid, and triggered on `pull_request`, in a
repository where pull requests are being pushed to, producing zero runs, is not
a repository-content problem.

## Why it matters

Everything on PR #4 — 58 tests across three files, and five defect fixes in
`.claude/tools/openspec.py`, two of which closed paths that wrote unauthored
content into `openspec/specs/` — has only ever been verified locally. The
`tests` job added in that PR has never executed. A green board currently means
"it passed on one machine".

This repository has already been bitten once by a gate that looked like
coverage and was not: `prove-it-runs` found that six changes had shipped
through green CI describing a product that could not start. A CI system that
creates no runs is the same shape of problem, one level further out.

## What to check

Not fixable from the repository. In order of likelihood:

1. **Settings → Billing → spending limit.** Exhausted Actions minutes stop run
   creation without disabling the workflow, which matches `state: active`
   alongside zero runs.
2. **Settings → Actions → General → Allow all actions.** If Actions was
   disabled for the repository, existing runs remain visible and new ones are
   never created.
3. Organization-level Actions policy, if the account is part of one.
4. `githubstatus.com`, to rule out an incident spanning the window.

`workflow_dispatch` was added to the workflow (`1dbf70e`) so a run can be
requested by hand once the above is resolved — with only event-driven triggers
there is no way to ask for one.

## Notes

The API token available to the session cannot dispatch a run
(`403 Resource not accessible by integration` on `POST .../dispatches`, i.e. no
`actions: write` scope) and cannot read repository settings or billing. That is
why this is a report rather than a fix.

## Workaround (2026-07-28)

The owner has no billing access, so restoring GitHub-hosted minutes is not
available. Three routes, in the order they are worth considering:

**1. `scripts/check.sh` — done, needs nobody's permission.** Every gate,
runnable anywhere: `./scripts/check.sh` for one interpreter,
`--matrix` for every `python3.x` on the machine. Verification no longer depends
on GitHub at all. CI's new `matrix` job calls the same script so it stays
exercised — a fallback nothing runs is not a fallback.

Demonstrated failing before being trusted: breaking `fenced_lines` produced
19 test failures and exit 1.

**2. Make the repository public.** Actions is free and unlimited for public
repositories, so this removes the billing dependency permanently rather than
working around it. It is a one-way door and an owner decision — the repository
carries BattleGrid MCP reconnaissance and product specs, though per PR #3 no
credential is in it.

**3. Register a self-hosted runner.** Minutes are only billed for
GitHub-hosted runners, so a self-hosted one is free on a private repository.
Needs repo admin (to mint a registration token) and a machine that stays up.
Better than option 2 if the repository must stay private.

## What this found on the way

The failure-injection pass turned up an untested guard. `parse_requirements`
falls back to computing `fenced_lines` itself when a caller omits `skip` —
added so no caller can go fence-blind by forgetting an argument. `SpecDoc._parse`
always passes it, so replacing the fallback with `set()` broke **no test**.
Now covered by
`test_parse_requirements_is_fence_aware_without_being_handed_a_skip_set`,
which was watched failing with the fallback disabled.

That is the third time on this branch that writing the guard was not the same
as knowing it worked.
