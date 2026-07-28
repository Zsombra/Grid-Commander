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
