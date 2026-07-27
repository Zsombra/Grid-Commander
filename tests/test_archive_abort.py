"""A failed archive must change nothing at all.

The tool plans every capability's merged text before writing any of it. If that
ever becomes write-as-you-go, a change touching two capabilities could half-land
— the first capability merged, the second refused — and leave the source of
truth in a state no change folder describes.
"""

import unittest

from support import MAIN_SPEC, ProjectTestCase, added_delta, dedent, openspec

SPEC = "openspec/specs/widgets/spec.md"


class ArchiveAbortTest(ProjectTestCase):

    # -- validation failure ------------------------------------------------

    def test_a_validation_error_writes_nothing_and_moves_nothing(self):
        self.project.main_spec()
        self.project.change()
        # ADDED a requirement that is already in the main spec.
        self.project.delta("a-change", "widgets", added_delta("Alpha"))

        result = self.project.run("archive", "a-change", "--apply", "--json")

        self.assertEqual(result.code, 1)
        self.assertFalse(result.json()["archived"])
        self.assertIn("added_already_exists", result.codes())
        self.assertEqual(self.project.read(SPEC), MAIN_SPEC)
        self.assertTrue(self.project.exists("openspec/changes/a-change/proposal.md"))
        self.assertEqual(list((self.project.root / "openspec/changes/archive").iterdir()), [])

    def test_the_diagnostics_name_what_to_fix(self):
        self.project.main_spec()
        self.project.change()
        self.project.delta("a-change", "widgets", added_delta("Alpha"))

        result = self.project.run("archive", "a-change", "--apply", "--json")

        problem = next(d for d in result.diagnostics() if d["code"] == "added_already_exists")
        self.assertIn("fix", problem)
        self.assertIn("target", problem)

    # -- merge conflict ----------------------------------------------------

    def test_the_merge_guards_refuse_a_capability_with_no_main_spec(self):
        """`build_merged_spec` will not apply MODIFIED or REMOVED to a
        capability it is creating from scratch."""
        for op in ("MODIFIED", "REMOVED"):
            with self.subTest(op=op):
                delta = openspec.SpecDoc(self.project.write(
                    f"scratch/{op}.md",
                    dedent(f"""
                        ## Purpose

                        A capability that does not exist yet.

                        ## {op} Requirements

                        ### Requirement: Alpha
                        The system SHALL alpha.

                        #### Scenario: Alpha happens
                        - **WHEN** alpha
                        - **THEN** alpha
                    """)))
                with self.assertRaises(ValueError) as caught:
                    openspec.build_merged_spec(self.project.root, "gadgets", delta)
                self.assertIn("requires an existing main spec", str(caught.exception))

    def test_a_merge_failure_leaves_every_capability_untouched(self):
        """A change touching two capabilities must not half-land.

        Every capability's merged text is built before any of it is written, so
        a refusal on the second must leave the first on disk unchanged. The
        merge is forced here because validation is currently a superset of the
        merge's own preconditions — see the `merge-conflict-unreachable`
        backlog item — so no CLI input reaches this path on its own.
        """
        self.project.main_spec("alpha-cap")
        self.project.change()
        self.project.delta("a-change", "alpha-cap", added_delta("Delta"))
        self.project.delta("a-change", "zeta-cap", added_delta(
            "Epsilon", purpose="Zeta exists only to refuse to merge."))

        real = openspec.build_merged_spec

        def refuse_the_second(root, cap, delta):
            if cap == "zeta-cap":
                raise ValueError(f"{cap}: contrived failure")
            return real(root, cap, delta)

        openspec.build_merged_spec = refuse_the_second
        self.addCleanup(setattr, openspec, "build_merged_spec", real)

        result = self.project.run("archive", "a-change", "--apply", "--json")

        self.assertEqual(result.code, 1)
        self.assertIn("merge_conflict", result.codes())
        self.assertEqual(self.project.read("openspec/specs/alpha-cap/spec.md"), MAIN_SPEC)
        self.assertFalse(self.project.exists("openspec/specs/zeta-cap/spec.md"))
        self.assertTrue(self.project.exists("openspec/changes/a-change/proposal.md"))

    @unittest.expectedFailure
    def test_a_rename_in_a_new_capability_is_not_silently_dropped(self):
        """Known bug — `renamed-dropped-on-new-capability` in the backlog.

        `RENAMED` puts its pairs in `doc.renames`, not `doc.sections["RENAMED"]`,
        so the new-capability guard sees an empty list and lets the merge
        through. Validation skips the rename checks too, because there is no
        main spec to check against. The rename vanishes with no diagnostic.

        Marked expectedFailure so the suite passes today and fails loudly the
        moment someone fixes the tool without removing this marker.
        """
        self.project.change()
        self.project.delta("a-change", "gadgets", added_delta(
            "Delta", purpose="A new capability carrying a rename it cannot apply."
        ) + dedent("""

            ## RENAMED Requirements

            - FROM: `### Requirement: Nothing`
            - TO: `### Requirement: Something`
        """))

        result = self.project.run("archive", "a-change", "--apply", "--json")

        self.assertEqual(result.code, 1, "the rename was applied to nothing, silently")

    # -- recovery ----------------------------------------------------------

    def test_archiving_again_after_the_fix_completes_normally(self):
        self.project.main_spec()
        self.project.change()
        self.project.delta("a-change", "widgets", added_delta("Alpha"))

        first = self.project.run("archive", "a-change", "--apply", "--json")
        self.assertEqual(first.code, 1)

        # Same change, corrected: ADD a requirement that does not already exist.
        self.project.delta("a-change", "widgets", added_delta("Delta"))
        second = self.project.run("archive", "a-change", "--apply", "--json")

        self.assertEqual(second.code, 0, f"re-run failed: {second}")
        self.assertTrue(second.json()["archived"])
        self.assertIn("### Requirement: Delta", self.project.read(SPEC))
        self.assertFalse(self.project.exists("openspec/changes/a-change"))

    def test_archive_refuses_when_the_target_already_exists(self):
        self.project.main_spec()
        self.project.change("2026-01-01-a-change")
        self.project.delta("2026-01-01-a-change", "widgets", added_delta("Delta"))
        self.project.archived("2026-01-01-a-change")

        result = self.project.run("archive", "2026-01-01-a-change", "--apply", "--json")

        self.assertEqual(result.code, 1)
        self.assertIn("archive_target_exists", result.codes())
        self.assertEqual(self.project.read(SPEC), MAIN_SPEC)
        self.assertTrue(self.project.exists("openspec/changes/2026-01-01-a-change/proposal.md"))

    # -- dry run -----------------------------------------------------------

    def test_a_dry_run_reports_the_operations_and_writes_nothing(self):
        self.project.main_spec()
        self.project.change()
        self.project.delta("a-change", "widgets", added_delta("Delta"))

        result = self.project.run("archive", "a-change", "--json")
        payload = result.json()

        self.assertEqual(result.code, 0)
        self.assertTrue(payload["dry_run"])
        self.assertFalse(payload["archived"])
        self.assertEqual(payload["operations"], ["widgets: + Delta"])
        self.assertEqual(payload["specs_updated"], ["openspec/specs/widgets/spec.md"])
        self.assertEqual(self.project.read(SPEC), MAIN_SPEC)
        self.assertTrue(self.project.exists("openspec/changes/a-change/proposal.md"))
