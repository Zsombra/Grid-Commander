"""The archive merge must never touch a requirement the delta did not name.

Every operation becomes a line range computed against the pre-merge spec, and
the splice loop is only correct while those ranges are disjoint. Requirements
are addressed by name, so two operations on one name produce two ranges with
the same start — and no application order rescues that. These tests pin the
refusal at both layers: `validate` before archive, and `build_merged_spec`
itself for a delta edited after it was validated.

Assertions are on resulting file content, never on exit codes alone. A merge
regression that returns 0 and writes the wrong bytes is the failure this suite
exists to catch.
"""

from __future__ import annotations

import ast
import importlib.util
import shutil
import sys
import tempfile
import unittest
from pathlib import Path
from textwrap import dedent

TOOL = Path(__file__).resolve().parents[1] / ".claude" / "tools" / "openspec.py"

_spec = importlib.util.spec_from_file_location("openspec_tool", TOOL)
openspec = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(openspec)


MAIN_SPEC = dedent("""\
    # Auth Specification

    ## Purpose

    How people get in and out.

    ## Requirements

    ### Requirement: Alpha

    The system SHALL alpha.

    #### Scenario: Alpha happens
    - **WHEN** alpha is requested
    - **THEN** alpha occurs

    ### Requirement: Beta

    The system SHALL beta.

    #### Scenario: Beta happens
    - **WHEN** beta is requested
    - **THEN** beta occurs

    ### Requirement: Gamma

    The system SHALL gamma.

    #### Scenario: Gamma happens
    - **WHEN** gamma is requested
    - **THEN** gamma occurs
    """)

SPEC = "openspec/specs/auth/spec.md"


def requirement_names(text: str) -> list:
    return [line[len("### Requirement:"):].strip()
            for line in text.splitlines() if line.startswith("### Requirement:")]


def block_of(text: str, name: str) -> str:
    """The full requirement block for `name`, so a test can assert it is byte
    identical before and after a merge that should not have touched it."""
    lines = text.splitlines()
    start = next(i for i, l in enumerate(lines) if l.strip() == f"### Requirement: {name}")
    end = next((i for i in range(start + 1, len(lines))
                if lines[i].startswith("### Requirement:")), len(lines))
    return "\n".join(lines[start:end]).rstrip()


