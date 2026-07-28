"""CLI contract: root resolution, flag placement, and exit codes.

Every skill shells out to this tool and reads `--json`. The exit code is what
CI keys off. Both have been broken before by changes that looked cosmetic.
"""

from __future__ import annotations

import ast
import sys
import unittest

from support import (MAIN_SPEC, ProjectTestCase, TOOL_PATH, added_delta, cwd,
                     dedent, run_cli)


class ZeroDependencyTest(unittest.TestCase):
    """The tool installs nothing. CI has no `pip install` step, so an import
    of anything third-party would fail on a fresh runner rather than here."""

    @unittest.skipUnless(hasattr(sys, "stdlib_module_names"),
                         "needs Python 3.10+ for sys.stdlib_module_names")
    def test_the_tool_imports_only_the_standard_library(self):
        tree = ast.parse(TOOL_PATH.read_text(encoding="utf-8"))
        imported = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                imported.update(a.name.split(".")[0] for a in node.names)
            elif isinstance(node, ast.ImportFrom) and node.level == 0 and node.module:
                imported.add(node.module.split(".")[0])
        outside = sorted(imported - set(sys.stdlib_module_names) - {"__future__"})
        self.assertEqual(outside, [], f"openspec.py now depends on {outside}")


class RootResolutionTest(ProjectTestCase):

    def test_the_root_is_found_from_a_nested_subdirectory(self):
        self.project.main_spec()
        nested = self.project.root / "src" / "deep" / "deeper"
        nested.mkdir(parents=True)

        with cwd(nested):
            result = run_cli(["board", "--json"])

        self.assertEqual(result.code, 0)
        self.assertEqual(result.json()["capabilities"], ["widgets"])

    def test_a_directory_with_no_openspec_tree_is_an_error(self):
        outside = self.project.root.parent / "elsewhere"
        outside.mkdir(exist_ok=True)

        with cwd(outside):
            result = run_cli(["board"])

        self.assertEqual(result.code, 1)
        self.assertIn("no openspec/ directory found", result.err)


class FlagPlacementTest(ProjectTestCase):
    """`--json` is typed after the subcommand by every skill, and before it by
    people reading `--help`. Both must work, and neither may clobber the other."""

    def test_json_before_the_subcommand(self):
        result = run_cli(["--json", "--root", str(self.project.root), "board"])
        self.assertEqual(result.code, 0)
        self.assertIn("capabilities", result.json())

    def test_json_after_the_subcommand(self):
        result = run_cli(["--root", str(self.project.root), "board", "--json"])
        self.assertEqual(result.code, 0)
        self.assertIn("capabilities", result.json())

    def test_omitting_json_after_the_subcommand_does_not_clobber_it(self):
        result = run_cli(["--json", "--root", str(self.project.root), "validate", "--all"])
        self.assertEqual(result.code, 0)
        self.assertIn("summary", result.json())

    def test_without_json_the_output_is_human_readable(self):
        result = run_cli(["--root", str(self.project.root), "board"])
        self.assertEqual(result.code, 0)
        self.assertIn("BOARD", result.out)


class ExitCodeTest(ProjectTestCase):

    def test_errors_exit_one(self):
        self.project.change()  # no deltas, skip_specs false
        self.assertEqual(self.project.validate().code, 1)

    def test_warnings_alone_exit_zero(self):
        self.project.system(status="placeholder", placeholder_groups=["color"])
        result = self.project.validate()
        self.assertEqual(result.code, 0)
        self.assertIn("design_system_placeholder", result.codes())

    def test_info_alone_exits_zero(self):
        self.project.backlog()
        self.project.change()
        self.project.delta("a-change", "widgets",
                           added_delta("Delta", purpose="A capability with no backlog item."))
        result = self.project.validate()
        self.assertEqual(result.code, 0)
        self.assertIn("change_without_backlog_item", result.codes())

    def test_a_clean_project_exits_zero(self):
        self.project.main_spec()
        result = self.project.validate()
        self.assertEqual(result.code, 0)
        self.assertEqual(result.diagnostics(), [])

    def test_strict_promotes_a_non_normative_requirement_to_an_error(self):
        self.project.main_spec()
        self.project.change()
        self.project.delta("a-change", "widgets", dedent("""
            ## ADDED Requirements

            ### Requirement: Delta
            Deltas are nice to have when convenient.

            #### Scenario: Delta happens
            - **WHEN** delta is requested
            - **THEN** delta occurs
        """))

        lenient = self.project.validate()
        strict = self.project.validate("--strict")

        self.assertEqual(lenient.severity_of("requirement_not_normative"), "warning")
        self.assertEqual(lenient.code, 0)
        self.assertEqual(strict.severity_of("requirement_not_normative"), "error")
        self.assertEqual(strict.code, 1)


class ChangeResolutionTest(ProjectTestCase):

    def test_a_single_active_change_is_resolved_without_naming_it(self):
        self.project.main_spec()
        self.project.change("only-change")
        self.project.delta("only-change", "widgets", added_delta("Delta"))

        result = self.project.run("status", "--json")

        self.assertEqual(result.code, 0)
        self.assertEqual(result.json()["change"], "only-change")

    def test_several_active_changes_must_be_disambiguated(self):
        self.project.change("one")
        self.project.change("two")

        result = self.project.run("status", "--json")

        self.assertEqual(result.code, 1)
        self.assertIn("multiple active changes", result.out)

    def test_an_unknown_change_is_an_error(self):
        result = self.project.run("status", "a-ghost", "--json")

        self.assertEqual(result.code, 1)
        self.assertIn("not found", result.out)


