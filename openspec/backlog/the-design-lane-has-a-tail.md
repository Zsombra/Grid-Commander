---
id: the-design-lane-has-a-tail
title: Eleven ceremony manifests and first tickets for the three early list surfaces
type: debt
status: done
priority: p3
created: 2026-08-12
updated: 2026-08-12
change: ""
capability: app-access
github: "157"
blocked_by: []
tags: [ui, design, coverage]
---

# The design lane has a tail

## What

Split out of `the-button-primitive-has-no-tokens` (#108) at its close — the
button primitive is tokenized, every treatment is decided and applied, and
what remains is record-keeping:

1. **Eleven small ceremony pages have no surface manifest** — agent
   edit/deploy/rebind/reactivate/undeploy, strategy
   archive/restore/fork/conditions-save/rules, recorder trim. Their
   treatments all arrived decided (DT-0004's roles via
   `the-refusals-dress-alike`, the border sweeps, the shared button
   constants); the surveys would write down what exists, not decide
   anything. Until they exist, `design_surface_stale` cannot guard those
   pages.
2. **`agent-roster`, `audit-log`, `strategy-catalog` are still
   `functional` with no ticket** — the only surfaces never given a design
   decision of their own; they show as orphan INFOs in `validate --all`.

## Why it matters

p3: nothing renders wrong. The cost is coverage, not correctness.

## First step

A fresh session running the now-routine loop: `/surface` per ceremony page,
then `/design` for the three list surfaces — their first real decisions,
probably small (empty/unreadable role hierarchy; card treatments are
already inherited).

## Closed 2026-08-12

Both halves done in one session: all eleven ceremony manifests written (plus
`recorder-trim` and a `strategy-editor` refresh that honestly went
`needs-redesign`), and the three list surfaces got their first tickets —
DT-0011 (agent-roster), DT-0012 (audit-log), DT-0013 (strategy-catalog) —
plus DT-0014/DT-0015 for the drift the surveys uncovered. All five
implemented, gates green, surfaces `designed`. The ceremony pages' own
pre-sweep drift was split out as `the-ceremony-surfaces-missed-the-role-sweep`
(#166); the surveys' behavior findings were filed as #162–#165 and #167–#171.

