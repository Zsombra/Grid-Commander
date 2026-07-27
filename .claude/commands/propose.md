---
description: Create a change — proposal, delta specs, and tasks — right-sized to the stakes
argument-hint: <change-name-or-description>
---

## Context

Current branch: !`git branch --show-current`
Active changes: !`python3 .claude/tools/openspec.py list 2>/dev/null || echo "(no openspec/ yet)"`
Known capabilities: !`ls openspec/specs 2>/dev/null | grep -v README || echo "(none yet)"`

## Task

Propose a change for: **$ARGUMENTS**

Invoke the **proposer** skill and follow it. It owns this workflow.

Before you start, read:
- `.claude/references/change-lifecycle.md` — folder layout, tracks, artifact graph
- `.claude/references/spec-format.md` — the requirement/scenario/delta format
- `openspec/config.yaml` — project context and rules

If `openspec/` does not exist yet, bootstrap it first (change-lifecycle.md §7).

## Reminders

- Derive a kebab-case change ID from the description if one was not given.
- Pick the track deliberately and say why. Most changes are `standard`.
- Read the current main spec of every capability you touch **before** writing a
  MODIFIED or REMOVED delta.
- Validate before handing off: `python3 .claude/tools/openspec.py validate <change-id>`
- Then stop and ask the user to review. That review is the cheapest quality
  step in the whole pipeline.
