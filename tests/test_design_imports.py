"""The surface source cross-check.

`source_files` is hand-assembled by an agent reading code, so an incomplete
list is the one drift the commit-based staleness check cannot see: the manifest
looks fresh while describing only part of the surface. This check closes that
gap, which makes its precision the whole point — a warning that fires on every
utility import is a warning people learn to skip.
"""

from __future__ import annotations

from support import ProjectTestCase

CODE = "design_surface_incomplete_sources"
COMPONENT = {"id": "panel", "role": "display", "purpose": "Shows rows", "states": ["default"]}


class SurfaceImportTest(ProjectTestCase):

    def survey(self, *sources: str):
        """Re-write the surface with this source list and re-validate."""
        self.project.surface(source_files=list(sources), capability="agent-authoring", components=[COMPONENT])
        return self.project.validate()


    def imports_reported(self, result) -> str:
        found = [d for d in result.diagnostics() if d["code"] == CODE]
        return found[0]["message"].replace("\\", "/") if found else ""


    # -- what it catches ---------------------------------------------------

    def test_an_imported_component_missing_from_the_list_is_reported(self):
        self.project.write("src/Panel.tsx", 'import { Row } from "./Row";\n')
        self.project.write("src/Row.tsx", "export const Row = () => null;\n")

        result = self.survey("src/Panel.tsx")

        self.assertCode(result, CODE, "warning")
        self.assertIn("src/Row.tsx", self.imports_reported(result))

    def test_view_logic_counts_as_part_of_the_surface(self):
        self.project.write("src/Panel.tsx", 'import { useThings } from "./useThings";\n')
        self.project.write("src/useThings.ts", "export const useThings = () => [];\n")

        result = self.survey("src/Panel.tsx")

        self.assertIn("src/useThings.ts", self.imports_reported(result))

    def test_a_directory_import_resolves_through_its_index_file(self):
        self.project.write("src/Panel.tsx", 'import { Row } from "./row";\n')
        self.project.write("src/row/index.tsx", "export const Row = () => null;\n")

        result = self.survey("src/Panel.tsx")

        self.assertIn("src/row/index.tsx", self.imports_reported(result))

    # -- what it deliberately ignores --------------------------------------

    def test_a_plain_utility_is_not_part_of_the_surface(self):
        self.project.write("src/Panel.tsx", 'import { format } from "./money";\n')
        self.project.write("src/money.ts", "export const format = (n) => String(n);\n")

        self.assertNoCode(self.survey("src/Panel.tsx"), CODE)

    def test_type_only_imports_are_not_part_of_the_surface(self):
        self.project.write("src/Panel.tsx", 'import type { Row } from "./Row";\n')
        self.project.write("src/Row.tsx", "export type Row = { id: string };\n")

        self.assertNoCode(self.survey("src/Panel.tsx"), CODE)

    def test_tests_and_stories_are_not_part_of_the_surface(self):
        self.project.write("src/Panel.tsx",
                           'import { fixture } from "./Panel.stories";\n'
                           'import { helper } from "./Panel.test";\n')
        self.project.write("src/Panel.stories.tsx", "export const fixture = {};\n")
        self.project.write("src/Panel.test.tsx", "export const helper = () => null;\n")

        self.assertNoCode(self.survey("src/Panel.tsx"), CODE)

    def test_bare_package_imports_are_ignored(self):
        self.project.write("src/Panel.tsx", 'import React from "react";\n')

        self.assertNoCode(self.survey("src/Panel.tsx"), CODE)

    # -- convergence -------------------------------------------------------

    def test_the_tree_is_walked_one_layer_per_survey_until_it_is_clean(self):
        """Each added file becomes a root on the next run. Reporting the whole
        transitive closure at once would drag in half the repo; reporting only
        one layer means the surveyor converges in as many passes as the tree is
        deep, and this asserts it actually terminates."""
        self.project.write("src/Panel.tsx", 'import { Row } from "./Row";\n')
        self.project.write("src/Row.tsx", 'import { Cell } from "./Cell";\n')
        self.project.write("src/Cell.tsx", "export const Cell = () => null;\n")

        first = self.survey("src/Panel.tsx")
        self.assertIn("src/Row.tsx", self.imports_reported(first))
        self.assertNotIn("src/Cell.tsx", self.imports_reported(first))

        second = self.survey("src/Panel.tsx", "src/Row.tsx")
        self.assertIn("src/Cell.tsx", self.imports_reported(second))

        third = self.survey("src/Panel.tsx", "src/Row.tsx", "src/Cell.tsx")
        self.assertNoCode(third, CODE)

    def test_a_cycle_between_components_still_converges(self):
        self.project.write("src/Panel.tsx", 'import { Row } from "./Row";\n')
        self.project.write("src/Row.tsx", 'import { Panel } from "./Panel";\n')

        self.assertCode(self.survey("src/Panel.tsx"), CODE, "warning")
        self.assertNoCode(self.survey("src/Panel.tsx", "src/Row.tsx"), CODE)

    def test_a_source_file_that_no_longer_exists_is_an_error(self):
        result = self.survey("src/Gone.tsx")

        self.assertCode(result, "design_source_file_missing", "error")
