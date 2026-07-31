# Tasks

## 1. Routing

- [x] 1.1 Replace all four `runs-on: ubuntu-latest` lines in
      `.github/workflows/validate.yml` with
      `runs-on: ${{ vars.CI_RUNNER || 'ubuntu-latest' }}`, with a comment
      explaining the variable and the fallback.
- [x] 1.2 Confirm the workflow file still parses as valid YAML.

## 2. The handout page

- [x] 2.1 `docs/SELF_HOSTED_RUNNER.md`: why this exists (account-level
      execution block), registration steps, the `CI_RUNNER` variable flip,
      machine requirements (Linux x64, Docker for the `app` job's postgres
      service, disk for node/python toolchains), the public-repo security
      warning with GitHub's fork-approval controls, verification via
      `workflow_dispatch`, revert path (unset the variable).

## 3. Tracking

- [x] 3.1 Note in `openspec/backlog/ci-creates-no-runs.md` that the repo side
      is done and what remains is operator-only (register runner, set
      `CI_RUNNER=self-hosted`).
- [x] 3.2 `python3 .claude/tools/openspec.py validate --all` — zero errors;
      spec-layer gates still green locally.
