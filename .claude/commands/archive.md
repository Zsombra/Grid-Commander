---
description: Land a completed change — merge its deltas into the source of truth and archive it
argument-hint: [change-id]
---

## Context

Active changes: !`python3 .claude/tools/openspec.py list 2>/dev/null || echo "(no openspec/ yet)"`
Capabilities: !`ls openspec/specs 2>/dev/null | grep -v README || echo "(none yet)"`

## Task

Archive: **$ARGUMENTS** (if empty, list the active changes and ask which one).

Invoke the **archiver** skill and follow it.

## Reminders

- Validate first. Archiving a change that fails validation corrupts the source
  of truth — that is the one thing this pipeline cannot recover from cheaply.
- Always show the dry run (`archive <id>` with no `--apply`) and confirm before
  applying, especially when it includes removals or renames.
- Ordering is fixed: **validate → write specs → move the folder.** Never move
  the change folder first.
- After applying, re-read every updated main spec and confirm the merge
  actually landed. Writing is not landing.
- Never hand-edit a main spec to make a merge succeed — fix the delta.
- A `full`-track change with a `BLOCKED` production gate does not archive.
