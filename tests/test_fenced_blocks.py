"""Headings inside fenced code blocks are prose, not structure.

Markdown headings are this tool's entire structural vocabulary, so a document
that shows the format has its examples read as live structure unless every
scanner agrees on which lines are fenced. That is not a hypothetical for this
repository: `spec-validation` is a capability *about* the spec format, and
`.claude/references/spec-format.md` is worked examples end to end.

Two failures come from the one cause. A phantom requirement truncates the real
one, so the real requirement's scenarios are attributed to the example and
`requirement_without_scenario` fires against a requirement that plainly has
one — a false error on a correct spec. And because the phantom is a
`Requirement` like any other, `archive` merges it into `openspec/specs/`: a
documentation example becomes part of the source of truth.

The merge assertions are on file content. A parser regression that returns 0
and writes an example into the contract is what this suite exists to catch.
"""

from __future__ import annotations

import importlib.util
import shutil
import tempfile
import unittest
from pathlib import Path
from textwrap import dedent

TOOL = Path(__file__).resolve().parents[1] / ".claude" / "tools" / "openspec.py"

_spec = importlib.util.spec_from_file_location("openspec_fences", TOOL)
openspec = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(openspec)

# Built rather than written literally, so a fence never has to be escaped and
# the four-vs-three backtick cases stay legible.
F3 = "`" * 3
F4 = "`" * 4


def live_headings(lines: list) -> list:
    """The `### Requirement:` lines a fence-aware scanner should still see."""
    skip = openspec.fenced_lines(lines)
    return [l for i, l in enumerate(lines)
            if i not in skip and l.startswith("### Requirement:")]


class FencedLinesTest(unittest.TestCase):
    """The pre-pass on its own. Every scanner depends on it, so its edge cases
    are worth pinning here rather than only through a spec fixture."""

    def test_a_fenced_heading_is_not_live(self):
        self.assertEqual(
            live_headings([F3 + "markdown", "### Requirement: Example", F3,
                           "### Requirement: Real"]),
            ["### Requirement: Real"])

    def test_a_longer_fence_contains_a_shorter_one(self):
        """A ````-fence showing a ```-fence is how you document fenced syntax.
        Without tracking the opening run length, the inner fence closes the
        outer one and everything after it is read as structure."""
        self.assertEqual(
            live_headings([F4 + "markdown", F3, "### Requirement: Example", F3,
                           F4, "### Requirement: Real"]),
            ["### Requirement: Real"])

    def test_an_unterminated_fence_runs_to_end_of_file(self):
        """Matches how the text renders. Treating it as a one-line fence would
        make an unclosed block the most dangerous thing in a document."""
        self.assertEqual(
            live_headings([F3, "### Requirement: Example", "### Requirement: Also Example"]),
            [])

    def test_a_tilde_fence_is_a_fence(self):
        self.assertEqual(
            live_headings(["~~~", "### Requirement: Example", "~~~",
                           "### Requirement: Real"]),
            ["### Requirement: Real"])

    def test_a_tilde_run_does_not_close_a_backtick_fence(self):
        self.assertEqual(
            live_headings([F3, "~~~", "### Requirement: Example", "~~~", F3,
                           "### Requirement: Real"]),
            ["### Requirement: Real"])

    def test_inline_double_backticks_do_not_open_a_fence(self):
        """``x`` in a sentence is inline code. Reading it as a fence opener
        would silence every heading in the rest of the document."""
        self.assertEqual(
            live_headings(["Use ``x`` when the value contains a backtick.",
                           "### Requirement: Real"]),
            ["### Requirement: Real"])

    def test_a_backtick_fence_info_string_may_not_contain_a_backtick(self):
        self.assertEqual(
            live_headings([F3 + "a`b", "### Requirement: Real"]),
            ["### Requirement: Real"])

    def test_a_closing_fence_may_not_carry_an_info_string(self):
        """``` js opens nothing and closes nothing; the block continues to the
        next bare fence."""
        self.assertEqual(
            live_headings([F3, "### Requirement: Example", F3 + " js",
                           "### Requirement: Still Example", F3,
                           "### Requirement: Real"]),
            ["### Requirement: Real"])

    def test_three_spaces_of_indent_still_opens_a_fence(self):
        self.assertEqual(
            live_headings(["   " + F3, "### Requirement: Example", "   " + F3,
                           "### Requirement: Real"]),
            ["### Requirement: Real"])

    def test_four_spaces_of_indent_is_an_indented_block_not_a_fence(self):
        """CommonMark: at four spaces the backticks are literal content. If we
        treated it as a fence opener it would never be closed, and the rest of
        the file would go dark."""
        self.assertEqual(
            live_headings(["    " + F3, "### Requirement: Real"]),
            ["### Requirement: Real"])

    def test_a_document_with_no_fences_has_no_skipped_lines(self):
        self.assertEqual(openspec.fenced_lines(["# Title", "", "## Requirements"]), set())

    def test_parse_requirements_is_fence_aware_without_being_handed_a_skip_set(self):
        """`SpecDoc._parse` always passes `skip`, so the default-argument
        fallback in parse_requirements is dead code from the tool's own call
        sites — replacing it with `set()` broke no test. It exists so that a
        future caller cannot go fence-blind by forgetting an argument, which is
        a guarantee only a direct call can check."""
        lines = [F3 + "markdown", "### Requirement: Example", F3,
                 "### Requirement: Real", "", "The system SHALL real."]

        reqs = openspec.parse_requirements(lines, 0, len(lines))

        self.assertEqual([r.name for r in reqs], ["Real"])


