"""Archive merge — asserted on the bytes written, never on the exit code.

This is the operation that rewrites the source of truth in place. A merge that
returns 0 and writes the wrong thing is the failure this file exists to catch.
"""

from support import MAIN_SPEC, ProjectTestCase, added_delta, dedent

SPEC = "openspec/specs/widgets/spec.md"


def requirement_names(text: str) -> list:
    return [line[len("### Requirement:"):].strip()
            for line in text.splitlines() if line.startswith("### Requirement:")]


def block_of(text: str, name: str) -> str:
    """The requirement block under `name`, excluding its header line."""
    lines = text.splitlines()
    start = next(i for i, l in enumerate(lines) if l.strip() == f"### Requirement: {name}")
    end = next((i for i in range(start + 1, len(lines))
                if lines[i].startswith("### Requirement:")), len(lines))
    return "\n".join(lines[start + 1:end]).strip()


class ArchiveMergeTest(ProjectTestCase):

    def archive(self, change="a-change"):
        result = self.project.run("archive", change, "--apply", "--json")
        self.assertEqual(result.code, 0, f"archive failed: {result}")
        self.assertWellFormed()
        return result

    def assertWellFormed(self):
        """Every merge leaves a spec someone can read.

        Off-by-one line ranges show up here first: a block removed one line
        short leaves its blank line behind, and the gaps compound with every
        archive until the file is mostly whitespace.
        """
        for path in (self.project.root / "openspec" / "specs").glob("**/spec.md"):
            text = path.read_text(encoding="utf-8")
            rel = path.relative_to(self.project.root)
            self.assertNotIn("\n\n\n", text, f"{rel} has a run of blank lines")
            self.assertTrue(text.endswith("\n"), f"{rel} has no trailing newline")
            self.assertFalse(text.startswith("\n"), f"{rel} starts with a blank line")

    # -- ADDED -------------------------------------------------------------

    def test_added_appends_and_preserves_existing_requirements(self):
        self.project.main_spec()
        self.project.change()
        self.project.delta("a-change", "widgets", added_delta("Delta"))

        self.archive()
        text = self.project.read(SPEC)

        self.assertEqual(requirement_names(text), ["Alpha", "Beta", "Gamma", "Delta"])
        # The requirements that were already there must survive untouched.
        self.assertEqual(block_of(text, "Alpha"), block_of(MAIN_SPEC, "Alpha"))
        self.assertEqual(block_of(text, "Gamma"), block_of(MAIN_SPEC, "Gamma"))
        self.assertIn("## Purpose", text)

    def test_added_to_a_new_capability_seeds_the_purpose(self):
        purpose = ("Gadgets are the part of the system that gadgets, and this "
                   "sentence is long enough to satisfy the strict check.")
        self.project.change()
        self.project.delta("a-change", "gadgets", added_delta("Delta", purpose=purpose))

        self.archive()
        text = self.project.read("openspec/specs/gadgets/spec.md")

        self.assertIn("# Gadgets Specification", text)
        self.assertIn(purpose, text)
        self.assertEqual(requirement_names(text), ["Delta"])
        self.assertIn("#### Scenario: Delta happens", text)

    # -- MODIFIED ----------------------------------------------------------

    def test_modified_replaces_the_entire_block(self):
        """A partial MODIFIED drops the scenarios it left out — by design.

        The pipeline docs warn about this; if it ever stops being true, the
        warning becomes a lie and half-written deltas start silently merging.
        """
        self.project.main_spec()
        self.project.change()
        self.project.delta("a-change", "widgets", dedent("""
            ## MODIFIED Requirements

            ### Requirement: Alpha
            The system SHALL alpha, but faster.

            #### Scenario: Alpha happens quickly
            - **WHEN** alpha is requested
            - **THEN** alpha occurs without delay
        """))

        self.archive()
        text = self.project.read(SPEC)

        self.assertEqual(requirement_names(text), ["Alpha", "Beta", "Gamma"])
        self.assertIn("The system SHALL alpha, but faster.", text)
        self.assertIn("#### Scenario: Alpha happens quickly", text)
        self.assertNotIn("Alpha is refused", text)
        self.assertNotIn("#### Scenario: Alpha happens\n", text)
        self.assertEqual(block_of(text, "Beta"), block_of(MAIN_SPEC, "Beta"))

    # -- REMOVED -----------------------------------------------------------

    def test_removed_deletes_the_block_and_leaves_neighbours_intact(self):
        self.project.main_spec()
        self.project.change()
        self.project.delta("a-change", "widgets", dedent("""
            ## REMOVED Requirements

            ### Requirement: Beta
            **Reason**: betas were folded into alpha.
        """))

        self.archive()
        text = self.project.read(SPEC)

        self.assertEqual(requirement_names(text), ["Alpha", "Gamma"])
        self.assertNotIn("Beta happens", text)
        self.assertEqual(block_of(text, "Alpha"), block_of(MAIN_SPEC, "Alpha"))
        self.assertEqual(block_of(text, "Gamma"), block_of(MAIN_SPEC, "Gamma"))

    # -- RENAMED -----------------------------------------------------------

    def test_renamed_rewrites_the_header_and_nothing_else(self):
        self.project.main_spec()
        self.project.change()
        self.project.delta("a-change", "widgets", dedent("""
            ## RENAMED Requirements

            - FROM: `### Requirement: Beta`
            - TO: `### Requirement: Bravo`
        """))

        self.archive()
        text = self.project.read(SPEC)

        self.assertEqual(requirement_names(text), ["Alpha", "Bravo", "Gamma"])
        self.assertEqual(block_of(text, "Bravo"), block_of(MAIN_SPEC, "Beta"))

    # -- combinations ------------------------------------------------------

    def test_multiple_operations_do_not_disturb_each_others_line_ranges(self):
        """Edits are applied bottom-up. Applied top-down instead, every range
        after the first would be off by the length of the edit before it."""
        self.project.main_spec()
        self.project.change()
        self.project.delta("a-change", "widgets", dedent("""
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
        """))

        self.archive()
        text = self.project.read(SPEC)

        self.assertEqual(requirement_names(text), ["Beta", "Gamma", "Delta"])
        self.assertIn("The system SHALL gamma, twice.", text)
        self.assertNotIn("Alpha", text)
        self.assertEqual(block_of(text, "Beta"), block_of(MAIN_SPEC, "Beta"))

    def test_two_capabilities_in_one_change_are_both_merged(self):
        self.project.main_spec()
        self.project.change()
        self.project.delta("a-change", "widgets", added_delta("Delta"))
        self.project.delta("a-change", "gadgets", added_delta(
            "Epsilon", purpose="Gadgets hold the parts of the system that are not widgets."))

        self.archive()

        self.assertIn("Delta", requirement_names(self.project.read(SPEC)))
        self.assertEqual(
            requirement_names(self.project.read("openspec/specs/gadgets/spec.md")), ["Epsilon"])

    # -- the folder move ---------------------------------------------------

    def test_the_change_folder_moves_under_a_dated_name(self):
        self.project.main_spec()
        self.project.change()
        self.project.delta("a-change", "widgets", added_delta("Delta"))

        result = self.archive()
        archived_as = result.json()["archived_as"]

        self.assertRegex(archived_as, r"^\d{4}-\d{2}-\d{2}-a-change$")
        self.assertFalse(self.project.exists("openspec/changes/a-change"))
        self.assertTrue(
            self.project.exists(f"openspec/changes/archive/{archived_as}/proposal.md"))

    def test_an_already_dated_change_name_is_not_dated_twice(self):
        self.project.main_spec()
        self.project.change("2026-01-01-a-change")
        self.project.delta("2026-01-01-a-change", "widgets", added_delta("Delta"))

        result = self.archive("2026-01-01-a-change")

        self.assertEqual(result.json()["archived_as"], "2026-01-01-a-change")
