---
id: fix-archive-merge-integrity
title: Archive merge silently corrupts the source of truth on name collisions
type: bug
status: open
priority: p0
created: 2026-07-28
updated: 2026-07-28
change: ""
capability: spec-validation
blocked_by: []
tags: [harness, archive, data-loss]
---

# Archive merge silently corrupts the source of truth on name collisions

## What

`build_merged_spec()` keys every operation on the requirement *name* and looks
it up with `SpecDoc.find()`, which returns the first match. Nothing checks that
a name is targeted once, or that it is unique. Two distinct corruptions follow,
and `validate` reports **clean** for both.

**1. Overlapping operations on one requirement destroy a neighbour.**
Edits are collected as `(start, end, replacement)` line ranges against the
*original* main spec, then applied in reverse start order. When the same
requirement appears under two operation sections, two edits share a start
offset. The first splices the line range; the second then writes into a range
that no longer means what it meant when it was computed, and overwrites
whatever moved into it.

**2. Duplicate names are merged in and never flagged.**
Two `### Requirement: Thing` blocks under `## ADDED Requirements` both append.
The main spec then holds two requirements with one name, and every future
MODIFIED, REMOVED, or RENAMED silently targets only the first.

## Why it matters

`openspec/specs/` is the source of truth and the archive merge is the only
thing that writes it. Both failures are silent, exit 0, and produce a
plausible-looking spec — there is no error to notice and no diff to review
after the fact, because the dry run reports the same wrong plan the apply
executes. This is the one failure mode the system cannot recover from cheaply,
and it is the reason `add-harness-regression-tests` is P1.

## Evidence

Reproduced against a scratch fixture on 2026-07-28.

Main spec with two requirements — `Login`, `Logout`. Delta REMOVES `Login`
(with a Reason) and MODIFIES `Login` in the same file:

```
$ openspec.py validate t1
clean — no issues found.

$ openspec.py archive t1 --apply
  auth: - Login
  auth: ~ Login
archived to openspec/changes/archive/2026-07-28-t1/
```

Resulting `openspec/specs/auth/spec.md` contains the modified `Login` — and
**`Logout` is gone.** It was never mentioned by the delta.

Duplicate-name case: a delta with two `### Requirement: Thing` blocks under
ADDED validates clean and lands both; `grep -c "^### Requirement: Thing"` on
the merged spec returns 2.

Code: `.claude/tools/openspec.py:1102` (`build_merged_spec`), `:1145` (the
reverse-sorted splice loop), `:227` (`SpecDoc.find`, first match wins).

## Notes

Three guards, all in `validate_change` so the failure is caught before archive
rather than during it:

1. **One operation per requirement per delta.** Collect names across ADDED /
   MODIFIED / REMOVED / RENAMED-from; any name appearing twice is an error.
2. **Unique names within a delta section**, and within a main spec — add the
   main-spec check to `validate_main_specs` so an already-corrupted spec is
   visible rather than inert.
3. **Assert non-overlap in `build_merged_spec`** before splicing, and raise
   `ValueError` — `archive_change` already converts that into a clean abort
   with nothing moved. Belt and braces: validation can be bypassed by editing
   a delta after the check, the merge itself cannot.

Do not "fix" this by making the second edit win. Ambiguity about which
operation the author meant is the bug; the tool should refuse, not guess.

## Still open on the test suite branch

Verified 2026-07-28 against `claude/work-review-next-steps-clb36a` (PR #3),
which closes `add-harness-regression-tests` with 124 harness tests including
`tests/test_archive_merge.py` and `tests/test_archive_abort.py`. **Both
reproductions above still fail there, byte for byte.** So this is not a
main-only defect that the test branch has already fixed, and it should not be
closed by merging PR #3.

The near-miss is worth understanding before writing the fix, because it is
what a reasonable test suite already got wrong once:

```python
def test_multiple_operations_do_not_disturb_each_others_line_ranges(self):
    """Edits are applied bottom-up. Applied top-down instead, every range
    after the first would be off by the length of the edit before it."""
```

That test names exactly the property this item violates, and it passes. It
uses MODIFIED `Gamma` + REMOVED `Alpha` + ADDED `Delta` — **three different
requirements**, so the three line ranges are disjoint and bottom-up ordering
is sufficient. The defect lives in the case the test does not construct: two
operations on the *same* requirement, where the ranges are identical rather
than disjoint and application order cannot save either one.

Add the fixture as `test_two_operations_on_one_requirement_are_refused`
directly alongside it, so the pair reads as the general case and its
exception.

Same lesson for the meta-test PR #3 describes, which reads the diagnostic
codes out of the source with `ast` and fails on any code no fixture triggers:
that guarantees every code that *exists* is exercised, and by construction can
never surface a code that was never written. Coverage of the codes is not
coverage of the failure modes.