class SpecParsingTest(unittest.TestCase):
    def setUp(self) -> None:
        self.root = Path(tempfile.mkdtemp(prefix="openspec-fence-"))
        self.addCleanup(shutil.rmtree, self.root, ignore_errors=True)
        (self.root / "openspec" / "changes").mkdir(parents=True)

    def spec(self, text: str) -> "openspec.SpecDoc":
        path = self.root / "scratch.md"
        path.write_text(dedent(text).strip() + "\n", encoding="utf-8")
        return openspec.SpecDoc(path)

    def test_a_fenced_requirement_heading_is_not_a_requirement(self):
        doc = self.spec(f"""
            ## Requirements

            ### Requirement: Docs

            The system SHALL document the delta format.

            {F3}markdown
            ### Requirement: Example
            #### Scenario: not real
            {F3}

            #### Scenario: real
            - **WHEN** a spec documents the format
            - **THEN** the fenced example is not parsed as structure
            """)

        self.assertEqual([r.name for r in doc.requirements], ["Docs"])

    def test_the_real_requirement_keeps_the_scenario_below_the_fence(self):
        """The filed reproduction. The phantom truncated `Docs`, so its own
        scenario was attributed to the example and the tool reported
        requirement_without_scenario against a requirement that has one."""
        doc = self.spec(f"""
            ## Requirements

            ### Requirement: Docs

            The system SHALL document the delta format.

            {F3}markdown
            ### Requirement: Example
            #### Scenario: not real
            {F3}

            #### Scenario: real
            - **WHEN** a spec documents the format
            - **THEN** the fenced example is not parsed as structure
            """)

        self.assertEqual([r.scenarios for r in doc.requirements], [["real"]])

    def test_a_fenced_scenario_does_not_count_as_a_scenario(self):
        doc = self.spec(f"""
            ## Requirements

            ### Requirement: Docs

            The system SHALL document the delta format.

            {F3}markdown
            #### Scenario: not real
            {F3}
            """)

        self.assertEqual(doc.requirements[0].scenarios, [])

    def test_a_fenced_near_miss_scenario_is_not_reported(self):
        """`### Scenario:` is a real near-miss diagnostic. Inside a fence it is
        someone documenting the mistake, and flagging it is a false positive."""
        doc = self.spec(f"""
            ## Requirements

            ### Requirement: Docs

            The system SHALL document the delta format. Do not write:

            {F3}markdown
            ### Scenario: wrong depth
            {F3}

            #### Scenario: real
            - **WHEN** documenting
            - **THEN** the example is not flagged
            """)

        self.assertEqual(doc.requirements[0].bad_scenarios, [])

    def test_a_fenced_section_heading_does_not_split_the_document(self):
        """`## ADDED Requirements` in an example would otherwise open a real
        delta section, and a main spec would be misread as a delta."""
        doc = self.spec(f"""
            ## Requirements

            ### Requirement: Docs

            The system SHALL document the delta format. A delta opens with:

            {F3}markdown
            ## ADDED Requirements
            {F3}

            #### Scenario: real
            - **WHEN** documenting
            - **THEN** the document is still a main spec
            """)

        self.assertFalse(doc.is_delta)
        self.assertEqual([r.name for r in doc.requirements], ["Docs"])

    def test_a_fenced_rename_pair_is_not_a_rename(self):
        doc = self.spec(f"""
            ## RENAMED Requirements

            {F3}markdown
            - FROM: `### Requirement: Documented Old`
            - TO: `### Requirement: Documented New`
            {F3}

            - FROM: `### Requirement: Real Old`
            - TO: `### Requirement: Real New`
            """)

        self.assertEqual(doc.renames, [("Real Old", "Real New")])

    # -- regression guards -------------------------------------------------

    def test_a_requirement_after_a_closed_fence_is_still_parsed(self):
        """The fix must not swallow the document from the first fence onward."""
        doc = self.spec(f"""
            ## Requirements

            ### Requirement: Docs

            The system SHALL document the format.

            {F3}markdown
            ### Requirement: Example
            {F3}

            #### Scenario: real
            - **WHEN** documenting
            - **THEN** it works

            ### Requirement: After

            The system SHALL keep parsing.

            #### Scenario: after
            - **WHEN** the fence has closed
            - **THEN** later requirements are still found
            """)

        self.assertEqual([r.name for r in doc.requirements], ["Docs", "After"])

    def test_a_spec_with_no_fences_parses_exactly_as_before(self):
        doc = self.spec("""
            ## Requirements

            ### Requirement: Alpha

            The system SHALL alpha.

            #### Scenario: a
            - **WHEN** x
            - **THEN** y

            ### Requirement: Beta

            The system SHALL beta.

            #### Scenario: b
            - **WHEN** x
            - **THEN** y
            """)

        self.assertEqual([r.name for r in doc.requirements], ["Alpha", "Beta"])
        self.assertEqual([r.scenarios for r in doc.requirements], [["a"], ["b"]])


