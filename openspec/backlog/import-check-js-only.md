---
id: import-check-js-only
title: Surface source cross-check only understands JS-style imports
type: debt
status: done
priority: p3
created: 2026-07-27
updated: 2026-07-31
change: the-small-debts-sweep
capability: ""
blocked_by: []
tags: [harness, design-layer]
---

# Surface source cross-check only understands JS-style imports

## What

`design_surface_incomplete_sources` resolves relative `import`/`require`
statements in `.tsx/.jsx/.ts/.js/.vue/.svelte/.astro`. On any other stack it
finds nothing and stays silent.

## Why it matters

Silence reads identically to "the list is complete". On a Python, Go, or Rails
UI the check provides zero coverage while appearing to pass, which is worse
than an explicit "not supported here".

## Evidence

`.claude/tools/openspec.py` — `local_ui_imports()`, `IMPORT_RE`, `UI_EXTS`.

## Notes

Two options, do the first regardless:

1. **Say so.** When a surface's `source_files` contain no JS-family files, emit
   an info diagnostic that the cross-check did not run. Cheap and honest.
2. **Extend it.** Python (`from .x import`), Blade/ERB partial includes. Only
   worth it once a real project needs it — do not build this speculatively.

Also unbuilt: a repo-wide sweep for UI files belonging to no surface at all.
That needs a `ui_globs` config key and risks false positives in a large repo.

## Closed

Fixed in `the-small-debts-sweep` (2026-07-31), option 1 as the item prescribed: a surface whose sources contain no JS-family files gets an info diagnostic (`design_surface_sources_unchecked`) instead of silent non-coverage; suppressed when a missing-file error already owns the story. Extension to other stacks stays not-built, per the item.
