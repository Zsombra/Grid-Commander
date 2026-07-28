"""One fixture per diagnostic code, plus a meta-test that reads the codes out
of the tool's own source.

The validation codes are the entire contract between the tool and the skills.
A code that quietly stops firing looks exactly like a project with nothing
wrong, so each one is pinned to a fixture that provokes it — and to the
severity it is declared with, because an error demoted to a warning stops
failing CI without stopping being a bug.
"""

from __future__ import annotations

import ast
import unittest

from support import (MAIN_SPEC, ProjectTestCase, TOOL_PATH, added_delta, dedent,
                     git_available, openspec)

VALIDATE = ("validate", "--all", "--json")
STRICT = ("validate", "--all", "--json", "--strict")
ARCHIVE = ("archive", "a-change", "--apply", "--json")


class Case:
    def __init__(self, code, severity, argv, build):
        self.code, self.severity, self.argv, self.build = code, severity, argv, build


CASES: dict = {}


def case(code: str, severity: str = "error", argv: tuple = VALIDATE):
    def register(fn):
        assert code not in CASES, f"duplicate fixture for {code}"
        CASES[code] = Case(code, severity, argv, fn)
        return fn
    return register


# --------------------------------------------------------------------------
# Change and delta specs
# --------------------------------------------------------------------------

@case("no_deltas")
def _(p, t):
    p.change()


@case("skip_specs_with_deltas")
def _(p, t):
    p.change(skip_specs=True)
    p.delta("a-change", "widgets", added_delta("Delta", purpose="A capability."))


@case("not_a_delta")
def _(p, t):
    p.change()
    p.delta("a-change", "widgets", MAIN_SPEC)


@case("empty_delta")
def _(p, t):
    p.change()
    p.delta("a-change", "widgets", "## ADDED Requirements\n\nNothing here yet.\n")


@case("missing_purpose")
def _(p, t):
    p.change()
    p.delta("a-change", "widgets", added_delta("Delta"))


@case("purpose_too_brief", "warning", STRICT)
def _(p, t):
    p.change()
    p.delta("a-change", "widgets", added_delta("Delta", purpose="Too short."))


@case("purpose_ignored", "warning")
def _(p, t):
    p.main_spec()
    p.change()
    p.delta("a-change", "widgets",
            added_delta("Delta", purpose="A purpose the archive step will ignore entirely."))


@case("scenario_wrong_level")
def _(p, t):
    p.main_spec()
    p.change()
    p.delta("a-change", "widgets", dedent("""
        ## ADDED Requirements

        ### Requirement: Delta
        The system SHALL delta.

        ### Scenario: Delta happens
        - **WHEN** delta is requested
        - **THEN** delta occurs
    """))


@case("requirement_without_scenario")
def _(p, t):
    p.main_spec()
    p.change()
    p.delta("a-change", "widgets", dedent("""
        ## ADDED Requirements

        ### Requirement: Delta
        The system SHALL delta, and says nothing about how that is observed.
    """))


@case("requirement_not_normative", "warning")
def _(p, t):
    p.main_spec()
    p.change()
    p.delta("a-change", "widgets", dedent("""
        ## ADDED Requirements

        ### Requirement: Delta
        Deltas are nice to have when convenient.

        #### Scenario: Delta happens
        - **WHEN** delta is requested
        - **THEN** delta occurs
    """))


@case("added_already_exists")
def _(p, t):
    p.main_spec()
    p.change()
    p.delta("a-change", "widgets", added_delta("Alpha"))


@case("no_main_spec")
def _(p, t):
    p.change()
    p.delta("a-change", "widgets", dedent("""
        ## Purpose

        A capability that has never been archived, so it has no main spec.

        ## MODIFIED Requirements

        ### Requirement: Alpha
        The system SHALL alpha.

        #### Scenario: Alpha happens
        - **WHEN** alpha
        - **THEN** alpha
    """))


