---
id: a-merged-pr-leaves-its-remote-branch-behind
title: "`gh pr merge --delete-branch` reports the merge and silently keeps the remote branch when a worktree holds the local one"
type: debt
status: open
priority: p3
created: 2026-08-16
updated: 2026-08-16
change: ""
capability: harness-integrity
github: "324"
blocked_by: []
tags: [harness, git, worktree, cleanup, tracking, windows]
---

# A merged PR leaves its remote branch behind

## What

`gh pr merge <n> --squash --delete-branch` **merges, then aborts its cleanup on
the first error and exits non-zero — having deleted neither the local nor the
remote branch.** When the branch is checked out in a git worktree, that first
error is guaranteed:

```
failed to delete local branch claude/<x>: cannot delete branch '<x>'
used by worktree at '.claude/worktrees/<x>'
```

The merge itself succeeded, so the message reads like harmless cleanup noise.
It is not: the **remote** branch is still there, and nothing later says so.

## Why it matters

Every branch this repo works on is checked out in a worktree, so this fires on
**every** merge, and the failure mode is invisible in the direction people
check.

> **Narrowed 2026-08-16 (later): "every merge" is too strong, and the exception
> is a workaround.** Three PRs were merged that day. **#329 fired it** — its
> branch was held by a worktree, `--delete-branch` reported success, and
> `git ls-remote` showed the remote branch still there. **#332 and #333 did
> not**: those branches were created and held in the **main checkout**, where
> `gh` switches away and deletes cleanly, remote included. So the trigger is
> precisely a *worktree-held* branch, not a merge — which the title already
> said, and which this paragraph overstated. Working a branch from the main
> checkout avoids it entirely, and is the cheapest mitigation until the item is
> fixed properly. **The post-merge `git ls-remote` check is still owed either
> way**, because which checkout held a branch is not something the merge output
> tells you. On 2026-08-16 four PRs (#307, #313, #319, #323) were merged this way; all
four reported success, and all four left their remote branch on `origin`. They
were only found by listing `refs/remotes/origin` at the end of the session
rather than trusting the merge output.

Stale remote branches are what made this session's reconciliation expensive in
the first place — a branch that still exists reads as open work until someone
proves otherwise, and proving otherwise means the whole squash-merge-artifact
investigation (`[gone]` is not merged, a three-dot diff cannot tell you, check
the PR state and the post-merge commits line by line).

## Evidence

- Four merges on 2026-08-16, each emitting `failed to delete local branch` and
  each leaving `origin/claude/<x>` alive: #307, #313, #319, #323.
- The decisive check that proved deletion was safe, rather than assuming it:
  `gh pr view <n> --json headRefOid` against `git rev-parse origin/<branch>` —
  all four `MATCH`, i.e. the remote tip was exactly what GitHub squashed.
- Cleanup that actually worked:
  `git push origin --delete <branch>` per branch, then `git fetch --prune`.

## Notes

**Do not "fix" this by deleting the worktree first.** A failed
`git worktree remove` on Windows is a locked directory *handle* over
already-deleted contents; chasing it with `rm -rf` follows the junctions these
worktrees share for `node_modules` and `.claude`, and takes out other
checkouts' copies. That happened in the same session — 6 tests failed mid-gate
on `Cannot find module`, and the worktree lost its `.claude` bundle and
eventually its **`.git` file**, which silently demoted it to an ignored
directory inside the main checkout (see
[[a-pruned-worktree-is-an-ignored-directory]]). Nothing was tracked, so nothing
was lost that `npm ci` and a copy could not restore, but the ordering matters: **merge and delete the remote first, and
treat the worktree as a separate, later problem.**

What would settle it: after any `gh pr merge`, assert
`git ls-remote --heads origin <branch>` is empty, and fail loudly if not.
Cheap, and it turns a silent leak into a caught one. Related:
[[the-mirror-is-checked-one-way]] — same shape, a record that disagrees with
reality in the direction nothing looks.
