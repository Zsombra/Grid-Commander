---
id: a-pruned-worktree-is-an-ignored-directory
title: A worktree that loses its .git becomes an ignored directory, and git commands inside it silently answer for main
type: risk
status: open
priority: p2
created: 2026-08-16
updated: 2026-08-16
change: ""
capability: harness-integrity
github: "325"
blocked_by: []
tags: [harness, git, worktree, windows, tracking]
---

# A pruned worktree is an ignored directory

## What

Worktrees live at `.claude/worktrees/<name>`, and `.git/info/exclude:12` ignores
`**/.claude/worktrees/`. That is correct while the directory *is* a worktree —
its own `.git` file makes it a separate checkout, and the exclude only stops the
main repo from tracking it.

**If the worktree's `.git` file is lost, the directory does not become broken —
it becomes invisible.** Git walks up from the working directory, finds
`<repo>/.git`, and answers every command for the **main checkout on `main`**.
So inside a dead worktree:

- `git status` reports **clean** — truthfully, about `main`
- `git log -1`, `git branch`, `git worktree list` all describe `main`
- `git reset --hard origin/main` operates on the **main checkout**
- every file you edit lands in a path git is configured to ignore

There is no error at any point. `git worktree prune` then removes the
registration, so even `git worktree list` stops mentioning it.

## Why it matters

**Work done in a dead worktree is not in the repository, and every signal says
it is fine.** On 2026-08-16 an entire session close-out — a journal addendum,
an updated backlog item and a newly filed one — was written into such a
directory. `git status` said clean, so the natural reading was "nothing to
commit", when the truth was "nothing git can see". It was caught only because
`git rev-parse --show-toplevel` was run for an unrelated reason and returned the
main repo.

This is p2 rather than p3 because it is **silent, it defeats the check people
actually run, and this project runs nearly all work in worktrees.** The failure
is not losing the edits — they are still on disk — it is believing they landed.

## Evidence

- `.git/info/exclude:12` — `**/.claude/worktrees/`.
- `git check-ignore -v .claude/worktrees/<name>/openspec/JOURNAL.md` resolves to
  that rule, i.e. edits there are ignored by the main repo.
- Observed: `git status` → `nothing to commit, working tree clean`;
  `git rev-parse --show-toplevel` → `C:/Users/rafae/Documents/GitHub/Grid-Commander`;
  `git rev-parse --abbrev-ref HEAD` → `main`, from inside the worktree path.
- Recovery used: `diff -rq openspec <deadworktree>/openspec` to enumerate what
  was actually different, then copy those files onto a branch in the main
  checkout.

## Notes

The `.git` loss here was self-inflicted — `rm -rf` over sibling worktrees
followed shared junctions (see
[[a-merged-pr-leaves-its-remote-branch-behind]]) — but the hazard is not
specific to that cause. Any lost or corrupted `.git` file produces it.

What would settle it: **assert the checkout before trusting a clean status.**
`git rev-parse --show-toplevel` must equal the directory you think you are in,
and `git rev-parse --git-dir` must resolve inside it. Cheapest useful form is a
preflight in the session-start hook that fails loudly when the working directory
sits under an ignored path while claiming to be a checkout. A clean
`git status` is not evidence that edits landed.