@case("modified_not_found")
def _(p, t):
    p.main_spec()
    p.change()
    p.delta("a-change", "widgets", dedent("""
        ## MODIFIED Requirements

        ### Requirement: Nope
        The system SHALL nope.

        #### Scenario: Nope happens
        - **WHEN** nope
        - **THEN** nope
    """))


@case("removed_not_found")
def _(p, t):
    p.main_spec()
    p.change()
    p.delta("a-change", "widgets", dedent("""
        ## REMOVED Requirements

        ### Requirement: Nope
        **Reason**: it was never there.
    """))


@case("removal_without_reason", "warning")
def _(p, t):
    p.main_spec()
    p.change()
    p.delta("a-change", "widgets", dedent("""
        ## REMOVED Requirements

        ### Requirement: Alpha
        Gone.
    """))


@case("renamed_no_main_spec")
def _(p, t):
    p.change()
    p.delta("a-change", "widgets", added_delta(
        "Delta", purpose="A capability whose first change tries to rename something."
    ) + dedent("""

        ## RENAMED Requirements

        - FROM: `### Requirement: Nothing`
        - TO: `### Requirement: Something`
    """))


@case("renamed_not_found")
def _(p, t):
    p.main_spec()
    p.change()
    p.delta("a-change", "widgets", dedent("""
        ## RENAMED Requirements

        - FROM: `### Requirement: Nope`
        - TO: `### Requirement: Nada`
    """))


@case("renamed_target_exists")
def _(p, t):
    p.main_spec()
    p.change()
    p.delta("a-change", "widgets", dedent("""
        ## RENAMED Requirements

        - FROM: `### Requirement: Alpha`
        - TO: `### Requirement: Beta`
    """))


@case("no_tasks", "warning")
def _(p, t):
    p.main_spec()
    p.change(tasks="")
    p.delta("a-change", "widgets", added_delta("Delta"))


# --------------------------------------------------------------------------
# Main specs
# --------------------------------------------------------------------------

@case("main_spec_no_purpose", "warning")
def _(p, t):
    p.main_spec(text=dedent("""
        # Widgets Specification

        ## Requirements

        ### Requirement: Alpha
        The system SHALL alpha.

        #### Scenario: Alpha happens
        - **WHEN** alpha
        - **THEN** alpha
    """))


@case("main_spec_purpose_tbd", "warning")
def _(p, t):
    p.main_spec(text=MAIN_SPEC.replace(
        "Widgets exist so the rest of the system has something to hold on to, and so\n"
        "these fixtures have a capability with more than one requirement in it.",
        "TBD — Update Purpose after archive."))


@case("main_spec_no_requirements", "warning")
def _(p, t):
    p.main_spec(text=dedent("""
        # Widgets Specification

        ## Purpose

        A capability whose requirements have all been removed, leaving a shell.
    """))


# --------------------------------------------------------------------------
# Backlog
# --------------------------------------------------------------------------

@case("backlog_missing_frontmatter")
def _(p, t):
    p.raw_backlog("an-item", "# An item\n\nNo frontmatter at all.\n")


@case("backlog_id_mismatch")
def _(p, t):
    p.backlog("an-item", id="a-different-id")


@case("backlog_invalid_type")
def _(p, t):
    p.backlog(type="nonsense")


@case("backlog_invalid_status")
def _(p, t):
    p.backlog(status="nonsense")


@case("backlog_invalid_priority")
def _(p, t):
    p.backlog(priority="p9")


@case("backlog_blocked_by_unknown", "warning")
def _(p, t):
    p.backlog(blocked_by=["a-ghost"])


@case("backlog_blocked_without_cause", "warning")
def _(p, t):
    p.backlog(status="blocked", blocked_by=[])


@case("backlog_change_not_found")
def _(p, t):
    p.backlog(change="a-ghost-change")


@case("backlog_change_archived", "warning")
def _(p, t):
    p.archived("2026-01-01-done-change")
    p.backlog(change="done-change", status="open")


@case("backlog_status_behind_change", "warning")
def _(p, t):
    p.change()
    p.delta("a-change", "widgets", added_delta("Delta", purpose="A capability that is being built."))
    p.backlog(change="a-change", status="open")