class ArchiveTest(unittest.TestCase):
    """The half that reaches the source of truth."""

    DELTA = f"""
        # cap Specification

        ## Purpose

        Documents the delta format so that authors can write specs about specs.

        ## ADDED Requirements

        ### Requirement: Docs

        The system SHALL document the delta format.

        #### Scenario: real
        - **WHEN** a spec documents the format
        - **THEN** the fenced example is not parsed as structure

        An example of the format, for the reader:

        {F3}markdown
        ### Requirement: Example
        #### Scenario: not real
        - **WHEN** illustrating
        - **THEN** this is prose, not structure
        {F3}
        """

    def setUp(self) -> None:
        self.root = Path(tempfile.mkdtemp(prefix="openspec-fence-arch-"))
        self.addCleanup(shutil.rmtree, self.root, ignore_errors=True)
        delta = self.root / "openspec" / "changes" / "c" / "specs" / "cap" / "spec.md"
        delta.parent.mkdir(parents=True)
        delta.write_text(dedent(self.DELTA).strip() + "\n", encoding="utf-8")

    def archive(self) -> dict:
        return openspec.archive_change(
            self.root, openspec.Change(self.root, "c"), apply=True, strict=False)

    def merged(self) -> str:
        return (self.root / "openspec" / "specs" / "cap" / "spec.md").read_text(encoding="utf-8")

    def test_a_fenced_requirement_is_not_merged_into_the_source_of_truth(self):
        """Asserted on the merge plan rather than by scanning the merged file
        for headings: the file legitimately *contains* the example, inside its
        fence. A naive heading scan over the output finds it there and cannot
        tell the two cases apart — which is the whole bug, one level up."""
        result = self.archive()

        self.assertEqual(result["operations"], ["create cap: + Docs"])

    def test_the_fenced_example_survives_the_merge_unaltered(self):
        """Splitting the block at the phantom heading and rejoining it injected
        a blank line after the opening fence — the merge rewrote the example it
        should not have been reading in the first place."""
        self.archive()

        self.assertIn(f"{F3}markdown\n### Requirement: Example\n", self.merged())

    def test_validation_reports_nothing_on_a_spec_that_documents_the_format(self):
        found = openspec.validate_change(self.root, openspec.Change(self.root, "c"), False)
        codes = [d["code"] for d in found]

        self.assertNotIn("requirement_without_scenario", codes)
        self.assertNotIn("requirement_not_normative", codes)


class JournalAndBacklogTest(unittest.TestCase):
    def setUp(self) -> None:
        self.root = Path(tempfile.mkdtemp(prefix="openspec-fence-misc-"))
        self.addCleanup(shutil.rmtree, self.root, ignore_errors=True)
        (self.root / "openspec").mkdir(parents=True)

    def test_a_fenced_journal_heading_is_not_an_entry(self):
        """JOURNAL.md documents its own entry format in a fenced block. It
        survives today only because the example sits above the first real entry
        and the regex wants a date."""
        (self.root / "openspec" / "JOURNAL.md").write_text(dedent(f"""
            # Journal

            ## 2026-07-28 — Real entry

            Entries look like this:

            {F3}markdown
            ## 2026-01-01 — Example entry
            {F3}

            More of the real entry.
            """).strip() + "\n", encoding="utf-8")

        entries = openspec.read_journal(self.root, 0)

        self.assertEqual([e["summary"] for e in entries], ["Real entry"])
        self.assertIn("Example entry", entries[0]["body"])

    def test_a_fenced_title_is_not_a_backlog_title(self):
        body = dedent(f"""
            {F3}markdown
            # Not the title
            {F3}

            # The real title
            """)

        self.assertEqual(openspec.BacklogItem._title_from_body(body), "The real title")


if __name__ == "__main__":
    unittest.main()