class ReadCommandTest(ProjectTestCase):
    """The read-only commands the skills depend on for their view of state."""

    def test_list_reports_task_progress(self):
        self.project.change("a-change", tasks="- [x] 1.1 done\n- [ ] 1.2 not done")
        payload = self.project.run("list", "--json").json()

        self.assertEqual(payload["changes"][0]["completedTasks"], 1)
        self.assertEqual(payload["changes"][0]["totalTasks"], 2)
        self.assertEqual(payload["changes"][0]["state"], "in-progress")

    def test_status_reports_the_artifact_graph(self):
        self.project.main_spec()
        self.project.change()
        self.project.delta("a-change", "widgets", added_delta("Delta"))
        payload = self.project.run("status", "a-change", "--json").json()

        states = {a["id"]: a["status"] for a in payload["artifacts"]}
        self.assertEqual(states["proposal"], "done")
        self.assertEqual(states["specs"], "done")
        self.assertEqual(states["tasks"], "done")
        self.assertEqual(states["design"], "n/a")   # full-track only

    def test_skip_specs_marks_the_specs_artifact_skipped(self):
        self.project.change(track="lite", skip_specs=True)
        payload = self.project.run("status", "a-change", "--json").json()

        states = {a["id"]: a["status"] for a in payload["artifacts"]}
        self.assertEqual(states["specs"], "skipped")
        self.assertTrue(payload["skipSpecs"])

    def test_backlog_filters_compose(self):
        self.project.backlog("one", type="bug", priority="p1")
        self.project.backlog("two", type="debt", priority="p1", tags=["harness"])
        self.project.backlog("three", type="debt", priority="p3", status="done")

        every = self.project.run("backlog", "list", "--status", "all", "--json").json()
        by_type = self.project.run("backlog", "list", "--type", "debt", "--json").json()
        by_tag = self.project.run("backlog", "list", "--tag", "harness", "--json").json()

        self.assertEqual(len(every["items"]), 3)
        self.assertEqual([i["id"] for i in by_type["items"]], ["two"])   # 'three' is done
        self.assertEqual([i["id"] for i in by_tag["items"]], ["two"])

    def test_backlog_show_returns_the_body(self):
        self.project.backlog("one", body="# One\n\n## What\n\nThe body text.\n")
        payload = self.project.run("backlog", "show", "one", "--json").json()

        self.assertEqual(payload["id"], "one")
        self.assertIn("The body text.", payload["body"])

    def test_journal_entries_are_parsed_newest_first(self):
        self.project.write("openspec/JOURNAL.md", dedent("""
            # Journal

            ## 2026-07-27 — The newer session
            **Did**: the newer thing.

            ## 2026-07-01 — The older session
            **Did**: the older thing.
        """))

        payload = self.project.run("journal", "--json").json()

        self.assertEqual([e["date"] for e in payload["entries"]], ["2026-07-27", "2026-07-01"])
        self.assertEqual(payload["entries"][0]["summary"], "The newer session")
        self.assertIn("the newer thing", payload["entries"][0]["body"])

    def test_journal_respects_its_limit(self):
        self.project.write("openspec/JOURNAL.md", dedent("""
            ## 2026-07-27 — Newest
            a

            ## 2026-07-26 — Middle
            b

            ## 2026-07-25 — Oldest
            c
        """))

        payload = self.project.run("journal", "--limit", "2", "--json").json()

        self.assertEqual([e["summary"] for e in payload["entries"]], ["Newest", "Middle"])

    def test_board_reports_the_next_action_for_a_change(self):
        self.project.main_spec()
        self.project.change(tasks="- [ ] 1.1 not done")
        self.project.delta("a-change", "widgets", added_delta("Delta"))

        payload = self.project.run("board", "--json").json()

        self.assertEqual(payload["capabilities"], ["widgets"])
        self.assertEqual(payload["changes"][0]["nextAction"],
                         "executor — implement remaining tasks")

    def test_board_points_at_verify_once_the_tasks_are_done(self):
        self.project.main_spec()
        self.project.change(tasks="- [x] 1.1 done")
        self.project.delta("a-change", "widgets", added_delta("Delta"))

        payload = self.project.run("board", "--json").json()

        self.assertEqual(payload["changes"][0]["nextAction"], "/verify, then /archive")

    def test_design_summary_lists_surfaces_and_tickets(self):
        self.project.main_spec()
        self.project.system()
        self.project.surface()
        self.project.ticket()

        payload = self.project.run("design", "--json").json()

        self.assertEqual([s["id"] for s in payload["surfaces"]], ["a-surface"])
        self.assertEqual([t["id"] for t in payload["tickets"]], ["a-ticket"])
        self.assertEqual(payload["system"]["status"], "designed")

    def test_a_well_formed_main_spec_produces_no_diagnostics(self):
        """The canned fixture must itself be clean, or every other test in the
        suite is asserting against a baseline of noise."""
        self.project.main_spec(text=MAIN_SPEC)

        payload = self.project.validate().json()

        self.assertEqual(payload["summary"], {"errors": 0, "warnings": 0, "info": 0})
