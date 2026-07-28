"""Three findings, one failure mode: the check fails silently, and silence
reads as a pass.

- A block-style YAML list parsed to `[""]`. That is truthy, so an item naming
  its blocker in valid YAML satisfied `backlog_blocked_without_cause` — the
  check written for an item that names *no* blocker — while the blocker itself
  was invisible everywhere else.
- `archive` blocked only on validation errors, and task progress produced none.
  A change with `0/12` tasks merged its delta into `openspec/specs/`, writing a
  behavior claim that no code backs.
- An unrecognized `track` coerced to `standard` with no diagnostic, so the one
  thing an author did to raise the stakes was the thing silently dropped.

Each test states the observable consequence rather than the internal state, so
a fix that changes representation without restoring the signal still fails.
"""

from __future__ import annotations

import importlib.util
import shutil
import tempfile
import unittest
from pathlib import Path
from textwrap import dedent

TOOL = Path(__file__).resolve().parents[1] / ".claude" / "tools" / "openspec.py"

_spec = importlib.util.spec_from_file_location("openspec_silent", TOOL)
openspec = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(openspec)


DELTA = """\
# Cap Specification

## Purpose

Something the system does, described well enough to seed a new main spec.

## ADDED Requirements

### Requirement: Thing

The system SHALL do the thing.

#### Scenario: it happens
- **WHEN** asked
- **THEN** it does
"""


class Fixture(unittest.TestCase):
    """A repo with one change, parameterised on the bits each test bends."""

    def setUp(self) -> None:
        self.root = Path(tempfile.mkdtemp(prefix="openspec-silent-"))
        self.addCleanup(shutil.rmtree, self.root, ignore_errors=True)
        (self.root / "openspec" / "changes").mkdir(parents=True)

    def change(self, name: str = "c", *, track: str = "lite",
               tasks: str = "- [x] one\n", meta: bool = True,
               capability: str = "cap") -> "openspec.Change":
        d = self.root / "openspec" / "changes" / name
        spec_dir = d / "specs" / capability if capability else d / "specs"
        spec_dir.mkdir(parents=True)
        (spec_dir / "spec.md").write_text(DELTA, encoding="utf-8")
        (d / "proposal.md").write_text("# c\n\n## Why\n\nx\n", encoding="utf-8")
        (d / "tasks.md").write_text(tasks, encoding="utf-8")
        if meta:
            (d / ".openspec.yaml").write_text(
                f"track: {track}\ncreated: 2026-07-28\n", encoding="utf-8")
        return openspec.Change(self.root, name)

    def item(self, slug: str, frontmatter: str) -> None:
        path = self.root / "openspec" / "backlog" / f"{slug}.md"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(f"---\n{dedent(frontmatter).strip()}\n---\n\n# {slug}\n",
                        encoding="utf-8")

    def codes(self, change: "openspec.Change") -> list:
        return [d["code"] for d in openspec.validate_change(self.root, change, False)]

    def backlog_codes(self) -> list:
        return [d["code"] for d in openspec.validate_backlog(self.root, False)]

    def archive(self, change: "openspec.Change", **kw) -> dict:
        return openspec.archive_change(self.root, change, apply=True, strict=False, **kw)


# --------------------------------------------------------------------------
# frontmatter-drops-block-lists
# --------------------------------------------------------------------------

