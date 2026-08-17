---
description: Everything at a glance — start every session here
argument-hint: (none)
---

## Context

!`python3 .claude/tools/openspec.py board 2>/dev/null || echo "(no openspec/ yet — bootstrap it: see .claude/references/change-lifecycle.md §7)"`

!`python3 .claude/tools/openspec.py mirror 2>/dev/null || echo "(mirror unavailable — gh missing or unauthenticated)"`

Work in flight elsewhere:
!`gh pr list --state open --json number,title,headRefName --template '{{if .}}{{range .}}  #{{.number}}  {{.headRefName}}  {{.title}}{{"\n"}}{{end}}{{else}}  none open — nothing finished is waiting to merge{{"\n"}}{{end}}' 2>/dev/null || echo "  (gh unavailable — in-flight work NOT checked)"`
!`git log --all --oneline -8 2>/dev/null`

## Task

Orient the user. Invoke the **tracker** skill, Mode A.

Read the board above, then read the last 2–3 entries of `openspec/JOURNAL.md`
**in full** — the board shows only their summary lines, and the `Watch out`
field is usually the most valuable text in the repo.

**The board describes one checkout, and `main` is routinely behind finished
work.** Sessions run in parallel worktrees here; each lands as a PR and closes
its issues on the spot, so between close-out and merge every local figure is a
true statement about `main` and a false one about reality. Read the open-PR list
and `mirror` above before you believe the counts. If a PR is open, **say what it
covers before recommending anything**, and never open a change against work it
already contains.

Report:

1. **In flight** — active changes, how far along, what each needs next. Then
   **work in flight elsewhere**: every open PR, and what it claims to settle.
2. **Continuity** — what the last session said to do next, and whether that
   still holds. If the journal's `Next` disagrees with what the board computes,
   say so and explain which you trust; that gap is usually where something got
   dropped.
3. **Drift** — anything flagged: archived changes with open items, in-progress
   items with no change, validation errors, a p0 that has not moved. **Read
   `mirror`'s drift rows against the open-PR list before treating any of them as
   a record nobody updated** — a same-day cluster of closed issues is one
   session's close-out, and writing closures for it duplicates work and then
   conflicts with it.
4. **One recommended next action.** Not a menu.

Keep it short. This runs at the start of a session, when the user wants to know
where to point their attention — not to read a report.
