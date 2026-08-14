"""Routes without a surface manifest are named — and only those.

The firing direction lives in test_validation_codes.py with every other
code's fixture. These are the silences: a diagnostic that cannot go quiet
when coverage is complete is a nag, and one that fires on a project with no
app tree at all is reporting a stack it does not understand.
"""

from __future__ import annotations

from support import ProjectTestCase

CODE = "design_routes_uncovered"
PAGE = "export default function P() { return null; }\n"


class RouteCoverageTest(ProjectTestCase):

    def test_complete_coverage_is_silent(self):
        self.project.surface(route="/things")
        self.project.write("app/things/page.tsx", PAGE)

        self.assertNoCode(self.project.validate(), CODE)

    def test_a_project_with_no_app_tree_is_silent(self):
        self.project.surface()

        self.assertNoCode(self.project.validate(), CODE)

    def test_route_groups_do_not_hide_coverage(self):
        # `(app)` segments are routing-invisible, so a manifest naming the
        # served route must cover a page filed under a group.
        self.project.surface(route="/things")
        self.project.write("app/(main)/things/page.tsx", PAGE)

        self.assertNoCode(self.project.validate(), CODE)

    def test_a_new_uncovered_route_changes_the_report(self):
        self.project.surface(route="/things")
        self.project.write("app/things/page.tsx", PAGE)
        self.assertNoCode(self.project.validate(), CODE)

        self.project.write("app/other/page.tsx", PAGE)
        found = self.assertCode(self.project.validate(), CODE, "info")
        self.assertIn("/other", found["message"])