class MergeIntegrityTest(unittest.TestCase):
    def setUp(self) -> None:
        self.root = Path(tempfile.mkdtemp(prefix="openspec-merge-"))
        self.addCleanup(shutil.rmtree, self.root, ignore_errors=True)
        (self.root / "openspec" / "changes").mkdir(parents=True)

    # -- fixture helpers ---------------------------------------------------

    def main_spec(self, text: str = MAIN_SPEC) -> None:
        path = self.root / SPEC
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")

    def delta(self, change: str, capability: str, text: str) -> None:
        path = self.root / "openspec" / "changes" / change / "specs" / capability / "spec.md"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(dedent(text).strip() + "\n", encoding="utf-8")

    def read(self, rel: str) -> str:
        return (self.root / rel).read_text(encoding="utf-8")

    def validate(self, change: str) -> list:
        return openspec.validate_change(self.root, openspec.Change(self.root, change), False)

    def codes(self, change: str) -> list:
        return [d["code"] for d in self.validate(change)]

    def archive(self, change: str) -> dict:
        return openspec.archive_change(
            self.root, openspec.Change(self.root, change), apply=True, strict=False)

    # -- the P0 ------------------------------------------------------------

    def test_two_operations_on_one_requirement_are_refused(self):
        """The companion to test_multiple_operations_do_not_disturb_each_others
        _line_ranges, which uses three *different* requirements. Disjoint ranges
        are handled by bottom-up ordering; identical ranges are not, and this is
        the case that silently deletes a neighbour."""
        self.main_spec()
        self.delta("a-change", "auth", """
            ## REMOVED Requirements

            ### Requirement: Alpha

            **Reason**: superseded.

            ## MODIFIED Requirements

            ### Requirement: Alpha

            The system SHALL alpha with more care.

            #### Scenario: Alpha happens carefully
            - **WHEN** alpha is requested
            - **THEN** alpha occurs carefully
            """)

        self.assertIn("requirement_multiple_operations", self.codes("a-change"))

    def test_a_refused_delta_leaves_the_spec_and_change_folder_untouched(self):
        """Refusing is only worth anything if nothing moved. A partial archive
        would leave the spec rewritten and the change still active."""
        self.main_spec()
        self.delta("a-change", "auth", """
            ## REMOVED Requirements

            ### Requirement: Alpha

            **Reason**: superseded.

            ## MODIFIED Requirements

            ### Requirement: Alpha

            The system SHALL alpha with more care.

            #### Scenario: Alpha happens carefully
            - **WHEN** alpha is requested
            - **THEN** alpha occurs carefully
            """)

        result = self.archive("a-change")

        self.assertFalse(result["archived"])
        self.assertEqual(self.read(SPEC), MAIN_SPEC)
        self.assertTrue((self.root / "openspec" / "changes" / "a-change").is_dir())
        self.assertFalse((self.root / "openspec" / "changes" / "archive").exists())

    def test_the_merge_refuses_overlap_even_when_validation_is_bypassed(self):
        """Defence in depth: validation runs against the file on disk, and the
        file can be edited afterwards. The merge is the last thing standing
        between an ambiguous delta and the source of truth."""
        self.main_spec()
        self.delta("a-change", "auth", """
            ## REMOVED Requirements

            ### Requirement: Alpha

            **Reason**: superseded.

            ## MODIFIED Requirements

            ### Requirement: Alpha

            The system SHALL alpha with more care.

            #### Scenario: Alpha happens carefully
            - **WHEN** alpha is requested
            - **THEN** alpha occurs carefully
            """)
        delta = openspec.SpecDoc(
            self.root / "openspec" / "changes" / "a-change" / "specs" / "auth" / "spec.md")

        with self.assertRaises(ValueError) as caught:
            openspec.build_merged_spec(self.root, "auth", delta)

        self.assertIn("only once", str(caught.exception))

    def test_rename_plus_modify_on_one_requirement_is_refused(self):
        """Rename pairs live in delta.renames, not delta.sections, so they are
        easy to miss when collecting what a delta targets."""
        self.main_spec()
        self.delta("a-change", "auth", """
            ## RENAMED Requirements

            - FROM: `### Requirement: Alpha`
            - TO: `### Requirement: Alpha Prime`

            ## MODIFIED Requirements

            ### Requirement: Alpha

            The system SHALL alpha differently.

            #### Scenario: Alpha differs
            - **WHEN** alpha is requested
            - **THEN** alpha differs
            """)

        self.assertIn("requirement_multiple_operations", self.codes("a-change"))

    # -- duplicate names ---------------------------------------------------

    def test_duplicate_name_in_one_delta_section_is_refused(self):
        """Two ADDED blocks with one name both append, after which every future
        MODIFIED and REMOVED silently picks whichever comes first."""
        self.delta("a-change", "auth", """
            ## Purpose

            How people get in and out of the system, described at some length.

            ## ADDED Requirements

            ### Requirement: Thing

            The system SHALL do the thing.

            #### Scenario: It happens
            - **WHEN** asked
            - **THEN** it happens

            ### Requirement: Thing

            The system SHALL do the other thing.

            #### Scenario: It also happens
            - **WHEN** asked
            - **THEN** it also happens
            """)

        self.assertIn("duplicate_requirement_in_delta", self.codes("a-change"))

    def test_added_twice_on_a_new_capability_is_refused_by_the_merge(self):
        """The seeding path builds a brand new spec and never consults an
        existing one, so it needs its own duplicate check."""
        self.delta("a-change", "auth", """
            ## Purpose

            How people get in and out of the system, described at some length.

            ## ADDED Requirements

            ### Requirement: Thing

            The system SHALL do the thing.

            #### Scenario: It happens
            - **WHEN** asked
            - **THEN** it happens

            ### Requirement: Thing

            The system SHALL do the other thing.

            #### Scenario: It also happens
            - **WHEN** asked
            - **THEN** it also happens
            """)
        delta = openspec.SpecDoc(
            self.root / "openspec" / "changes" / "a-change" / "specs" / "auth" / "spec.md")

        with self.assertRaises(ValueError) as caught:
            openspec.build_merged_spec(self.root, "auth", delta)

        self.assertIn("twice", str(caught.exception))

    def test_duplicate_names_already_in_a_main_spec_are_reported(self):
        """A spec that already holds duplicates is otherwise inert — nothing
        complains until a later delta quietly edits the wrong one."""
        self.main_spec(MAIN_SPEC + dedent("""
            ### Requirement: Alpha

            The system SHALL alpha a second time.

            #### Scenario: Alpha again
            - **WHEN** alpha is requested
            - **THEN** alpha occurs again
            """))

        codes = [d["code"] for d in openspec.validate_main_specs(self.root, False)]

        self.assertIn("duplicate_requirement_in_spec", codes)

    # -- the case that must keep working -----------------------------------

    def test_operations_on_different_requirements_still_merge(self):
        """The guard refuses overlapping ranges, not multiple operations. Three
        operations on three requirements is ordinary and must be untouched."""
        self.main_spec()
        self.delta("a-change", "auth", """
            ## MODIFIED Requirements

            ### Requirement: Gamma

            The system SHALL gamma, twice.

            #### Scenario: Gamma happens twice
            - **WHEN** gamma is requested
            - **THEN** gamma occurs twice

            ## REMOVED Requirements

            ### Requirement: Alpha

            **Reason**: superseded.

            ## ADDED Requirements

            ### Requirement: Delta

            The system SHALL delta.

            #### Scenario: Delta happens
            - **WHEN** delta is requested
            - **THEN** delta occurs
            """)

        self.assertEqual([d for d in self.validate("a-change") if d["severity"] == "error"], [])
        result = self.archive("a-change")
        text = self.read(SPEC)

        self.assertTrue(result["archived"])
        self.assertEqual(requirement_names(text), ["Beta", "Gamma", "Delta"])
        self.assertIn("The system SHALL gamma, twice.", text)
        self.assertEqual(block_of(text, "Beta"), block_of(MAIN_SPEC, "Beta"))

    def test_adjacent_requirement_ranges_are_not_treated_as_overlapping(self):
        """Alpha ends on the line Beta starts. An off-by-one in the overlap
        check would refuse every delta touching two neighbours."""
        self.main_spec()
        self.delta("a-change", "auth", """
            ## REMOVED Requirements

            ### Requirement: Alpha

            **Reason**: superseded.

            ### Requirement: Beta

            **Reason**: also superseded.
            """)

        self.assertEqual([d for d in self.validate("a-change") if d["severity"] == "error"], [])
        self.archive("a-change")

        self.assertEqual(requirement_names(self.read(SPEC)), ["Gamma"])


class ZeroDependencyTest(unittest.TestCase):
    """The tool is copied into other repositories and run with bare python3.
    CI installs nothing, so a stray third-party import would not fail here —
    it would fail on someone else's machine, at the moment they first tried
    the harness. This is the assertion that keeps that job honest."""

    @unittest.skipUnless(hasattr(sys, "stdlib_module_names"),
                         "sys.stdlib_module_names needs python 3.10+; the tool itself targets 3.8")
    def test_the_tool_imports_only_the_standard_library(self):
        tree = ast.parse(TOOL.read_text(encoding="utf-8"))
        roots = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                roots.update(alias.name.split(".")[0] for alias in node.names)
            elif isinstance(node, ast.ImportFrom) and node.level == 0 and node.module:
                roots.add(node.module.split(".")[0])

        outside = sorted(r for r in roots if r not in sys.stdlib_module_names)

        self.assertEqual(outside, [], f"openspec.py imports non-stdlib modules: {outside}")


if __name__ == "__main__":
    unittest.main()
