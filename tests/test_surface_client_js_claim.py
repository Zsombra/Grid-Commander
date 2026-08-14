"""A manifest may not deny the client code its own sources carry.

"No client JS" is prose, and prose survives every re-pin unread: fourteen of
twenty-four manifests carried the denial while listing a source that opens
with 'use client' (#243). These pin the cross-check in both directions — the
denial over a client source fires naming the file; the truthful claim and the
corrected wording (which names the exception instead of denying it) stay
silent; a listed file that is absent declares nothing, because absence is the
staleness check's finding.
"""

from __future__ import annotations

import unittest

from support import openspec, ProjectTestCase

CLIENT_SOURCE = "'use client';\nexport const Perform = () => null;\n"
SERVER_SOURCE = "export const Perform = () => null;\n"


class SurfaceClientJsClaimTest(ProjectTestCase):
    def surface_claiming(self, *, body: str, notes: str):
        self.project.write("src/Perform.tsx", body)
        digest = openspec.file_digests(self.project.root, ["src/Perform.tsx"])
        self.project.surface(
            source_files=["src/Perform.tsx"], source_digest=digest, notes=notes,
            components=[{"id": "perform", "role": "display",
                         "purpose": "Submits things", "states": ["default"]}])

    def test_a_denial_over_a_client_source_fires_naming_the_file(self):
        self.surface_claiming(
            body=CLIENT_SOURCE,
            notes="No client JS: every state change is a full navigation.")
        found = self.assertCode(self.project.validate(),
                                "design_surface_denies_client_js", "warning")
        self.assertIn("src/Perform.tsx", found["message"])

    def test_the_inline_variant_fires_too(self):
        # "— no client JS, no hydration." is the constraints-array spelling.
        self.surface_claiming(
            body=CLIENT_SOURCE,
            notes="The page renders whole — no client JS, no hydration.")
        self.assertCode(self.project.validate(),
                        "design_surface_denies_client_js", "warning")

    def test_a_truthful_claim_is_silent(self):
        self.surface_claiming(body=SERVER_SOURCE, notes="No client JS.")
        self.assertNoCode(self.project.validate(),
                          "design_surface_denies_client_js")

    def test_the_corrected_wording_is_silent_over_the_same_client_source(self):
        self.surface_claiming(
            body=CLIENT_SOURCE,
            notes=("Every state change is a full navigation and the page holds "
                   "no client state; the only client code is Perform "
                   "('use client'), which reports that a submit is in flight "
                   "and nothing else."))
        self.assertNoCode(self.project.validate(),
                          "design_surface_denies_client_js")

    def test_an_absent_listed_source_declares_nothing(self):
        self.surface_claiming(body=CLIENT_SOURCE, notes="No client JS.")
        (self.project.root / "src/Perform.tsx").unlink()
        self.assertNoCode(self.project.validate(),
                          "design_surface_denies_client_js")

    def test_an_absent_source_does_not_shield_a_present_one(self):
        # The AND clause: one listed file gone, another present and declaring.
        # The absence must be skipped, not turned into a pass for the pair.
        self.project.write("src/Gone.tsx", CLIENT_SOURCE)
        self.project.write("src/Perform.tsx", CLIENT_SOURCE)
        digest = openspec.file_digests(
            self.project.root, ["src/Gone.tsx", "src/Perform.tsx"])
        (self.project.root / "src/Gone.tsx").unlink()
        self.project.surface(
            source_files=["src/Gone.tsx", "src/Perform.tsx"],
            source_digest=digest, notes="No client JS.",
            components=[{"id": "perform", "role": "display",
                         "purpose": "Submits things", "states": ["default"]}])
        found = self.assertCode(self.project.validate(),
                                "design_surface_denies_client_js", "warning")
        self.assertIn("src/Perform.tsx", found["message"])


if __name__ == "__main__":
    unittest.main()