class BlockListTest(Fixture):
    def test_a_block_style_list_parses_to_its_items(self):
        self.item("a", """
            id: a
            type: bug
            status: blocked
            priority: p1
            blocked_by:
              - other-item
              - second-item
            """)
        items = openspec.load_backlog(self.root)

        self.assertEqual(items[0].blocked_by, ["other-item", "second-item"])

    def test_a_named_blocker_is_checked_rather_than_silently_accepted(self):
        """The consequence, not the representation. `[""]` was truthy, so the
        item satisfied blocked_without_cause while the blocker it named went
        unchecked — reported clean, dependency gone."""
        self.item("a", """
            id: a
            type: bug
            status: blocked
            priority: p1
            blocked_by:
              - does-not-exist
            """)

        codes = self.backlog_codes()

        self.assertIn("backlog_blocked_by_unknown", codes)
        self.assertNotIn("backlog_blocked_without_cause", codes)

    def test_an_item_that_names_no_blocker_is_still_reported(self):
        """The other side of the same check: a bare `blocked_by:` with nothing
        under it must stay falsy, or the fix trades one silence for another."""
        self.item("a", """
            id: a
            type: bug
            status: blocked
            priority: p1
            blocked_by:
            """)

        self.assertIn("backlog_blocked_without_cause", self.backlog_codes())

    def test_a_block_list_ends_at_the_next_key(self):
        self.item("a", """
            id: a
            type: bug
            status: open
            priority: p1
            blocked_by:
              - other-item
            tags:
              - harness
            """)
        item = openspec.load_backlog(self.root)[0]

        self.assertEqual(item.blocked_by, ["other-item"])
        self.assertEqual(item.tags, ["harness"])

    def test_comments_and_blank_lines_do_not_end_a_block_list(self):
        self.item("a", """
            id: a
            type: bug
            status: open
            priority: p1
            blocked_by:
              - first

              # why the second one matters
              - second
            """)
        item = openspec.load_backlog(self.root)[0]

        self.assertEqual(item.blocked_by, ["first", "second"])

    def test_quoted_block_items_are_unquoted(self):
        self.item("a", """
            id: a
            type: bug
            status: open
            priority: p1
            tags:
              - "harness"
              - 'parser'
            """)
        item = openspec.load_backlog(self.root)[0]

        self.assertEqual(item.tags, ["harness", "parser"])

    # -- regression guards -------------------------------------------------

    def test_inline_lists_still_parse(self):
        self.item("a", """
            id: a
            type: bug
            status: open
            priority: p1
            tags: [harness, parser]
            """)
        item = openspec.load_backlog(self.root)[0]

        self.assertEqual(item.tags, ["harness", "parser"])

    def test_scalars_and_booleans_still_parse(self):
        self.item("a", """
            id: a
            type: bug
            status: open
            priority: p1
            change: some-change
            """)
        item = openspec.load_backlog(self.root)[0]

        self.assertEqual(item.change, "some-change")
        self.assertEqual(item.id, "a")


# --------------------------------------------------------------------------
# archive-allows-incomplete-tasks
# --------------------------------------------------------------------------

class TaskGateTest(Fixture):
    def test_archive_refuses_a_change_with_unchecked_tasks(self):
        change = self.change(tasks="- [x] one\n- [ ] two\n")

        result = self.archive(change)

        self.assertIn("tasks_incomplete", [d["code"] for d in result["status"]])
        self.assertFalse(result["archived"])

    def test_the_refusal_names_the_progress(self):
        change = self.change(tasks="- [ ] one\n- [ ] two\n- [x] three\n")

        message = self.archive(change)["status"][0]["message"]

        self.assertIn("1/3", message)

    def test_a_refused_archive_writes_no_spec_and_moves_nothing(self):
        change = self.change(tasks="- [ ] one\n")

        self.archive(change)

        self.assertFalse((self.root / "openspec" / "specs").exists())
        self.assertTrue((self.root / "openspec" / "changes" / "c").is_dir())
        self.assertFalse((self.root / "openspec" / "changes" / "archive").exists())

    def test_allow_incomplete_overrides_the_refusal(self):
        """The escape hatch has to actually work, or the gate becomes a reason
        to stop using the tool rather than to finish the tasks."""
        change = self.change(tasks="- [ ] one\n")

        result = self.archive(change, allow_incomplete=True)

        self.assertEqual(result["status"], [])
        self.assertTrue(result["archived"])

    def test_validate_does_not_report_incomplete_tasks(self):
        """Deliberate layering. A change under development is *expected* to
        have unfinished tasks; making that a validation error would turn
        `board` and CI red for the normal case."""
        change = self.change(tasks="- [ ] one\n")

        self.assertNotIn("tasks_incomplete", self.codes(change))

    def test_an_unfinished_checklist_does_not_hide_a_structural_failure(self):
        """A policy stop must not mask a defect. archive_target_exists is
        detected after the gate, so returning early on tasks_incomplete meant
        the second problem only surfaced after fixing the first — one wasted
        round per stacked failure."""
        from datetime import date
        change = self.change(tasks="- [ ] one\n")
        occupied = self.root / "openspec" / "changes" / "archive" / f"{date.today().isoformat()}-c"
        occupied.mkdir(parents=True)

        codes = [d["code"] for d in self.archive(change)["status"]]

        self.assertIn("tasks_incomplete", codes)
        self.assertIn("archive_target_exists", codes)

    # -- regression guards -------------------------------------------------

    def test_a_fully_checked_change_still_archives(self):
        change = self.change(tasks="- [x] one\n- [x] two\n")

        result = self.archive(change)

        self.assertEqual(result["status"], [])
        self.assertTrue(result["archived"])

    def test_a_tasks_file_with_no_checkboxes_still_archives(self):
        """`no_tasks` already warns about this. There is no progress to read,
        so the gate has nothing to say and must not invent a refusal."""
        change = self.change(tasks="Just prose, no boxes.\n")

        self.assertTrue(self.archive(change)["archived"])


