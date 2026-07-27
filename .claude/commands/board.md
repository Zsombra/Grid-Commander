---
description: Everything at a glance — start every session here
argument-hint: (none)
---

## Context

!`python3 .claude/tools/openspec.py board 2>/dev/null || echo "(no openspec/ yet — bootstrap it: see .claude/references/change-lifecycle.md §7)"`

## Task

Orient the user. Invoke the **tracker** skill, Mode A.

Read the board above, then read the last 2–3 entries of `openspec/JOURNAL.md`
**in full** — the board shows only their summary lines, and the `Watch out`
field is usually the most valuable text in the repo.

Report:

1. **In flight** — active changes, how far along, what each needs next.
2. **Continuity** — what the last session said to do next, and whether that
   still holds. If the journal's `Next` disagrees with what the board computes,
   say so and explain which you trust; that gap is usually where something got
   dropped.
3. **Drift** — anything flagged: archived changes with open items, in-progress
   items with no change, validation errors, a p0 that has not moved.
4. **One recommended next action.** Not a menu.

Keep it short. This runs at the start of a session, when the user wants to know
where to point their attention — not to read a report.
