---
id: write-probe-thinking-pagination-assertion-too-strict
title: the thinking-log probe demands more than one page and fails a healthy agent that has exactly one
type: bug
status: open
priority: p3
created: 2026-08-15
updated: 2026-08-15
change: ""
capability: platform-mapping
github: "293"
blocked_by: []
tags: [live-probe, test-robustness, pr-82-refile]
---

# A probe that needs the data to be big enough

Re-filed 2026-08-15 from draft PR #82's stranded backlog (issue #289,
original filed 2026-08-11 and fixed *on that branch only*). Of the three
probe repairs that branch carried, this is the only one whose defect still
exists on `main` — the other two assertions were removed when the probe
suite was rebuilt.

## What

`tests/live/write-probe.test.ts:575` asserts, on the agent thought/decision
log:

```
expect(log.total, 'the server reports more than one page holds').toBeGreaterThan(
```

Observed live 2026-08-11: it failed `expected 17 to be greater than 17` —
the agent had exactly 17 decisions and the server returned all 17 in one
page. The product read was correct; the assertion encodes a data
precondition (a second page exists) that a healthy agent need not satisfy.

## Why it matters

A live probe that fails a working platform gets ignored, and then it guards
nothing — the exact rationale of the branch's `the-probes-catch-up-to-v17`
change. This is the last survivor of that class on `main`.

## Evidence

- `tests/live/write-probe.test.ts:575` on `main` today, message string
  `'the server reports more than one page holds'`.
- The live failure: operator-approved write-probe run, 2026-08-11
  (recorded in the original item on tag
  `archive/claude/agent-creation-data-strategies-fw6av8`).

## What would settle it

Assert `log.total >= log.decisions.length` and that `decisions.length` is
bounded by the page size — or skip the multi-page check when `total` fits
one page. The property worth guarding is that the product never invents
decisions beyond what the server reports; it should not depend on the agent
having accumulated two pages of history. The probe is key-gated, so the fix
lands blind and is proven at the next keyed run.
