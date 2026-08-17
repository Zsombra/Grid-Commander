# Proposal: CI Is Local, By Policy

## Why

The operator's decision (2026-08-01): the GitHub bill will not be paid and
the repository will not move — verification is local, as policy rather than
as a workaround that implies somebody will fix it
(`docs/CI_WITHOUT_BILLING.md`, option D, chosen).

Two loose ends make the current state dishonest: the full gate set is
scattered across several invocations (nothing runs "all of CI" in one
command), and `validate.yml` still fires on every push and PR — seven jobs
that die in ~2s on the blocked account, decorating every PR with seven red
crosses that mean nothing.

## What Changes (lite)

- `scripts/ci.sh` (new): the whole pipeline in one command, mirroring the
  workflow's seven jobs — python harness + spec validation (via check.sh),
  typecheck, lint, vitest, drizzle schema check, database suite (skipped
  loudly when no DATABASE_URL), build, and optionally the serving check.
  Exit non-zero on any failure; print a per-gate table.
- `validate.yml` triggers reduced to `workflow_dispatch` only: no automatic
  runs, no red noise, still one click away if the account is ever unblocked.
- `ci-creates-no-runs` closes as a decision (accepted local-only policy);
  `docs/CI_WITHOUT_BILLING.md` records option D as chosen.
