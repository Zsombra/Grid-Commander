---
id: the-ceremony-manifests-went-stale-the-day-they-were-written
title: Twelve surface manifests are stale — refresh them with the #166 design round
type: debt
status: open
priority: p3
created: 2026-08-12
updated: 2026-08-12
change: ""
capability: app-access
github: "173"
blocked_by: []
tags: [ui, design, coverage]
---

# The ceremony manifests went stale the day they were written

## What

The twelve manifests written for #157 are pinned to `cdecf31`, and two
changes landed on top of them the same day:

- `the-outcome-reaches-the-person` added `CarriedProblem` to every render
  branch of six ceremony pages (deploy, undeploy, rebind, strategy
  archive/restore/fork). Those manifests do not describe the component or
  the states it covers.
- DT-0015 added a `CHECKBOX` constant to
  `src/presentation/components/control.ts`, which is a listed source file on
  twelve manifests — so all twelve report `design_surface_stale` even where
  nothing they describe actually changed.

## Why it matters

p3, and mostly bookkeeping: `design_surface_stale` is a warning that exists
to stop a design agent aiming at fiction, and nobody is designing against
these right now. But it is 12 of the 19 warnings on the board, and a
warning class that is always noisy is one that stops being read — which is
how the real staleness gets missed later.

## Evidence

`python3 .claude/tools/openspec.py validate --all` after
`2026-08-12-the-outcome-reaches-the-person` archived: 12
`design_surface_stale` warnings. Six are substantive (the pages changed);
six are `control.ts` only (nothing the manifest describes moved).

## Notes

Do this **inside** the #166 round (`the-ceremony-surfaces-missed-the-role-sweep`)
rather than as its own pass — that round has to `/surface` these pages
anyway before it can write their tickets, and a re-survey now would be
thrown away by it. Deliberately not "fixed" by bumping
`generated_at_commit`: the check's whole value is that freshness is
measured, not asserted.
