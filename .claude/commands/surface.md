---
description: Survey a built UI into a surface manifest for the design agent
argument-hint: <surface-id-or-route>
---

## Context

Surfaces: !`python3 .claude/tools/openspec.py design surfaces 2>/dev/null || echo "(none yet)"`
HEAD: !`git rev-parse --short HEAD 2>/dev/null`
Recently changed UI files: !`git diff --name-only HEAD~5..HEAD 2>/dev/null | grep -Ei '\.(tsx|jsx|vue|svelte|css|scss|html)$' | head -15`

## Task

Survey: **$ARGUMENTS**

Invoke the **ui-surveyor** skill and follow it.

## Reminders

- **Read the code, not your memory of it.** This manifest is the entire world
  the design agent gets to design against.
- **Enumerate every state** — `loading`, `empty`, `error`, `disabled`,
  overflow, permission variants. A missed state produces a design that looks
  broken exactly when users notice.
- **Write the constraints.** They are your veto, declared before the design
  exists instead of discovered in review. "Keep it accessible" constrains
  nothing; "arrow keys move between cards" constrains something.
- **`source_files` must be complete** — it is what staleness detection runs
  against, and an incomplete list fails silently.
- Never describe a UI that does not exist yet. Build it plain, then survey it.
