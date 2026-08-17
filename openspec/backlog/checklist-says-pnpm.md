---
id: checklist-says-pnpm
title: The architecture checklist's quality gate names a package manager this project does not use
type: debt
status: done
priority: p3
created: 2026-07-28
updated: 2026-07-31
change: quality-gates-are-real
capability: ""
blocked_by: []
tags: [checklists, tooling]
---

# The architecture checklist's quality gate names a package manager this project does not use

## What

`docs/checklists/ARCHITECTURE_REVIEW_CHECKLIST.md`, Quick Reference Card:

> **Quality Gate** — `pnpm typecheck` and `pnpm lint` pass before every commit

The repository has `package-lock.json` and no `pnpm-lock.yaml`, and CI runs
`npm ci`. The commands as written do not run.

Recorded as DL-006 in `prove-it-runs`, where the planner is required to extract
quality-gate commands from this checklist rather than hardcode them.

## Why it matters

Mildly, and in a specific way. Every skill in the pipeline is instructed to read
its gate commands from this checklist instead of inventing them — which is the
right rule, and it means a wrong command here propagates into every plan, every
review, and every audit rather than being caught once.

It has not caused a failure because each agent silently corrected it. Silent
correction is the problem: the next one may correct it differently.

## Fix

Two lines in the Quick Reference Card, plus the same substitution anywhere else
in `docs/checklists/` that names `pnpm`. Run the checklist-generator in UPDATE mode
rather than hand-editing, so the version header moves with the change.

While there: the gate as stated covers typecheck and lint only. `prove-it-runs`
adds `npm run build` and `npm run test:db`, and neither will appear in a future
plan unless this card names them.
