# Proposal: The Import Cross-Check Stops Matching Nothing

## Why

`design_surface_incomplete_sources` is the guard that keeps a surface
manifest's `source_files` complete, and it has never matched anything here:
`IMPORT_RE` captures only relative specifiers, this codebase imports through
the `@/` alias (23 relative vs 337 alias imports), so `missing_imports` is
always empty and the ui-surveyor's "run it until it is quiet" is satisfied
vacuously (#230). Measuring the fix found a **second hole the item never
named**: this project imports with `.js` specifiers that resolve to `.ts`
files (the toolchain-wide `extensionAlias` convention), and the resolver
appends extensions to the full name — so even a *relative* `./actions.js`
resolves to nothing. The check was blind twice over, and its own fixtures
use extension-less specs, which is why the suite never saw either.

The cost is measured, not hypothetical: an honest run reports **six
omissions across five manifests today**, five of them
`carried-problem.tsx` — the shared banner every carried refusal renders
through. A change to that one component would stale `agent-archive-confirm`
and silently miss `strategy-editor`.

## What Changes

- **The resolver learns the project's own conventions, from the project's
  own files.** Path aliases are read from `tsconfig.json`'s
  `compilerOptions.paths` (JSONC-stripped, never hard-coded — a hard-coded
  `@/` is the same one-step-behind assumption); `.js`/`.jsx` specifiers
  resolve through the extension rewrite the toolchain applies. `IMPORT_RE`
  captures any specifier; bare package imports stay ignored.
- **The check degrades rather than disappears** when the conventions cannot
  be read: no tsconfig, or no `paths`, still checks relative imports.
- **Fixtures prove the check fires** — an alias import and a `.js`-specifier
  import of an unlisted UI file each produce
  `design_surface_incomplete_sources`. This is the part the item calls more
  important than the fix.
- **The five under-listing manifests are corrected** (six files added,
  digests re-pinned, prose read).
- **Routes with no manifest are named**: a new aggregate INFO diagnostic
  (`design_routes_uncovered`) reports how many `app/**/page.tsx` routes no
  manifest's `route` covers — 22 of 46 today — and `openspec.py design`
  lists them. INFO, not WARNING: at 22 standing rows a warning would drown
  the health count and teach people to skip it; the signal is the set
  changing. With a fixture, per "Every Validation Code Is Covered By A
  Fixture".

## Capabilities

**New**: none
**Modified**: `harness-integrity` — two ADDED requirements (the cross-check
resolves the project's import conventions; uncovered routes are named)

## Out of Scope

- **Surveying the 22 uncovered routes.** Naming them is this change; writing
  22 manifests is design-lane work the INFO now makes visible.
  `the-new-agent-form-has-no-surface` (#the item for /agents/new) stays open
  and is not duplicated.
- **Widening `_is_ui_file`.** `actions.ts` modules and plain logic files
  stay outside the check's demand-list by the existing view-logic heuristic;
  changing that policy is its own question. Deliberately not filed — the
  heuristic is working as designed.
- **Transitive closure.** The one-layer walk stays; adding a missing file
  makes it a root on the next run, per the check's own design.

## Impact

- `.claude/tools/openspec.py` — `IMPORT_RE`, `_resolve_import`,
  `local_ui_imports`, one new diagnostic, `design` command output
- `tests/test_design_imports.py` — alias + extension fixtures;
  `tests/test_validation_codes.py` picks up the new code automatically
- `openspec/design/surfaces/{agent-edit,agent-roster,strategy-conditions-save,strategy-editor,strategy-rule-editor}.json`
  — six files added, re-pinned
- `openspec/specs/harness-integrity/spec.md` — via archive merge
