"""A surface's freshness is decided by content, not by history.

`generated_at_commit` decided it until 2026-08-13, and half the manifests
pinned to commits that no longer existed — squash-merge discards the branch
commits a manifest names. `git diff` fails the same way for "that commit is not
here" as it succeeds for "nothing changed", so twelve surfaces had been unable
to go stale, silently, for as long as their pins had dangled.

These pin the replacement: a per-file digest, and the two states it must keep
apart — checked-and-fresh from never-checked-at-all.
"""

from __future__ import annotations

import unittest

from support import openspec, ProjectTestCase


class SurfaceDigestTest(ProjectTestCase):
    def surface_with(self, body: str, **fields):
        """A surface describing one real file, digested as it stands."""
        self.project.write("src/thing.tsx", body)
        self.project.system()
        path = self.project.surface(source_files=["src/thing.tsx"], **fields)
        return path

    def digest_now(self, files):
        return openspec.file_digests(self.project.root, files)

    # -- decided by content ------------------------------------------------

    def test_a_described_file_changing_is_stale(self):
        self.surface_with("original\n")
        digest = self.digest_now(["src/thing.tsx"])
        self.project.surface(source_files=["src/thing.tsx"], source_digest=digest)
        self.project.write("src/thing.tsx", "edited\n")
        result = self.project.validate()
        found = self.assertCode(result, "design_surface_stale", "warning")
        self.assertIn("src/thing.tsx", found["message"])

    def test_unchanged_content_is_fresh(self):
        self.surface_with("original\n")
        digest = self.digest_now(["src/thing.tsx"])
        self.project.surface(source_files=["src/thing.tsx"], source_digest=digest)
        self.assertNoCode(self.project.validate(), "design_surface_stale")

    def test_a_commit_that_never_existed_does_not_make_it_stale(self):
        """The whole point. The commit check could not answer this at all."""
        self.surface_with("original\n")
        digest = self.digest_now(["src/thing.tsx"])
        self.project.surface(
            source_files=["src/thing.tsx"],
            source_digest=digest,
            generated_at_commit="deadbee",  # never existed anywhere
        )
        self.assertNoCode(self.project.validate(), "design_surface_stale")

    def test_line_endings_alone_are_not_a_change(self):
        """A checkout convention is not a change to what a surface describes."""
        self.project.write("src/thing.tsx", "a\nb\nc\n")
        self.project.system()
        digest = self.digest_now(["src/thing.tsx"])
        (self.project.root / "src/thing.tsx").write_bytes(b"a\r\nb\r\nc\r\n")
        self.project.surface(source_files=["src/thing.tsx"], source_digest=digest)
        self.assertNoCode(self.project.validate(), "design_surface_stale")

    def test_reordering_source_files_is_not_a_change(self):
        self.project.write("src/a.tsx", "a\n")
        self.project.write("src/b.tsx", "b\n")
        self.project.system()
        digest = self.digest_now(["src/a.tsx", "src/b.tsx"])
        self.project.surface(
            source_files=["src/b.tsx", "src/a.tsx"], source_digest=digest
        )
        self.assertNoCode(self.project.validate(), "design_surface_stale")

    def test_a_described_file_that_vanished_is_stale_and_named(self):
        self.surface_with("original\n")
        digest = self.digest_now(["src/thing.tsx"])
        self.project.surface(source_files=["src/thing.tsx"], source_digest=digest)
        (self.project.root / "src/thing.tsx").unlink()
        found = self.assertCode(self.project.validate(), "design_surface_stale", "warning")
        self.assertIn("src/thing.tsx", found["message"])

    # -- never verified ----------------------------------------------------

    def test_no_digest_is_never_verified_rather_than_fresh(self):
        self.surface_with("original\n")
        self.project.surface(source_files=["src/thing.tsx"])
        result = self.project.validate()
        self.assertCode(result, "design_surface_never_verified", "warning")

    def test_never_verified_is_not_reported_as_stale(self):
        """Both would be claims about a comparison that did not happen."""
        self.surface_with("original\n")
        self.project.surface(source_files=["src/thing.tsx"])
        self.project.write("src/thing.tsx", "edited\n")
        self.assertNoCode(self.project.validate(), "design_surface_stale")

    def test_a_surface_describing_nothing_is_neither(self):
        """No source files is not the same as no digest — it claims nothing."""
        self.project.system()
        self.project.surface(source_files=[])
        result = self.project.validate()
        self.assertNoCode(result, "design_surface_never_verified")
        self.assertNoCode(result, "design_surface_stale")


if __name__ == "__main__":
    unittest.main()
