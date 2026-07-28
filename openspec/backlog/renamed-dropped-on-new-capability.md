---
id: renamed-dropped-on-new-capability
title: A RENAMED delta against a new capability is silently discarded
type: bug
status: done
priority: p2
created: 2026-07-27
updated: 2026-07-27
change: fix-renamed-on-new-capability
capability: harness-integrity
blocked_by: []
tags: [harness, spec-layer, archive]
---

# A RENAMED delta against a new capability is silently discarded

## What

When a delta contains `## RENAMED Requirements` for a capability that has no
main spec yet, the rename is dropped. Nothing reports it — not validation, not
the archive, not the operation list. The change archives successfully and the
rename simply never happened.

Two guards should have caught it and neither does:

- `build_merged_spec` refuses `MODIFIED`/`REMOVED`/`RENAMED` on a capability it
  is creating, but tests `delta.sections.get(op)`. Rename pairs are parsed into
  `doc.renames`, and `sections["RENAMED"]` is left an **empty list** — falsy, so
  the guard passes.
- `validate_change` only checks rename sources and targets when a main spec
  already exists (`if main_exists and not main.find(old)`), so there is nothing
  to report against.

`delta_count()` counts the rename, so `empty_delta` does not fire either.

## Why it matters

Silent is the problem, not wrong. A rename that errors is a two-minute fix; a
rename that vanishes leaves the delta claiming one thing and the source of
truth saying another, and the change is archived — so the delta is gone and
nobody can see what was meant.

Renaming a requirement in a capability's *first* change is unusual, which is
why this has not bitten yet, and also why it will be confusing when it does.

## Evidence

```
sections: {'ADDED': 1, 'RENAMED': 0}
renames : [('Nothing', 'Something')]
delta_count: 2
ops: ['create gadgets: + Delta']   <- the rename is absent
```

`.claude/tools/openspec.py:1115` (the guard) and `:1059` (the validation).

Pinned by `tests/test_archive_abort.py::test_a_rename_in_a_new_capability_is_not_silently_dropped`,
marked `@unittest.expectedFailure`. Fixing the tool without removing that marker
will fail the suite, which is the intended nudge.

## Notes

Either fix works and they are not exclusive:

- Make the new-capability guard check `delta.renames` alongside `sections`.
- Add a validation error for `RENAMED` when the capability has no main spec —
  better, because it fails at `/propose` time rather than at archive.

Prefer the validation error. The merge guard is a backstop and, as
`merge-conflict-unreachable` records, backstops in this tool are unreachable by
design once validation covers the case.