@case("backlog_in_progress_without_change", "warning")
def _(p, t):
    p.backlog(status="in-progress", change="")


@case("backlog_capability_not_found", "warning")
def _(p, t):
    p.backlog(capability="a-ghost-capability")


@case("backlog_never_updated", "warning", STRICT)
def _(p, t):
    p.backlog(status="open", updated="")


@case("journal_stale", "warning")
def _(p, t):
    if not git_available():
        raise unittest.SkipTest("git is not installed")
    p.write("openspec/JOURNAL.md", "# Journal\n\n## 2026-07-27 — A session\n**Did**: things.\n")
    p.backlog("an-item")
    p.git_init_and_commit("journal and work together")
    # Work lands after the journal was last touched.
    p.backlog("an-item", title="An item, revised")
    p.git_init_and_commit("work without a journal entry")


@case("change_without_backlog_item", "info")
def _(p, t):
    p.backlog()
    p.change()
    p.delta("a-change", "widgets", added_delta("Delta", purpose="A capability with no item."))


# --------------------------------------------------------------------------
# Design layer
# --------------------------------------------------------------------------

@case("design_system_placeholder", "warning")
def _(p, t):
    p.system(status="placeholder", placeholder_groups=["color", "type"])


@case("design_invalid_json")
def _(p, t):
    p.write("openspec/design/surfaces/broken.json", "{ this is not json")


@case("design_missing_field")
def _(p, t):
    p.surface(title="")


@case("design_id_mismatch")
def _(p, t):
    p.surface("a-surface", id="a-different-surface")


@case("design_invalid_enum")
def _(p, t):
    p.surface(status="banana")


@case("design_surface_unknown_capability", "warning")
def _(p, t):
    p.surface(capability="a-ghost-capability")


@case("design_source_file_missing")
def _(p, t):
    p.surface(source_files=["src/Gone.tsx"])


@case("design_surface_incomplete_sources", "warning")
def _(p, t):
    p.write("src/Panel.tsx", 'import { Row } from "./Row";\nexport const Panel = () => <Row />;\n')
    p.write("src/Row.tsx", "export const Row = () => null;\n")
    p.surface(source_files=["src/Panel.tsx"],
              components=[{"id": "panel", "role": "display", "purpose": "Shows rows",
                           "states": ["default"]}])


@case("design_component_not_found", "warning")
def _(p, t):
    p.write("src/Panel.tsx", "export const Panel = () => null;\n")
    p.surface(source_files=["src/Panel.tsx"],
              components=[{"id": "ghost-widget", "role": "display", "purpose": "Nothing",
                           "states": ["default"]}])


@case("design_surface_stale", "warning")
def _(p, t):
    if not git_available():
        raise unittest.SkipTest("git is not installed")
    p.write("src/Panel.tsx", "export const Panel = () => null;\n")
    first = p.git_init_and_commit("first")
    p.write("src/Panel.tsx", "export const Panel = () => 'changed';\n")
    p.git_init_and_commit("second")
    p.surface(source_files=["src/Panel.tsx"], generated_at_commit=first,
              components=[{"id": "panel", "role": "display", "purpose": "Shows rows",
                           "states": ["default"]}])


@case("design_no_acceptance")
def _(p, t):
    p.surface()
    p.ticket(acceptance=[])


@case("design_ticket_unknown_surface")
def _(p, t):
    p.ticket(surface="a-ghost-surface")


@case("design_ticket_unknown_target")
def _(p, t):
    p.surface()
    p.ticket(targets=["a-ghost-component"])


@case("design_state_not_covered", "warning")
def _(p, t):
    p.surface(components=[{"id": "thing-list", "role": "display", "purpose": "Lists things",
                           "states": ["default", "loading"]}])
    p.ticket(design={"states": {"default": {"background": "surface.raised"}}})


@case("design_blocked_without_spec_change")
def _(p, t):
    p.surface()
    p.ticket(behavior_impact="requires-spec-change", spec_change="")


