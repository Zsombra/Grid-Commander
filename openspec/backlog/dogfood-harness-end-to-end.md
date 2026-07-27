---
id: dogfood-harness-end-to-end
title: Run one real change through the full pipeline before trusting it
type: risk
status: done
priority: p1
created: 2026-07-27
updated: 2026-07-27
change: add-ci-validation
capability: ""
blocked_by: []
tags: [harness, validation]
---

# Run one real change through the full pipeline before trusting it

## What

v3.0 was built and its tooling tested mechanically, but **no change has ever
gone through proposer → executor → verifier → archiver end to end.** The skills
have never been executed, only written.

## Why it matters

Every friction point is still undiscovered: instructions that read well but do
not survive contact, handoffs that lose context, artifacts that are tedious
enough that an agent quietly skips them. Finding those on a small deliberate
change costs an hour. Finding them on the first real feature costs the feature.

## Evidence

`openspec/changes/archive/` is empty. `openspec/specs/` has no capabilities.

## Notes

Make the first change deliberately small and `standard` track. The point is to
exercise the loop, not to ship something. Watch for: does `/propose` produce
deltas worth reviewing, does the executor actually re-read them, does
`/archive` merge cleanly, does `/handoff` capture anything useful.

Escalate to a `full`-track change only after `standard` feels smooth — that
path also needs `docs/specs/` checklists, which do not exist yet.

## Outcome (2026-07-27)

Done on `standard` track via `add-ci-validation`: proposal → delta spec →
tasks → verify → archive, with the delta merged into
`openspec/specs/spec-validation/`. The loop works.

Two things the harness caught that would otherwise have been missed:
- `change_without_backlog_item` — the change was created without linking its
  backlog item. The tracking layer noticed; a human would not have.
- The archive dry run made the merge reviewable before it touched the source
  of truth, which is exactly the moment it matters.

One ordering lesson, now folded into practice: a **self-verifying** change
should let CI prove the spec before archiving it. Archiving first would have
merged "validation runs on every pull request" into the source of truth on the
strength of a local test alone.

**Residual: the `full` track is still unexercised** — planner, auditor, and the
production gate have never run, and remain blocked on `docs/specs/` checklists.
Re-open or file fresh when a change genuinely warrants `full`.
