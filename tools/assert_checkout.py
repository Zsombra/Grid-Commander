#!/usr/bin/env python3
"""Refuse to proceed when git is answering for a repository that ignores you.

    python3 tools/assert_checkout.py [directory]

Exit 0 — the working directory is part of the repository git answers for.
Exit 1 — it is not, and a clean `git status` here describes another checkout.
Exit 2 — no repository at all, or git is unavailable.

## Why this exists

#325. Worktrees live at `.claude/worktrees/<name>`, and `.git/info/exclude`
ignores `**/.claude/worktrees/`. That is correct while the directory *is* a
worktree — its own `.git` file makes it a separate checkout, and the exclude
only stops the main repo from tracking it.

**If that `.git` file is lost, the directory does not break — it becomes
invisible.** Git walks up, finds `<repo>/.git`, and answers every command for
the main checkout:

    git status            reports clean — truthfully, about main
    git log -1            describes main
    git reset --hard      operates on the main checkout

and every file edited lands in a path git is configured to ignore. There is no
error at any point. `git worktree prune` then removes the registration, so even
`git worktree list` stops mentioning it. On 2026-08-16 a whole session close-out
was written into such a directory and `git status` said clean, so the natural
reading was "nothing to commit" when the truth was "nothing git can see".

## The discriminator, and why it is this one

Measured on 2026-08-16 inside a healthy worktree:

    git rev-parse --show-toplevel   -> the worktree itself
    git check-ignore .              -> exit 1, not ignored

and from the main checkout, about that same directory:

    git check-ignore .claude/worktrees/<name>
      .git/info/exclude:12:**/.claude/worktrees/  .claude/worktrees/<name>

**A healthy worktree's own repository does not ignore its own root. A dead one
is answered for by a repository that does.** So the test is `check-ignore`
against the working directory, not a comparison of paths: a path comparison
cannot tell a worktree from an ordinary subdirectory, both of which sit below a
toplevel that is not equal to them.

The check is deliberately narrow. It asks one question — *is the directory I am
standing in ignored by the repository answering for me* — and does not audit
ignore rules generally.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys

OK, IGNORED, NO_REPO = 0, 1, 2


def git(args: list[str], cwd: str) -> tuple[int, str]:
    """Run git, returning (exit status, stripped stdout)."""
    try:
        p = subprocess.run(
            ["git", *args], cwd=cwd, capture_output=True, text=True, check=False
        )
    except (OSError, ValueError) as exc:  # git missing, or a bad argv
        print(f"assert_checkout: cannot run git: {exc}", file=sys.stderr)
        sys.exit(NO_REPO)
    return p.returncode, p.stdout.strip()


def as_hook(message: str) -> int:
    """Emit the SessionStart hook payload and exit 0.

    Two deliberate choices.

    **The JSON is built here, not in the shell.** The hook command would
    otherwise need `jq` to quote a multi-line message into JSON, and `jq` is not
    installed on the machine this was written for. `json.dumps` cannot emit
    invalid JSON, and a hook whose output does not parse is a hook that silently
    does nothing.

    **Exit 0 even when the assertion failed.** `systemMessage` is the documented
    way to put text in front of the operator; a non-zero exit from SessionStart
    reads as "the hook broke", which is a different claim and a less useful one.
    The refusal is the message, not the status.
    """
    print(json.dumps({
        "systemMessage": message,
        "hookSpecificOutput": {
            "hookEventName": "SessionStart",
            "additionalContext": (
                "CHECKOUT ASSERTION FAILED. Do not treat `git status` in this "
                "directory as evidence about the work in it.\n" + message
            ),
        },
    }))
    return OK


def main(argv: list[str]) -> int:
    args = [a for a in argv[1:] if a != "--hook"]
    hook = "--hook" in argv[1:]
    where = os.path.abspath(args[0]) if args else os.getcwd()
    if not os.path.isdir(where):
        print(f"assert_checkout: not a directory: {where}", file=sys.stderr)
        return NO_REPO

    code, toplevel = git(["rev-parse", "--show-toplevel"], where)
    if code != 0 or not toplevel:
        # Scenario: not a checkout at all. Said plainly, and NOT reported as the
        # ignored-directory failure — they have different remedies.
        plain = f"assert_checkout: no git repository at {where}"
        if hook:
            return as_hook(plain)
        print(plain, file=sys.stderr)
        return NO_REPO

    # `check-ignore` answers relative to the repository that just claimed us.
    # Exit 0 means "this path is ignored" — which, for the directory we are
    # standing in, is the dead-worktree signature.
    code, rule = git(["check-ignore", "-v", "."], where)
    if code != 0:
        return OK

    _, git_dir = git(["rev-parse", "--git-dir"], where)
    _, branch = git(["rev-parse", "--abbrev-ref", "HEAD"], where)

    message = "\n".join(
            [
                "",
                "  REFUSING: git here is answering for a repository that ignores this directory.",
                "",
                f"    you are in      {where}",
                f"    git answers for {toplevel}",
                f"    its git dir     {git_dir}",
                f"    on branch       {branch}",
                f"    ignored by      {rule}",
                "",
                "  This is what a worktree looks like after it loses its .git file.",
                # ASCII only below this line. The message is printed to a
                # terminal, and on Windows the console codepage renders an em
                # dash as a replacement character -- a guard whose output looks
                # broken is one people stop reading.
                "  `git status` will report clean - truthfully, about the checkout above.",
                "  Every file you edit here lands in a path git is configured to ignore.",
                "",
                "  A clean `git status` is not evidence that edits landed.",
                "",
                "  Recover the work by hand before running any git command that writes:",
                "  the edits are on disk, and they belong to a checkout that is not this one.",
                "",
            ]
        )

    if hook:
        return as_hook(message)
    print(message, file=sys.stderr)
    return IGNORED


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
