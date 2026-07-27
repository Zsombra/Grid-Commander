---
id: enforce-journal-entry
title: Nothing enforces that a session writes a journal entry
type: debt
status: open
priority: p2
created: 2026-07-27
updated: 2026-07-27
change: ""
capability: ""
blocked_by: []
tags: [harness, tracking]
---

# Nothing enforces that a session writes a journal entry

## What

`/handoff` and the tracker skill make the journal entry the default path, but
nothing verifies it happened. A session can change everything and leave no
record, and the tooling will not notice.

## Why it matters

The journal is the only continuity mechanism between sessions and agents. Every
other layer is mechanically checked; this one runs on discipline alone, and it
is the one that degrades first because skipping it is invisible in the moment.

## Evidence

`validate --all` has no journal check. `openspec.py journal` reads entries but
never complains about their absence.

## Notes

Cheapest useful version: a warning in `validate` when the newest journal entry
is older than the newest commit that touched `openspec/`. Mechanical, no hook
required, and it shows up in `board`.

Stronger version: a `pre-push` hook warning when the push touches `openspec/`
or `.claude/` without touching `JOURNAL.md`. Warn, never block — a hook that
blocks gets bypassed and then it protects nothing.
