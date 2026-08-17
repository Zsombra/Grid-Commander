# Proposal: Route CI To A Self-Hosted Runner Behind A Repository Variable

## Why

GitHub Actions has executed nothing for this account since 2026-07-28
(`ci-creates-no-runs`, P1: jobs are created, no runner is ever assigned,
`runner_id: 0`). The operator wants the self-hosted route. Even if a runner
were registered today, every job in `validate.yml` pins
`runs-on: ubuntu-latest`, so a self-hosted runner would never claim one — the
journal warned exactly this on 2026-07-31. Searched the repo and the
operator's mail for evidence of an already-registered runner: none found; the
"self-hosted checker a previous agent built" is `scripts/check.sh` (local
gates), which cannot green the board.

## What Changes

- Every `runs-on: ubuntu-latest` in `.github/workflows/validate.yml` becomes
  `runs-on: ${{ vars.CI_RUNNER || 'ubuntu-latest' }}`. With the repository
  variable unset, behavior is byte-identical to today; setting
  `CI_RUNNER=self-hosted` routes all jobs to the operator's runner with no
  further commit.
- `docs/SELF_HOSTED_RUNNER.md` — the handout page: registration steps, the
  variable flip, what the runner machine needs (Docker for the `app` job's
  postgres service), the public-repository security warning, verification via
  `workflow_dispatch`, and how to revert.
- `ci-creates-no-runs` backlog item gains a note that the repo side is done
  and names what remains operator-only.

## Capabilities

**New**: none
**Modified**: none — CI tooling and documentation only; no observable product
behavior changes (`skip_specs: true`). The `harness-integrity` requirement
"The Test Suite Runs Automatically" is unaffected: the same workflow runs on
the same triggers; only which machine executes it becomes configurable.

## Out of Scope

- **Registering the runner.** Needs repo admin (a registration token from
  Settings → Actions → Runners) and a machine that stays up — operator-only,
  by GitHub's design. The handout page carries the exact steps.
- **Settling the account billing** — the other route, unchanged as an option.
- **Hardening CI for fork traffic beyond documentation.** The security
  section of the handout names the risk and GitHub's own controls; changing
  fork-PR approval policy is a settings decision, not a repo commit.

## Impact

- `.github/workflows/validate.yml` — 4 `runs-on` lines.
- `docs/SELF_HOSTED_RUNNER.md` — new.
- `openspec/backlog/ci-creates-no-runs.md` — status note.
- No product code, no dependencies, no data.
