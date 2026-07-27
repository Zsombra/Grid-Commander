# Proposal: Run spec-layer validation in CI

## Why

`openspec.py validate` is the mechanism that keeps the spec, tracking, and
design layers honest. Nothing runs it automatically, so a broken delta spec, a
dangling backlog link, or an invalid design ticket only surfaces when someone
happens to think of it. A validator nobody runs is documentation, and drift is
discovered at archive time — the most expensive moment, because that is when
bad deltas get merged into the source of truth.

## What Changes

- Add a GitHub Actions workflow running `openspec.py validate --all` on every
  pull request and every push to the default branch.
- Errors fail the check; warnings are reported but do not fail.
- Diagnostics are surfaced in the job summary, not buried in the log.
- No dependency installation — the tool is zero-dependency by design and CI
  should prove that stays true.

## Capabilities

**New**: `spec-validation` — how the project enforces spec-layer integrity.

**Modified**: none.

## Out of Scope

- Auto-fixing anything. CI reports; humans and agents fix.
- Failing on warnings. The drift warnings are advisory by design; promoting
  them to errors would make `skip_specs` and placeholder tokens unusable.
- Posting diagnostics as PR comments. Job summary first; add comments only if
  the summary proves too easy to miss.
- Running the checklist or design-token linters that do not exist yet.

## Impact

New file `.github/workflows/validate.yml`. No production code, no changes to
the tool. First CI in the repository, so this also establishes where workflows
live.
