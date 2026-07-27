# Proposal: Move CI off the deprecated Node 20 runtime

## Why

`actions/checkout@v4` and `actions/setup-python@v5` declare the Node 20
runtime, which GitHub has deprecated. Every run succeeds and every run emits
the same warning, because the runner forces them onto Node 24.

It works today and will stop working eventually. The nearer cost is that it is
the only warning in an otherwise clean log, and a log with one permanent
warning is a log people learn to skim.

## What Changes

- `actions/checkout@v4` → `@v5`
- `actions/setup-python@v5` → `@v6`

Both jobs in `.github/workflows/validate.yml`.

## Capabilities

None. `skip_specs: true` — no observable behavior changes. `spec-validation`
still promises that validation runs on every pull request and installs nothing;
this changes which runtime executes the steps that do it.

## Out of Scope

- Pinning actions to commit SHAs. Defensible for supply-chain reasons, a
  different decision from this one, and it would make future bumps invisible in
  the diff.
- Adding a dependency install step. The absence of one is deliberate and load-
  bearing — the suite asserts the tool imports only the standard library.

## Impact

`.github/workflows/validate.yml` only. Verified by the workflow's own run: an
action version that does not resolve fails the job immediately, so a green run
is the check.
