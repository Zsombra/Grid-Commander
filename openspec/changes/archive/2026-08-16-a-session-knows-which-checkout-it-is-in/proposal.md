# Proposal: A Session Knows Which Checkout It Is In

## Why

Worktrees live at `.claude/worktrees/<name>`, and `.git/info/exclude:12` ignores
`**/.claude/worktrees/`. That is correct while the directory *is* a worktree.

**If the worktree's `.git` file is lost, the directory does not break — it
becomes invisible.** Git walks up, finds `<repo>/.git`, and answers every
command for the main checkout on `main`. Inside a dead worktree `git status`
reports clean — truthfully, about `main` — while every file edited lands in a
path git is configured to ignore. There is no error at any point, and
`git worktree prune` then removes the registration so even `git worktree list`
stops mentioning it.

On 2026-08-16 an entire session close-out was written into such a directory. It
was caught only because `git rev-parse --show-toplevel` was run for an unrelated
reason. This is `a-pruned-worktree-is-an-ignored-directory` (#325), P2 because
it is silent and it defeats the check people actually use.

## What Changes

- Add `tools/assert_checkout.py` — a preflight that refuses to pass when the
  working directory is answered for by a repository that ignores it.
- Wire it as a `SessionStart` hook in `.claude/settings.json`, which does not
  exist yet and is created by this change.
- Add a `harness-integrity` requirement obliging the session to assert its
  checkout before a clean status is treated as evidence.

## The discriminator, measured

Run inside a **healthy** worktree on 2026-08-16:

```
show-toplevel    <the worktree itself>
git-dir          <repo>/.git/worktrees/<name>
check-ignore .   exit 1 — not ignored
```

Run from the main checkout, about that same directory:

```
check-ignore .claude/worktrees/<name>
  .git/info/exclude:12:**/.claude/worktrees/   .claude/worktrees/<name>
```

A healthy worktree's own repository does not ignore its own root. A dead one is
answered for by a repository that does. **`git check-ignore .` returning 0 is
the signature**, and it produces no false positive in a live worktree — verified
before the guard was written, not after.

## Capabilities

**New**: none
**Modified**: `harness-integrity` — gains a requirement that a session asserts
its checkout.

## Out of Scope

- **Repairing a dead worktree.** The guard refuses; it does not reattach a
  `.git` file. Recovery is a human decision about which of two checkouts the
  edits belong to.
- **The cause.** `rm -rf` over sibling worktrees following shared junctions is
  `worktree-removal-must-not-be-chased-with-rm-rf`; this change addresses the
  hazard, which any lost or corrupted `.git` file produces.
- **CI.** The guard's value is entirely at session start on a developer
  machine; CI runs in a proper checkout and would never fire it. It is not
  added to the test suite for that reason.
- **Other ignored-path hazards.** The check asks only whether the working
  directory is ignored by the repository answering for it. It does not audit
  `.gitignore` generally.

## Impact

- `tools/assert_checkout.py` (new).
- `.claude/settings.json` (new) — a `SessionStart` hook.
- `openspec/specs/harness-integrity/spec.md` — one requirement, at archive.
- No product code, no API, no data.
