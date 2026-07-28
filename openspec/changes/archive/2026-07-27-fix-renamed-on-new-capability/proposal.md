# Proposal: Catch a rename against a capability that has no main spec

## Why

A `## RENAMED Requirements` section in a delta for a capability with no main
spec is silently discarded. The change validates clean, archives successfully,
and the rename never happens — see `renamed-dropped-on-new-capability`.

Both guards that should have caught it miss:

- `validate_change` only checks rename sources and targets `if main_exists`, so
  a new capability has nothing checked against it.
- `build_merged_spec` refuses `MODIFIED`/`REMOVED`/`RENAMED` when creating a
  capability, but tests `delta.sections.get(op)`. Rename pairs are parsed into
  `doc.renames` and `sections["RENAMED"]` is left an empty list — falsy, so the
  guard passes.

`delta_count()` counts the rename, so `empty_delta` does not fire either. The
delta ends up claiming something the source of truth does not say, and the
change is archived, so the delta is gone and nobody can reconstruct what was
meant.

## What Changes

- Validation reports an error when a delta renames a requirement in a
  capability that has no main spec. A capability's first change can only ADD.
- The merge guard checks `delta.renames` as well as `delta.sections`, so a
  divergence between the two checks fails loudly instead of dropping work.
- The `@unittest.expectedFailure` marker pinning the bug is replaced by a test
  that asserts the fix.

## Capabilities

**Modified**: `spec-validation` — one added requirement. Renaming is only
meaningful against something that already exists, and saying so is the same
promise the capability already makes about broken deltas being caught when they
are proposed rather than when they are archived.

## Out of Scope

- The unreachable `merge_conflict` branch. Filed as `merge-conflict-unreachable`
  and deliberately kept; this change makes one more condition reach it, which is
  the point of a backstop.
- Reworking how `RENAMED` is parsed. Putting rename pairs in `doc.renames`
  rather than `doc.sections["RENAMED"]` is what made the guard miss, but
  changing that shape now would touch the merge, validation, and `delta_count`
  for no behavioral gain.

## Impact

`.claude/tools/openspec.py` — one new validation code, `renamed_no_main_spec`,
and one added condition in the merge guard. `tests/` gains a fixture for the new
code; the coverage meta-test fails until it does.
