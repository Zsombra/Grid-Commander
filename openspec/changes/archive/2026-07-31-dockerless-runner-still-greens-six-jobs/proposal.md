# Proposal: A Docker-less Runner Still Greens Six Of Seven Jobs

## Why

The operator's runner machine will not have Docker. Only the `app` job needs
it (its `postgres:16` service container); the other six jobs are checkout +
Python. With a single `CI_RUNNER` variable routing all seven, a Docker-less
runner would fail `app` at container setup — one job's requirement dragging
down six that would pass.

## What Changes

- The `app` job routes through its own variable:
  `runs-on: ${{ vars.CI_APP_RUNNER || 'ubuntu-latest' }}`. The other six keep
  `CI_RUNNER`. With only `CI_RUNNER=self-hosted` set, six jobs run on the
  operator's machine and `app` stays on GitHub-hosted (red until the account
  is settled, exactly as today — no worse).
- `docs/SELF_HOSTED_RUNNER.md` documents the Docker-less path.

## Out of Scope

- Making `app` run without Docker (a host postgres instead of the service
  container) — `services:` cannot be conditionally omitted per-runner; a
  restructure for it is not worth it while a hosted fallback exists.

## Impact

`.github/workflows/validate.yml` (one line + comment), `docs/SELF_HOSTED_RUNNER.md`.
