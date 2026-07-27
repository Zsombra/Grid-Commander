---
description: View, file, or triage backlog items — work that is not a change yet
argument-hint: [item description | triage | <item-id>]
---

## Context

!`python3 .claude/tools/openspec.py backlog list 2>/dev/null || echo "(no backlog yet)"`
Active changes: !`python3 .claude/tools/openspec.py list 2>/dev/null || echo "(none)"`

## Task

**$ARGUMENTS**

Invoke the **tracker** skill and pick the mode from what was asked:

| Input | Mode |
|---|---|
| Nothing | Show the open backlog above, grouped by priority, with a recommendation on what to pull next |
| A description of a bug, idea, or piece of debt | **Mode B** — file an item |
| `triage` | **Mode C** — walk every item and fix drift |
| An existing item ID | Show it, then ask what to change — or **Mode D** to promote it to a change |

## Reminders

- **Check for duplicates before filing.** Updating an existing item beats
  filing a near-twin.
- **Evidence is the field that matters** — `file:line`, an error string, a
  reproduction. It is what saves the next person the rediscovery.
- **Priority is earned by consequence.** If nothing breaks when this is never
  done, it is p3.
- A backlog item never restates a change's tasks. Link and stop.
- Set `updated` on anything you touch, then `validate --all`.