@case("design_spec_change_not_found")
def _(p, t):
    p.surface()
    p.ticket(behavior_impact="requires-spec-change", spec_change="a-ghost-change")


@case("design_raw_color_value", "warning")
def _(p, t):
    p.surface()
    p.ticket(design={"states": {"default": {"background": "#ff0000"}}})


@case("design_orphan_surface", "info")
def _(p, t):
    p.surface(status="functional")


# --------------------------------------------------------------------------
# Archive
# --------------------------------------------------------------------------

@case("archive_target_exists", "error", ("archive", "2026-01-01-a-change", "--apply", "--json"))
def _(p, t):
    p.main_spec()
    p.change("2026-01-01-a-change")
    p.delta("2026-01-01-a-change", "widgets", added_delta("Delta"))
    p.archived("2026-01-01-a-change")


@case("merge_conflict", "error", ARCHIVE)
def _(p, t):
    """Not reachable from any CLI input — validation currently rejects every
    condition the merge itself would refuse. The failure is forced so the
    error-handling path is still covered. See the `merge-conflict-unreachable`
    backlog item."""
    p.main_spec()
    p.change()
    p.delta("a-change", "widgets", added_delta("Delta"))

    real = openspec.build_merged_spec
    openspec.build_merged_spec = lambda *a, **k: (_ for _ in ()).throw(
        ValueError("widgets: contrived failure"))
    t.addCleanup(setattr, openspec, "build_merged_spec", real)


# --------------------------------------------------------------------------
# The tests
# --------------------------------------------------------------------------

class ValidationCodeTest(ProjectTestCase):
    """One generated test per case — see the bottom of this file."""


def _make_test(spec: Case):
    def test(self):
        spec.build(self.project, self)
        result = self.project.run(*spec.argv)
        self.assertCode(result, spec.code, spec.severity)
    test.__name__ = f"test_{spec.code}"
    test.__doc__ = f"{spec.code} fires as a {spec.severity}"
    return test


for _code, _spec in CASES.items():
    setattr(ValidationCodeTest, f"test_{_code}", _make_test(_spec))


# Two call sites build their code from an f-string. Expanded by hand here; the
# count is asserted so a third dynamic site fails this test instead of quietly
# going uncovered.
DYNAMIC_CODES = {
    "backlog_invalid_type", "backlog_invalid_status", "backlog_invalid_priority",
    "modified_not_found", "removed_not_found",
}
EXPECTED_DYNAMIC_SITES = 2


def emitted_codes() -> tuple:
    """Every code the tool can emit, read from its source. Returns (literal, dynamic_site_count)."""
    tree = ast.parse(TOOL_PATH.read_text(encoding="utf-8"))
    literal, dynamic = set(), 0
    for node in ast.walk(tree):
        if not (isinstance(node, ast.Call) and getattr(node.func, "id", None) == "diag"):
            continue
        if len(node.args) < 2:
            continue
        code = node.args[1]
        if isinstance(code, ast.Constant):
            literal.add(code.value)
        else:
            dynamic += 1
    return literal, dynamic


class CodeCoverageTest(unittest.TestCase):

    def test_every_emitted_code_has_a_fixture(self):
        literal, _ = emitted_codes()
        uncovered = sorted((literal | DYNAMIC_CODES) - set(CASES))
        self.assertEqual(
            uncovered, [],
            "these diagnostic codes have no fixture — add one to "
            f"tests/test_validation_codes.py: {uncovered}")

    def test_no_fixture_survives_the_code_it_tested(self):
        literal, _ = emitted_codes()
        stale = sorted(set(CASES) - (literal | DYNAMIC_CODES))
        self.assertEqual(
            stale, [],
            f"these fixtures test codes the tool no longer emits: {stale}")

    def test_the_dynamic_code_expansion_is_still_complete(self):
        _, dynamic = emitted_codes()
        self.assertEqual(
            dynamic, EXPECTED_DYNAMIC_SITES,
            "a diag() call now builds its code dynamically — expand it into "
            "DYNAMIC_CODES so it cannot go uncovered")
