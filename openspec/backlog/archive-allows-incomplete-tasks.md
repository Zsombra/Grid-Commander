---
id: archive-allows-incomplete-tasks
title: Archive merges a change whose tasks are untouched
type: debt
status: done
priority: p1
created: 2026-07-28
updated: 2026-07-28
change: ""
capability: spec-validation
blocked_by: []
tags: [harness, archive]
---

# Archive merges a change whose tasks are untouched

## What

`archive_change()` blocks only on `severity == "error"` diagnostics from
`validate_change()`. Task progress is not one of them — the only task-related
diagnostic is `no_tasks`, a warning that fires when `tasks.md` exists but has
no checkboxes. A change with `0/12` tasks complete archives cleanly: the delta
merges into `openspec/specs/` and the folder moves to the dated archive.

## Why it matters

Archiving is the moment a delta becomes the behaviour contract — it asserts
that the system now does what the requirement says. Doing that with the
implementation checklist untouched writes a claim into the source of truth
that no code backs. Nothing downstream re-checks it, because everything
downstream reads `openspec/specs/` *as* the truth.

The tool's stated job is that "is this change ready?" is a computation, not a
judgment call. Right now the readiness of the actual work is the one part left
to judgment.

## Evidence

Reproduced 2026-07-28. Change with `tasks.md` containing two unchecked boxes:

```
$ openspec.py archive c1
  create cap: + R

dry run — re-run with --apply to write 1 spec file(s) and archive.
$ echo $?
0
```

No warning, no mention of `0/2`.

Code: `.claude/tools/openspec.py:1163` (`archive_change`, error-only gate),
`:1067` (the `no_tasks` warning, the only task check in `validate_change`).

## Notes

An error is too strong — a change can legitimately reach archive with a task
left unticked because it turned out to be unnecessary, and a hard block there
teaches people to tick boxes to get past the tool, which is worse than the
gap.

Suggested shape:

- `validate_change` emits a **warning** `tasks_incomplete` with the `done/total`
  count whenever `done < total`. It then shows in `board` HEALTH and in CI.
- `archive` refuses on incomplete tasks unless `--force` is passed, and names
  the count in the refusal. Distinct from the validation severity on purpose:
  a warning that does not stop anything is the situation we already have.

`render_status` and `next_action` already compute `progress()`; this is a
consumer of existing data, not new parsing.

Check the archiver skill at the same time — it should be reading the count and
stopping, and if it is not, the instruction needs the same fix as the tool.

## Outcome (2026-07-28)

`archive_change` now refuses when `done < total`, with `--allow-incomplete` as
an explicit override. Error code `tasks_incomplete`, naming the progress.

**Checked at archive, not in `validate_change`.** A change under active
development is *expected* to have unfinished tasks; making that a validation
error would turn `board` and CI red for the normal case. Archiving is the
single moment the delta becomes the behavior contract, so that is where the
checklist has to be finished. `test_validate_does_not_report_incomplete_tasks`
pins the layering so nobody "fixes" it by moving the check.

The override exists so the gate is never a dead end — a remaining task that
genuinely does not apply should not be a reason to stop using the tool. It is a
flag rather than a config key so the decision is visible in the command.

`total == 0` is left alone: `no_tasks` already warns, there is no progress to
read, and inventing a refusal there would block every change whose tasks.md is
prose.
