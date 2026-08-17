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

    # -- the project's own import spellings --------------------------------
    #
    # Both of these are how the check spent its whole life matching nothing
    # here (#230): this codebase imports through the `@/` alias (337 alias
    # vs 23 relative imports) and with `.js` specifiers that name `.ts`
    # files. Every fixture above uses extension-less relative specs, so the
    # suite proved a check that worked on a project shaped unlike this one.

    def test_an_alias_import_resolves_through_tsconfig_paths(self):
        self.project.write("tsconfig.json",
                           '{"compilerOptions": {"paths": {"@/*": ["./src/*"]}}}\n')
        self.project.write("src/Panel.tsx", 'import { Row } from "@/Row";\n')
        self.project.write("src/Row.tsx", "export const Row = () => null;\n")

        result = self.survey("src/Panel.tsx")

        self.assertCode(result, CODE, "warning")
        self.assertIn("src/Row.tsx", self.imports_reported(result))

    def test_a_js_specifier_resolves_to_the_ts_file_that_emitted_it(self):
        self.project.write("src/Panel.tsx", 'import { Row } from "./Row.js";\n')
        self.project.write("src/Row.tsx", "export const Row = () => null;\n")

        result = self.survey("src/Panel.tsx")

        self.assertIn("src/Row.tsx", self.imports_reported(result))

    def test_alias_and_extension_rewrite_compose(self):
        # The shape this repository actually writes on every page:
        # `import { X } from '@/presentation/x.js'` naming an `x.tsx`.
        self.project.write("tsconfig.json",
                           '{"compilerOptions": {"paths": {"@/*": ["./src/*"]}}}\n')
        self.project.write("src/Panel.tsx", 'import { Row } from "@/Row.js";\n')
        self.project.write("src/Row.tsx", "export const Row = () => null;\n")

        result = self.survey("src/Panel.tsx")

        self.assertIn("src/Row.tsx", self.imports_reported(result))

    def test_a_jsonc_tsconfig_still_yields_the_aliases(self):
        self.project.write("tsconfig.json",
                           '{\n'
                           '  // the alias, commented the way tsconfig.json really is\n'
                           '  "compilerOptions": {"paths": {"@/*": ["./src/*"]}}\n'
                           '}\n')
        self.project.write("src/Panel.tsx", 'import { Row } from "@/Row";\n')
        self.project.write("src/Row.tsx", "export const Row = () => null;\n")

        result = self.survey("src/Panel.tsx")

        self.assertIn("src/Row.tsx", self.imports_reported(result))

    # -- degradation: the check narrows, it never disappears ---------------

    def test_no_tsconfig_still_checks_relative_imports(self):
        self.project.write("src/Panel.tsx",
                           'import { Row } from "@/Row";\n'
                           'import { Cell } from "./Cell";\n')
        self.project.write("src/Row.tsx", "export const Row = () => null;\n")
        self.project.write("src/Cell.tsx", "export const Cell = () => null;\n")

        result = self.survey("src/Panel.tsx")

        reported = self.imports_reported(result)
        self.assertIn("src/Cell.tsx", reported)
        self.assertNotIn("src/Row.tsx", reported)

    def test_a_malformed_tsconfig_degrades_the_same_way(self):
        self.project.write("tsconfig.json", "{not json at all\n")
        self.project.write("src/Panel.tsx",
                           'import { Row } from "@/Row";\n'
                           'import { Cell } from "./Cell";\n')
        self.project.write("src/Row.tsx", "export const Row = () => null;\n")
        self.project.write("src/Cell.tsx", "export const Cell = () => null;\n")

        result = self.survey("src/Panel.tsx")

        reported = self.imports_reported(result)
        self.assertIn("src/Cell.tsx", reported)
        self.assertNotIn("src/Row.tsx", reported)

    def test_an_alias_import_of_a_plain_utility_is_ignored(self):
        self.project.write("tsconfig.json",
                           '{"compilerOptions": {"paths": {"@/*": ["./src/*"]}}}\n')
        self.project.write("src/Panel.tsx", 'import { format } from "@/money";\n')
        self.project.write("src/money.ts", "export const format = (n) => String(n);\n")

        self.assertNoCode(self.survey("src/Panel.tsx"), CODE)

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


class UncheckedStackTest(ProjectTestCase):
    """A stack the cross-check cannot read says so instead of staying silent."""

    UNCHECKED = "design_surface_sources_unchecked"

    def test_a_surface_with_no_js_family_sources_reports_the_gap(self):
        self.project.write("app/views/panel.html.erb", "<h1>Rows</h1>\n")
        self.project.surface(
            source_files=["app/views/panel.html.erb"], components=[COMPONENT]
        )
        result = self.project.validate()
        self.assertCode(result, self.UNCHECKED, "info")

    def test_a_js_surface_stays_silent_about_the_gap(self):
        self.project.write("src/Panel.tsx", "export const Panel = () => null;\n")
        self.project.surface(source_files=["src/Panel.tsx"], components=[COMPONENT])
        result = self.project.validate()
        codes = [d["code"] for d in result.diagnostics()]
        self.assertNotIn(self.UNCHECKED, codes)

    def test_a_missing_source_is_the_louder_fact(self):
        # When the file does not exist at all, the error owns the story; the
        # info about an unchecked stack would just be noise beside it.
        self.project.surface(
            source_files=["app/views/gone.html.erb"], components=[COMPONENT]
        )
        result = self.project.validate()
        codes = [d["code"] for d in result.diagnostics()]
        self.assertNotIn(self.UNCHECKED, codes)
