---
id: the-session-start-view-cannot-see-an-unmerged-session
title: Every session-start surface describes one checkout, so finished work in an open PR reads as work still to do
type: risk
status: done
priority: p2
created: 2026-08-17
updated: 2026-08-17
change: ""
capability: harness-integrity
github: "342"
blocked_by: []
tags: [harness, tracking, worktree, session-start, stale-state, board]
---

# The board is honest about `main`, and `main` is behind

## What

A session starts at `/board`. Its whole Context block was one command,
`openspec.py board`, which reads the local `openspec/` directory. The tracker
skill's Mode A said the same. Grepping the entire session-start path —
`.claude/commands/board.md`, `.claude/commands/handoff.md`,
`.claude/skills/tracker/SKILL.md`, `CLAUDE.md` — for `git log`, `--all`,
`gh pr`, `unmerged` or `branch` returned **one** hit:

```
.claude/commands/handoff.md:11   git log --oneline origin/main..HEAD
```

That shows the current session's own commits. **Nothing anywhere in the flow
shows another session's work.**

Sessions here run in parallel worktrees, each lands as a PR, and each closes its
issues the moment they are settled. So between close-out and merge, every figure
a new session reads — item counts, `NEXT:`, task progress, the journal's `Next`
— is a true statement about `main` and a false one about reality.

## Why it matters

**It cost a session, and the failure is in the reassuring direction.** On
2026-08-17 a triage pass read `main`, found seven items open against closed
issues and two open issues with no item, diagnosed accumulated rot, and began
building a two-way mirror check. All nine rows were **PR #339 sitting
unmerged**, which had already shipped that exact tool. Roughly 80% of it was
rebuilt before the duplication was caught.

Nothing it read was wrong. The board was accurate, `validate` was clean, the
journal was current, and every one of them was describing a `main` that was
missing an entire PR's worth of finished work.

## Why the existing guards do not catch it

| guard | detects | fired? |
|---|---|---|
| `assert_checkout.py` (#325) | the worktree lost its `.git` | no — worktree intact |
| `behind N / ahead N` stamp (#335's proposed fix) | invoking checkout is behind `main` | **no — both counts were 0** |
| `mirror` direction A | item open, issue closed | **yes, 7 rows** |
| `mirror` direction C | issue open, no item | **yes, 2 rows** |
| anything saying what those rows meant | — | **no** |

**#335 is the nearest neighbour and it is a different failure.** It is about the
checkout you are standing in being behind `main`; its prescribed fix stamps the
context block with `behind N / ahead N`. Measured against this session's start
commit (`3259b51`, identical to `origin/main` at the time), that stamp reads
`0 / 0` and passes cleanly. The checkout *was* `main`. `main` was the thing that
was behind.

## The evidence was produced and misread

This is the part worth keeping. `mirror` did not fail — it printed nine rows
that were an exact fingerprint of an unmerged session: seven items open against
issues **all closed within four hours of one day**, plus two orphan issues. That
same-day clustering is diagnostic; genuine rot accumulates on scattered dates.

The rows were read as rot and the opposite action followed. `tracking.md` came
close, calling direction C *"usually in-flight"* — but that is said about the
quiet direction, and nothing was said about direction A, which is the loud one
that actually fires.

**So the gap was interpretation, not detection**, and the fix belongs where the
evidence appears rather than only in prose.

## What was done

1. **`mirror` now says what drift probably means.** It fetches `closedAt`,
   reports a same-day cluster when it finds one, lists open PRs that could be
   carrying the missing writes, and names the two-command check. It reports and
   does not conclude, because neither signal is proof.
2. **`/board` and tracker Mode A run `mirror` and `gh pr list`.** These are the
   only two commands in this repository that can see past the local checkout,
   and neither was in the session-start path. Both commands now also state that
   the board describes one checkout.
3. **`tracking.md` §7 carries the interpretation rule** — drift is not the same
   as rot, the two want opposite responses, and guessing wrong is expensive in
   only one direction.

## The detection signal, which generalises

What finally caught it: **a closing comment naming an archived change that was
not in the archive** (`one-focus-ring`). Closing comments only name changes that
were archived, so the absence is a strict contradiction rather than a maybe —
and `git log --all` found it in a minute where plain `git log` could not see it
at all, because the branch was checked out in another worktree.

Cheap, and worth reaching for whenever a record refers to an artifact by id.

## Notes

- **`--all` is the load-bearing flag.** Plain `git log` cannot see a branch
  checked out in another worktree, which is this repository's default layout.
- Every offline surface here — `board`, `backlog list`, `validate`,
  `JOURNAL.md`, `HANDOFF.md` — is blind to this by construction and none of them
  said so. That is now stated in the two places a session actually reads.
- `HANDOFF.md` is the fourth surface and the worst of them, being hand-edited
  with no producer. Already filed and already demoted to a pointer (#322); not
  re-litigated here.
- A regression was introduced and caught while implementing this: the new helper
  was inserted at column 0 *inside* `main()`, which `ast.parse` accepted as
  valid syntax while silently truncating the function — `validate`, `board` and
  `archive` became dead code and `validate --all` printed nothing at exit 0.
  Caught by running the command and noticing empty output where three lines
  belonged. **A syntax check is not a test**, and empty output is the failure
  mode that looks like success.
- Related: [[skill-context-probes-read-a-stale-worktree]] (#335, the adjacent
  and still-open failure), [[the-mirror-is-checked-one-way]] (#309, the tool
  this builds on), [[the-handoff-start-here-points-at-closed-work]] (#322).
