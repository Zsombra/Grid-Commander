"""The journal staleness check.

The journal is the only continuity mechanism between sessions and the only layer
nothing else verifies. The check is advisory on purpose — these tests pin both
that it fires when it should and that it stays quiet and harmless when it cannot
know, because a warning that cries wolf on a fresh clone gets muted and then
protects nothing.
"""

from __future__ import annotations

import unittest

from support import ProjectTestCase, git_available

CODE = "journal_stale"
JOURNAL = "# Journal\n\n## 2026-07-27 — A session\n**Did**: things.\n"


@unittest.skipUnless(git_available(), "git is not installed")
class JournalStalenessTest(ProjectTestCase):

    def seed(self):
        """A repo where the journal and the rest of openspec/ are in step."""
        self.project.write("openspec/JOURNAL.md", JOURNAL)
        self.project.backlog("an-item")
        self.project.git_init_and_commit("journal and work together")

    def test_work_committed_after_the_journal_warns(self):
        self.seed()
        self.project.backlog("an-item", title="An item, revised")
        self.project.git_init_and_commit("work without a journal entry")

        result = self.project.validate()

        d = self.assertCode(result, CODE, "warning")
        self.assertIn("work without a journal entry", d["message"])
        self.assertEqual(d["target"], "openspec/JOURNAL.md")

    def test_the_warning_never_fails_the_check(self):
        self.seed()
        self.project.backlog("an-item", title="An item, revised")
        self.project.git_init_and_commit("work without a journal entry")

        result = self.project.validate()

        self.assertEqual(result.code, 0, "staleness must stay advisory")
        self.assertEqual(result.json()["summary"]["errors"], 0)

    def test_a_journal_committed_alongside_the_work_is_quiet(self):
        self.seed()
        self.project.backlog("an-item", title="An item, revised")
        self.project.write("openspec/JOURNAL.md", JOURNAL + "\n## 2026-07-28 — Another\n**Did**: more.\n")
        self.project.git_init_and_commit("work plus its journal entry")

        self.assertNoCode(self.project.validate(), CODE)

    def test_a_journal_committed_after_the_work_clears_the_warning(self):
        self.seed()
        self.project.backlog("an-item", title="An item, revised")
        self.project.git_init_and_commit("work without a journal entry")
        self.assertCode(self.project.validate(), CODE, "warning")

        self.project.write("openspec/JOURNAL.md", JOURNAL + "\n## 2026-07-28 — Another\n**Did**: more.\n")
        self.project.git_init_and_commit("catch the journal up")

        self.assertNoCode(self.project.validate(), CODE)

    def test_editing_only_the_journal_does_not_warn(self):
        self.seed()
        self.project.write("openspec/JOURNAL.md", JOURNAL + "\n## 2026-07-28 — Another\n**Did**: more.\n")
        self.project.git_init_and_commit("journal only")

        self.assertNoCode(self.project.validate(), CODE)

    def test_uncommitted_work_does_not_warn(self):
        """The check reads history, not the working tree. Warning on every
        unstaged edit would fire constantly during a session and teach people
        to ignore it."""
        self.seed()
        self.project.backlog("an-item", title="Edited but not committed")

        self.assertNoCode(self.project.validate(), CODE)


class JournalCheckDegradesQuietlyTest(ProjectTestCase):
    """No history is not evidence of staleness."""

    def test_a_project_with_no_git_repository_is_quiet(self):
        self.project.write("openspec/JOURNAL.md", JOURNAL)
        self.project.backlog("an-item")

        result = self.project.validate()

        self.assertNoCode(result, CODE)
        self.assertEqual(result.code, 0)

    @unittest.skipUnless(git_available(), "git is not installed")
    def test_a_repository_with_no_commits_is_quiet(self):
        self.project.write("openspec/JOURNAL.md", JOURNAL)
        self.project.backlog("an-item")
        self.project.git("init", "-q", "-b", "main")

        self.assertNoCode(self.project.validate(), CODE)

    def test_a_project_with_no_journal_file_is_quiet(self):
        self.project.backlog("an-item")
        if git_available():
            self.project.git_init_and_commit("work, no journal file at all")

        self.assertNoCode(self.project.validate(), CODE)

    @unittest.skipUnless(git_available(), "git is not installed")
    def test_a_deleted_journal_does_not_warn_about_a_file_that_is_gone(self):
        """History still remembers the journal, so the git lookup alone would
        report it as behind. Telling someone to update a file they deleted is
        noise, and noise is how a warning gets muted."""
        self.project.write("openspec/JOURNAL.md", JOURNAL)
        self.project.backlog("an-item")
        self.project.git_init_and_commit("journal and work together")

        (self.project.root / "openspec" / "JOURNAL.md").unlink()
        self.project.git_init_and_commit("delete the journal")
        # Work lands *after* the deletion, so history has the journal strictly
        # behind — the git lookup alone would call it stale.
        self.project.backlog("an-item", title="An item, revised")
        self.project.git_init_and_commit("carry on working")

        result = self.project.validate()

        self.assertNoCode(result, CODE)
        self.assertEqual(result.code, 0)
