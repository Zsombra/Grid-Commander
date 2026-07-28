---
id: bump-actions-node20
title: CI actions still target the deprecated Node 20 runtime
type: chore
status: done
priority: p3
created: 2026-07-27
updated: 2026-07-27
change: bump-actions-node20
capability: spec-validation
blocked_by: []
tags: [ci]
---

# CI actions still target the deprecated Node 20 runtime

## What

`actions/checkout@v4` and `actions/setup-python@v5` declare the Node 20 runtime,
which GitHub has deprecated. Runs currently succeed — the runner forces them
onto Node 24 and emits a warning.

## Why it matters

It works today and will stop working eventually. Low urgency, zero ambiguity
about the fix, and it is the only warning in an otherwise clean CI log — which
matters, because a log with one permanent warning trains people to skim it.

## Evidence

Actions run 30241139011:

```
Node.js 20 is deprecated. The following actions target Node.js 20 but are being
forced to run on Node.js 24: actions/checkout@v4, actions/setup-python@v5
```

## Notes

Bump both to their current major versions in
`.github/workflows/validate.yml`. Deliberately not done at the time: it would
have meant changing the very workflow whose first green run was proving the
`spec-validation` spec, and I could not verify the newer majors from here.

Pure presentation of the CI config — no spec change, `lite` track.

## Attempt and revert (2026-07-28)

Bumped all three jobs to `actions/checkout@v5` / `actions/setup-python@v6` and
**every job in the run failed within 2-9 seconds**, before any step produced a
log (run 30362637624, six of six). Reverted to `@v4` / `@v5`, the pins proven
green by run 30241139011.

Those `@v5` / `@v6` pins were copied from PR #3's `tests` job. That job had
never executed — it was added during the window when the repository created no
workflow runs at all — so it looked reviewed and merged-ready while being
entirely unverified. Propagating it, and then "closing" this item by moving the
one job that *did* work onto the same pins, turned a green `validate` job red.

**Whoever picks this up next: confirm the major version exists before pinning
it.** The deprecation this item is about is a warning, not a failure; the
working state is worth more than the clean log until the replacement is
verified against a real run.
