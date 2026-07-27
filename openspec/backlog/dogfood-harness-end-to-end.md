---
id: dogfood-harness-end-to-end
title: Run one real change through the full pipeline before trusting it
type: risk
status: open
priority: p1
created: 2026-07-27
updated: 2026-07-27
change: ""
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
