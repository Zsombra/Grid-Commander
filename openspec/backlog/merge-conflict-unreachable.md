---
id: merge-conflict-unreachable
title: The merge_conflict diagnostic cannot be produced by any CLI input
type: debt
status: done
priority: p3
created: 2026-07-27
updated: 2026-08-06
change: ""
capability: harness-integrity
blocked_by: []
tags: [harness, spec-layer, archive]
---

# The merge_conflict diagnostic cannot be produced by any CLI input

## What

`archive_change` wraps `build_merged_spec` in a try/except that turns a
`ValueError` into a `merge_conflict` diagnostic. Every condition that raises
that `ValueError` is already an **error**-level validation code, and archive
runs validation first and aborts on errors — so the except branch is
unreachable from the command line.

| `build_merged_spec` raises | already caught by |
|---|---|
| `MODIFIED '<name>' not found` | `modified_not_found` |
| `REMOVED '<name>' not found` | `removed_not_found` |
| `RENAMED '<name>' not found` | `renamed_not_found` |
| `ADDED '<name>' already exists` | `added_already_exists` |
| `<OP> requires an existing main spec` | `no_main_spec` |

The one gap in that table is `RENAMED` on a new capability, and there the merge
does not raise either — see `renamed-dropped-on-new-capability`.

## Why it matters

Low. This is defence in depth doing its job: validation is a superset of the
merge's preconditions, which is exactly the relationship you want between a
check and the operation it guards.

It is filed because it is invisible otherwise. Someone will eventually notice
the branch has no natural test, and the choice then is between deleting a
correct backstop and writing a contrived test — better to have already decided.

## Evidence

`.claude/tools/openspec.py:1173` — the `except ValueError` in `archive_change`.

`tests/test_validation_codes.py` covers the code by forcing `build_merged_spec`
to raise, and `tests/test_archive_abort.py::test_the_merge_guards_refuse_a_capability_with_no_main_spec`
covers the guards directly. Both say in comments why they are contrived.

## Notes

Keep the branch. The two checks are written independently and the merge is what
actually touches `openspec/specs/` — a divergence introduced later should fail
loudly rather than corrupt the source of truth.

What would make this reachable, and worth revisiting if either lands:

- Validation and merge parsing the main spec at different times (a concurrent
  edit between the two passes).
- A future `--force` or `--skip-validation` flag on archive.

---

# Decided 2026-08-06 — keep the branch, and this is the record of deciding

Reviewed with nothing new to add: the analysis above is complete and correct,
and the situation has not moved. Validation remains a superset of the merge's
preconditions, so the `except ValueError` in `archive_change` is still
unreachable from the command line, and still worth keeping.

**The decision is the one the item's own Notes reached: keep it.** Recorded
explicitly so the next person to notice the branch has no natural test finds an
answer rather than the question again — which is the whole reason this was
filed rather than left invisible.

The two things that would make it reachable are unchanged and worth re-reading
if either lands:

- validation and merge parsing the main spec at different times (a concurrent
  edit between the two passes)
- a future `--force` or `--skip-validation` flag on archive

Neither exists. Both are the kind of change whose author should be sent here.

Closing as `done` rather than leaving it open: an open item implies work
outstanding, and there is none — the correct action was to decide, and the
decision is *no change*. `tests/test_validation_codes.py` and
`tests/test_archive_abort.py` keep the branch covered, both saying in comments
why they are contrived.
