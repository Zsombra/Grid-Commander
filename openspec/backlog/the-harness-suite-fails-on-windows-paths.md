---
id: the-harness-suite-fails-on-windows-paths
title: Six harness tests fail on Windows because the tool reports paths with backslashes
type: bug
status: open
priority: p2
created: 2026-08-13
updated: 2026-08-13
change: ""
capability: harness-integrity
github: "196"
blocked_by: []
tags: [testing, windows, cross-platform, pre-existing]
---

# Six harness tests fail on Windows

## What

`python3 -m unittest discover -s tests` — the `harness+validate` gate in
`scripts/ci.sh` — fails six tests on Windows:

```
test_archive_abort   test_a_dry_run_reports_the_operations_and_writes_nothing
test_design_imports  test_a_cycle_between_components_still_converges
test_design_imports  test_a_directory_import_resolves_through_its_index_file
test_design_imports  test_an_imported_component_missing_from_the_list_is_reported
test_design_imports  test_the_tree_is_walked_one_layer_per_survey_until_it_is_clean
test_design_imports  test_view_logic_counts_as_part_of_the_surface
```

All the same cause. The tool composes diagnostic messages with native
separators, so a message reads `src\useThings.ts` and the assertion looks for
`src/useThings.ts`:

```
AssertionError: 'src/useThings.ts' not found in
  'a-surface: 1 UI file(s) imported by this surface are not in source_files
   — src\useThings.ts'
```

## Why it matters

p2, and it is the gate rather than the product. The tool works — the paths it
names are correct for the platform. What is broken is that **this gate cannot
pass on Windows**, and this repository is developed on Windows. A gate that is
always red is a gate nobody reads, and the six failures sit alongside real ones
with nothing distinguishing them.

CI runs Linux, so the suite is green there and the breakage is invisible to it.

## Evidence

Established as **pre-existing** on 2026-08-13 while landing
`a-manifest-pins-to-what-it-described`: the same six failed with that change
stashed and unstashed, identically. They are not that change's doing, and the
two it *did* break (`design_surface_stale`'s fixture and the code-coverage
check) were fixed there.

## Notes

**Fix shape**: report repo-relative paths with forward slashes in diagnostics —
one normalisation where the message is composed, not six changed assertions.
The messages are read by humans and asserted by tests; `/` is right for both,
and it is what every other path in the tool's output already uses.

Worth checking whether any other Windows-only difference hides behind this once
it clears — six failures is enough noise to have masked more.
