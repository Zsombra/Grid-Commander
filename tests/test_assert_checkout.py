"""The checkout assertion, and proof that it can fail.

`tools/assert_checkout.py` exists because a worktree that loses its `.git` file
does not break — it becomes invisible, and `git status` then reports clean
about a checkout the operator is not standing in (#325).

A guard nobody has seen fail is not known to work, and this one is easy to break
silently: narrow the ignore test, or compare paths instead of asking git, and it
passes everywhere including the case it exists for. So the load-bearing test
here is `test_a_directory_the_answering_repo_ignores_is_refused` — the rest pin
the shape around it.

The fixture reproduces the real geometry rather than mocking it: a repository
that ignores a subdirectory, and a directory sitting inside that ignored path
with no `.git` of its own. That is exactly what a pruned worktree leaves behind.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import unittest

from support import git_available

TOOL = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "tools",
    "assert_checkout.py",
)

OK, IGNORED, NO_REPO = 0, 1, 2


def run(*args):
    """The guard, as a subprocess. Returns (code, stdout, stderr)."""
    p = subprocess.run(
        [sys.executable, TOOL, *args],
        capture_output=True,
        text=True,
        check=False,
    )
    return p.returncode, p.stdout, p.stderr


@unittest.skipUnless(git_available(), "git is not installed")
class CheckoutAssertionTest(unittest.TestCase):

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.repo = os.path.join(self.tmp.name, "repo")
        os.makedirs(self.repo)
        for cmd in (
            ["init", "-q"],
            ["config", "user.email", "t@example.com"],
            ["config", "user.name", "t"],
        ):
            subprocess.run(["git", *cmd], cwd=self.repo, check=True,
                           capture_output=True)
        # The geometry that produces the hazard: the repo ignores a path, and a
        # directory lives inside it with no .git of its own.
        with open(os.path.join(self.repo, ".gitignore"), "w",
                  encoding="utf-8", newline="\n") as fh:
            fh.write("ignored-tree/\n")
        subprocess.run(["git", "add", "-A"], cwd=self.repo, check=True,
                       capture_output=True)
        subprocess.run(["git", "commit", "-qm", "seed"], cwd=self.repo,
                       check=True, capture_output=True)
        self.dead = os.path.join(self.repo, "ignored-tree", "worktree")
        os.makedirs(self.dead)

    # --- the case the guard exists for -----------------------------------

    def test_a_directory_the_answering_repo_ignores_is_refused(self):
        code, _, err = run(self.dead)
        self.assertEqual(code, IGNORED, err)

    def test_the_refusal_names_what_is_needed_to_diagnose_it(self):
        _, _, err = run(self.dead)
        # The directory, the repository answering for it, and the rule that
        # matched. Without the rule the operator cannot tell which exclude did
        # it, and that is the actionable half.
        self.assertIn("worktree", err)
        self.assertIn("git answers for", err)
        self.assertIn("ignored by", err)
        self.assertIn("ignored-tree", err)

    def test_the_refusal_says_a_clean_status_is_not_evidence(self):
        _, _, err = run(self.dead)
        self.assertIn("not evidence that edits landed", err)

    def test_git_really_does_report_clean_in_there(self):
        """The premise, asserted rather than assumed.

        If this ever stops holding, the guard is solving a problem that no
        longer exists and should be re-justified rather than kept.
        """
        p = subprocess.run(["git", "status", "--short"], cwd=self.dead,
                           capture_output=True, text=True, check=False)
        with open(os.path.join(self.dead, "work.md"), "w",
                  encoding="utf-8") as fh:
            fh.write("a close-out nobody will find\n")
        after = subprocess.run(["git", "status", "--short"], cwd=self.dead,
                               capture_output=True, text=True, check=False)
        self.assertEqual(p.stdout.strip(), "")
        self.assertEqual(after.stdout.strip(), "",
                         "a file was created and git noticed — the hazard "
                         "this guard exists for has changed shape")

    # --- the cases that must NOT fire ------------------------------------

    def test_a_healthy_checkout_passes_quietly(self):
        code, out, err = run(self.repo)
        self.assertEqual(code, OK, err)
        self.assertEqual(out.strip(), "")
        self.assertEqual(err.strip(), "")

    def test_an_ordinary_subdirectory_is_not_mistaken_for_a_dead_worktree(self):
        """A path comparison would fail here, which is why it is not one.

        `src/` sits below the toplevel and is not equal to it — the same shape
        as the dead worktree. Only the ignore test tells them apart.
        """
        sub = os.path.join(self.repo, "src")
        os.makedirs(sub)
        code, _, err = run(sub)
        self.assertEqual(code, OK, err)

    def test_outside_a_repository_says_so_plainly(self):
        code, _, err = run(self.tmp.name)
        self.assertEqual(code, NO_REPO)
        self.assertIn("no git repository", err)
        # Not conflated with the ignored-directory refusal: different remedies.
        self.assertNotIn("REFUSING", err)

    # --- hook mode --------------------------------------------------------

    def test_hook_mode_is_silent_and_zero_when_healthy(self):
        code, out, _ = run("--hook", self.repo)
        self.assertEqual(code, OK)
        self.assertEqual(out.strip(), "")

    def test_hook_mode_emits_parseable_json_and_still_exits_zero(self):
        code, out, _ = run("--hook", self.dead)
        # Exit 0 on refusal is deliberate: a non-zero SessionStart reads as
        # "the hook broke" rather than "the checkout is wrong".
        self.assertEqual(code, OK)
        payload = json.loads(out)
        self.assertEqual(
            payload["hookSpecificOutput"]["hookEventName"], "SessionStart")
        self.assertIn("REFUSING", payload["systemMessage"])
        self.assertIn("CHECKOUT ASSERTION FAILED",
                      payload["hookSpecificOutput"]["additionalContext"])

    def test_the_message_is_ascii_so_a_windows_console_can_render_it(self):
        _, out, err = run("--hook", self.dead)
        text = out + err
        self.assertTrue(all(ord(c) < 128 for c in text),
                        "non-ASCII in guard output renders as replacement "
                        "characters under the Windows console codepage")


if __name__ == "__main__":
    unittest.main()
