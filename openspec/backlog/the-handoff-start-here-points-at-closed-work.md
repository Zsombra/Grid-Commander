---
id: the-handoff-start-here-points-at-closed-work
title: HANDOFF.md's Start Here rots silently — it pointed the next session at eleven closed items
type: debt
status: open
priority: p3
created: 2026-08-16
updated: 2026-08-16
change: ""
capability: harness-integrity
github: "322"
blocked_by: []
tags: [tracking, handoff, staleness, validate]
---

# The one artifact with no producer and no check

## What

`CLAUDE.md` names `HANDOFF.md` as "the current state". In practice a session
starts at **§ Start Here — Where The Next Session Picks Up**. Audited
2026-08-16, that section was pinned to 2026-08-13 and pointed at work that no
longer exists:

| claim | reality on 2026-08-16 |
|---|---|
| twelve items named "the sharpest pick" | **eleven `done`**; one never existed under that id; only `approvals-have-no-write-side` survives |
| "Then: **#94** … and **#216**" | both **closed** |
| "neither has a GitHub issue yet" | they are **#228** and **#229** |
| "All 161 changes are archived" | **202** |
| "The 25 open backlog items" | **24** |
| "`v15-trade-level-policy…` (the one P1)" | `done`; no p1 or p2 open for days |

Repaired in `the-record-says-what-was-actually-checked`: the section now leads
with the live thread, and everything older is fenced as a dated snapshot kept
for its reasoning rather than its direction. **The mechanism that let it rot is
untouched, which is what this item is for.**

## Why it matters

p3 — the journal is accurate and `/board` prints live counts, so a session that
runs `/board` first is never actually misled.

But this is the file the project's own configuration advertises as current
state, and it is the only artifact here with **no producer and no check**:

- `JOURNAL.md` has `/handoff` and is append-only — it cannot rot, a stale entry
  is simply an old entry.
- `backlog/*.md` have `validate`, and the GitHub mirror is enforced one way.
- `HANDOFF.md` is **narrative, cumulative and hand-edited**. Each session
  appends a header; nobody re-reads the body. The previous session repaired its
  Current State table — recording it as "four days stale" — and did not notice
  Start Here immediately below it.

The failure is expensive and specific: a session that trusts it opens a change
against closed work and only finds out after reading the code.

## What would settle it

A decision, not just an edit:

1. **Demote it** — make Start Here a pointer ("run `/board`, then read the top
   journal entry") and let the artifacts that have producers carry state.
   Cheapest, probably right.
2. **Give it a producer** — `/handoff` already rewrites the header; extend it to
   regenerate Start Here from the board plus the journal's `Next`.
3. **Give it a check** — `validate` warns when `HANDOFF.md` names a backlog id
   whose status is `done`, or a closed issue number.

Only (3) catches the general case, and it is testable: **the eleven items above
are a ready-made fixture.**

## Notes

Found while wrapping up the session that landed
`the-record-says-what-was-actually-checked`, when the operator asked for the
pipeline to be left in a state the next session could start from. The audit
*was* the check — every item id and issue number the section names, grepped
against `openspec/backlog/` and `gh issue view`.

Same family as [[the-mirror-is-checked-one-way]] and
[[a-restyle-acceptance-can-pin-content-and-rot]]: **records pinned to a moment,
with nothing to tell them the moment passed.**
