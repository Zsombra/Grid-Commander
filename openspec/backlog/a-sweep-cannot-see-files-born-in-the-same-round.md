---
id: a-sweep-cannot-see-files-born-in-the-same-round
title: A cross-cutting sweep silently misses files created in the same merge round
type: debt
status: done
priority: p3
created: 2026-08-06
updated: 2026-08-06
change: a-unification-ships-its-guard
capability: harness-integrity
blocked_by: []
tags: [process, multi-agent, sweep, guard]
---

# A file born in the same round escapes that round's sweep

`buttons-and-labels-from-one-source` moved every button and field label in the
product onto the shared treatments. It landed in the round-three squashed merge
`95bb95a`. So did `condition-composer.tsx` — a **new** file, written by a
parallel agent, carrying eighteen labels spelled `block text-sm` and a stock
`rounded border px-4 py-2 text-sm` submit.

The sweep could not have seen it. It did not exist when the sweep was written,
and it existed by the time the sweep was merged. The file drifted for **zero
days** and nobody could have caught it by looking.

Found by `the-last-stock-buttons-and-the-guard` (round four), which swept it
rather than shipping the guard with an allowlist — an allowlist being the exact
thing that item existed to prevent.

## Why it recurs

It is structural, not a lapse. A parallel round is: N agents branch from the
same commit, each cannot see the others' files, and one of them is a sweep over
"every file that exists". The sweep's premise is invalidated by its own siblings
before it merges.

Three of the four rounds run so far included at least one cross-cutting sweep,
so this is the normal case rather than a freak.

## Why it is p3

This instance is closed and closed properly: the guard that now ships with the
sweep scans the tree and has no allowlist, so the *next* file with a stock
button fails the suite whenever it lands. That is the durable fix for buttons
and labels specifically.

It stays open because the shape generalises and the fix does not. The next
extraction — a shared date formatter, a shared money renderer, a shared error
component — will have the same hole, and will only be safe if it lands its
guard in the same change.

## What would actually help

The mitigation is already known and was applied by hand twice:

> **Land the scan in the same change, not after.** A guard written once the
> tree is clean is one line, and a guard deferred is the one that never
> arrives.

Worth making it a rule rather than a habit — one line in the executor's
checklist and in `docs/checklists/UI_COMPONENT_REVIEW_CHECKLIST.md`: *a change
that unifies N spellings into one must ship the check that the spelling cannot
recur, in the same diff.*

A weaker, cheaper alternative for the integrator: after merging a parallel
round, re-run any guard the round introduced against the merged tree rather
than against the branch that wrote it. That catches this class at integration
without asking anything of the agents.

## Evidence

- `95bb95a` — the round-three squash containing both the sweep and the file
  that escaped it
- `openspec/backlog/agent-edit-still-stock.md` — the sibling instance, which
  was known and filed rather than missed
- `tests/architecture/controls.test.ts` — the guard that now closes the
  buttons/labels case, with no allowlist

---

# Done 2026-08-07 — the habit is a rule, in three places

Change `a-unification-ships-its-guard` (lite). Where the rule now lives:

- **`.claude/skills/executor/SKILL.md`, Step 5** — *a change that unifies N
  spellings into one ships, in the same diff, the check that the spelling
  cannot recur*, with the round-three incident as the reason.
- **`docs/checklists/UI_COMPONENT_REVIEW_CHECKLIST.md`**, Tailwind row 6 —
  the same rule as a checklist entry; version 1.0.0 → 1.1.0, review-output
  count follows (X/5 → X/6).
- **`.claude/references/change-lifecycle.md`, end of §5** — the integrator
  half: after merging a parallel round, re-run any guard the round introduced
  against the **merged** tree, not only against the branch that wrote it.

Built by the integrator from the round-five agent's completed proposal — the
agent stalled after writing it, and the diff is three standing-text edits, so
re-spawning would have cost more than finishing.