# --------------------------------------------------------------------------
# validate-change-metadata
# --------------------------------------------------------------------------

class ChangeMetadataTest(Fixture):
    def test_an_unrecognised_track_is_an_error(self):
        change = self.change(track="ful")

        self.assertIn("invalid_track", self.codes(change))

    def test_an_unrecognised_track_does_not_silently_run_as_standard(self):
        """The defect was that everything downstream agreed the change was
        fine. `status` still reports the effective track, but validation now
        refuses rather than letting the ceremony drop unremarked."""
        change = self.change(track="ful")
        errors = [d for d in openspec.validate_change(self.root, change, False)
                  if d["severity"] == "error"]

        self.assertTrue(errors)

    def test_a_missing_openspec_yaml_warns(self):
        change = self.change(meta=False)

        self.assertIn("change_meta_missing", self.codes(change))

    def test_an_openspec_yaml_with_no_track_warns(self):
        d = self.root / "openspec" / "changes" / "c"
        change = self.change()
        (d / ".openspec.yaml").write_text("created: 2026-07-28\n", encoding="utf-8")

        self.assertIn("track_not_declared", self.codes(openspec.Change(self.root, "c")))

    def test_a_delta_with_no_capability_directory_is_refused(self):
        """capability_of() yields "." and archive would write
        openspec/specs/spec.md — not a capability, and never read back."""
        change = self.change(capability="")

        self.assertIn("delta_without_capability", self.codes(change))

    def test_archive_refuses_a_delta_with_no_capability_directory(self):
        change = self.change(capability="")

        result = self.archive(change)

        self.assertFalse(result["archived"])
        self.assertFalse((self.root / "openspec" / "specs" / "spec.md").exists())

    def test_bare_validate_succeeds_on_a_repo_with_no_active_changes(self):
        """Everything archived is a healthy state. The obvious command used to
        exit 1 there, so `--all` was the only spelling that worked."""
        (self.root / "openspec" / "specs").mkdir(parents=True)

        self.assertEqual(openspec.main(["--root", str(self.root), "validate"]), 0)

    # -- regression guards -------------------------------------------------

    def test_each_valid_track_is_accepted(self):
        for track in openspec.TRACKS:
            with self.subTest(track=track):
                shutil.rmtree(self.root / "openspec" / "changes" / "c", ignore_errors=True)
                change = self.change(track=track)

                self.assertNotIn("invalid_track", self.codes(change))
                self.assertEqual(change.track, track)

    def test_a_normal_change_reports_nothing(self):
        change = self.change()

        self.assertEqual(self.codes(change), [])


if __name__ == "__main__":
    unittest.main()
