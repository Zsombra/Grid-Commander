---
id: skill-context-probes-read-a-stale-worktree
title: Pipeline skills report state from whichever checkout they are invoked in, so a worktree session plans against a stale board
type: risk
status: open
priority: p2
created: 2026-08-16
updated: 2026-08-16
change: ""
capability: harness-integrity
github: "335"
blocked_by: []
tags: [harness, worktree, pipeline, tracking, stale-state]
---

# The skills report state from the wrong checkout, and the wrong state looks exactly like the right one

## What

Every pipeline skill prepends a **Context** block — the board, active changes,
task counts, current branch, uncommitted files. That block is produced by
commands run in **whatever checkout the session was launched in**. When that is
a stale worktree, every figure in it is the state of that worktree's pinned
commit, not of `main`.

Nothing marks it as stale. It reads exactly like a current board.

## Why it matters

**A skill's Context block is what the skill plans against.** `/propose` picks a
track from it, `/verify` decides what to check, `/handoff` writes the session
entry from it — and the handoff skill's own instructions say *"write from the
board and the diff, not from memory,"* which is precisely the instruction that
sends you to the stale numbers.

The failure is silent and in the reassuring direction: the numbers are
plausible, internally consistent, and wrong.

## Evidence — four instances in one session, 2026-08-16

The session ran from `.claude/worktrees/approval-answer-write-path-9c1243`,
pinned at `339a087`, while all work happened in the main checkout.

| Skill | Context block said | Actually |
|---|---|---|
| `/propose` | `19/40`, branch `claude/approval-answer-write-path-9c1243` | `33/40`, branch `main` |
| `/verify` | `19/40 in-progress` | `21/21`, ready to archive |
| `verifier` | same | same |
| `/handoff` | **28** open items, `19/40`, P2 `a-pruned-worktree-is-an-ignored-directory` **open** | **30** open, `33/40`, that item **`done`** |

The last row is the sharpest: **the close-out skill reported an item as open
that had been closed by work already merged to `main`** — and offered it as
outstanding P2 work for the next session.

## Why #325 does not cover this

[[a-pruned-worktree-is-an-ignored-directory]] (#325, `done`) is about a worktree
that has lost its `.git` and become an ignored directory answering for `main`.
Its fix — `tools/assert_checkout.py` plus a test — lets a *session* assert which
checkout it is standing in.

That is a different failure. Here the worktree is intact and correctly reports
*itself*; the problem is that the skill's context is gathered there while the
work happens elsewhere, and the two are never reconciled. `assert_checkout.py`
would pass in this session and the Context block would still be wrong.

## Notes

- **The operator-side mitigation already works and cost nothing**: this session
  ignored every Context block and re-read the board from the main checkout
  before acting. That is why nothing was built on the stale numbers. It relies
  entirely on somebody noticing, four times.
- Candidate fixes, cheapest first: have the context commands resolve the
  repository root the way `assert_checkout.py` does and report which checkout
  they read; or have them refuse to emit a board at all when the invoking
  checkout is not the one holding the work; or stamp the block with the commit
  it describes, so a stale one is visibly stale rather than merely wrong.
- **Do not fix this by deleting worktrees.** A failed `git worktree remove` on
  Windows is a locked handle, and chasing it with `rm -rf` follows the shared
  junctions — see [[worktree-removal-must-not-be-chased-with-rm-rf]] and #324's
  own warning.
- Found while closing out the session that merged #329, #332 and #333; the
  handoff skill surfaced it by reporting a P2 that this session had watched
  close.

## 2026-08-16, next session — ran in a worktree, and the mitigation is two commands

This session ran entirely in `.claude/worktrees/github-issues-backlog-1ccb4b`,
which is exactly the condition this item describes, and **its figures were
sound** — the board's counts tracked reality through nine issue state changes.

Not by luck, and not by "ignoring every Context block" four times. By two
commands, run before anything else:

```bash
git fetch origin
git rev-list --count HEAD..origin/main   # 0 — the worktree is not behind
git rev-list --count origin/main..HEAD   # 0 — and carries nothing unpushed
```

Both zero means the worktree *is* `main`, so every Context figure gathered in it
is a figure about `main`. **That is the whole check**, it is two lines, and it
converts the item's operator-side mitigation from "notice, four times" into
"assert, once."

### What that does to the candidate fixes

It argues for the **third** one — *"stamp the block with the commit it
describes"* — and against the other two:

- Resolving the repository root does not help: `assert_checkout.py` already
  passes here, as the item says. The worktree is intact and honest about itself.
- Refusing to emit a board outside the main checkout would refuse this session,
  which produced correct figures throughout.
- **Stamping is the only one that distinguishes the two cases**, because the
  distinguishing fact is not *where* the block was gathered but *whether that
  checkout is level with `main`* — which is exactly what a commit stamp beside
  `origin/main`'s makes visible.

Cheaper still, and available today with no tooling change: **the two commands
above belong in the skills' Context preamble**, so the block carries `behind 0 /
ahead 0` beside its counts. A block that says `behind 12` is visibly stale
rather than merely wrong, which is the property the item asks for.

Still p2 and still open — nothing was built.
