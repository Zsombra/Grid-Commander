---
id: the-source-completeness-check-matches-no-import-here
title: The check that keeps surface source lists complete matches no import in this codebase
type: risk
status: open
priority: p2
created: 2026-08-14
updated: 2026-08-14
change: ""
capability: harness-integrity
github: "230"
blocked_by: []
tags: [design, surfaces, staleness, vacuity, tooling]
---

# The check that keeps surface source lists complete matches no import in this codebase

## What

`design_surface_incomplete_sources` is the guard that stops a manifest from
under-listing what it describes. The ui-surveyor skill leans on it directly:

> Do not assemble it from memory. Validation cross-checks it against the actual
> import graph. … add what it names and run it again until it is quiet.

**It is always quiet, and it has never matched anything.** `IMPORT_RE`
(`.claude/tools/openspec.py:771-776`) matches only *relative* specifiers —
`./x`, `../x`. This codebase imports through the `@/` path alias:

```
UI imports across app/ + src/presentation:   relative = 23   alias (@/) = 337
```

`local_ui_imports()` returns the empty set for `/pending/[id]`, a page with nine
imports. It returns the empty set for essentially every surface. So
`missing_imports` is always empty, the warning never fires, and "run it until it
is quiet" is satisfied vacuously on the first run.

Every `source_files` list in `openspec/design/surfaces/` is therefore
hand-maintained with **no verification of any kind**.

## What it already cost

`src/presentation/components/perform-button.tsx` was listed by **none of the
twenty-four manifests**, while fifteen surfaces render `<PerformButton>` — since
#224, which is when the component started carrying the pending treatment on
every ceremony surface in the product.

The consequence is precise: **a change to `perform-button.tsx` staled nothing.**
The one component that decides how every perform submit looks while it is
working was invisible to staleness detection, and a design agent could have
designed against a manifest that was silently wrong about it.

DT-0027's round only caught this by luck. It also edited `control.ts`, which
*is* listed, so seventeen surfaces went stale for a different reason and the
missing file was noticed while re-pinning them. Had the round touched only
`perform-button.tsx`, `validate` would have reported a clean, fresh board.

Fixed opportunistically during that re-survey: the file is now listed on all
fifteen surfaces that render it. **The check that should have caught it is still
vacuous**, which is why this item exists rather than being closed by that fix.

## Why it matters

p2. Nothing is broken for users, and the manifests are currently accurate. The
risk is structural and it is the kind this repo has been bitten by twice.

`file_digests` was rewritten (#192) precisely because commit-hash pinning
"could not go stale, silently" under squash-merge. This is the same failure one
layer up: the digest check is sound, but it only hashes files somebody
remembered to list, and the guard meant to police that list does nothing. A
staleness system that is correct about the files it knows and blind to the rest
reports *fresh* — the answer that stops anyone looking.

It is also self-concealing. A missing source file produces no warning, no
failure, and no output at all. The only way to find it is to do what was done
here: notice by accident, then read the regex.

## What would settle it

Teach `_resolve_import` the project's path aliases. `tsconfig.json` already
declares them (`paths`), so the mapping can be read rather than hard-coded — a
hard-coded `@/` would be the same class of assumption one step along.

Then run `validate --all` and expect it to be **loud**: every manifest is
currently unverified, so the first honest run will name real omissions across
many surfaces. That noise is the finding, not a regression.

**Add a test that the check is not vacuous.** This is the part that matters more
than the fix — the same lesson `controls.test.ts` records about its own scanners
("a regex that stopped matching reports a clean tree by finding nothing in
it"). A fixture importing a known UI file through the alias must produce a
`design_surface_incomplete_sources` diagnostic; without it, the next refactor
can silence the check again exactly as invisibly.

## Evidence

- `.claude/tools/openspec.py:771-776` — `IMPORT_RE`, three alternatives, all
  anchored on `['"](\.{1,2}/...)`. No alias branch.
- `.claude/tools/openspec.py:809-838` — `local_ui_imports`, whose result feeds
  `missing_imports`
- `.claude/tools/openspec.py:964-972` — the warning that consequently never fires
- Measured: `local_ui_imports(root, ['app/(app)/pending/[id]/page.tsx',
  'src/presentation/components/control.ts'])` → `set()`
- Measured: 23 relative vs 337 alias imports across `app/` + `src/presentation`
- `.claude/skills/ui-surveyor/SKILL.md` §5 — the instruction that relies on it
- `tsconfig.json` — `paths`, where the alias is already declared

## Notes

Found while re-surveying the manifests DT-0027 staled, by asking why
`perform-button.tsx` appeared in no `source_files` when fifteen surfaces render
it. Related to [[a-manifest-pins-to-what-it-described]] (#192), which fixed the
digest half of the same guarantee.
