---
id: validate-change-metadata
title: Nothing validates .openspec.yaml, so a typo'd track silently drops ceremony
type: debt
status: done
priority: p2
created: 2026-07-28
updated: 2026-07-28
change: ""
capability: spec-validation
blocked_by: []
tags: [harness, validation]
---

# Nothing validates .openspec.yaml, so a typo'd track silently drops ceremony

## What

`Change.__init__` coerces an unrecognised `track` to `standard` and moves on.
No diagnostic is emitted, and `validate` has no check that covers
`.openspec.yaml` at all — a missing file is also `standard` by default.

`track: ful` therefore runs as `standard`: `design.md`, `plan/master-plan.md`,
the review scaffolds, and the decision log all report `n/a`, planner and
auditor never run, and the production gate never happens. `status` prints
`track: standard` and `validate` says clean.

Two smaller gaps in the same area:

- **Bare `validate` fails on a repo with no active change.** `resolve_change`
  dies with `no active changes in openspec/changes/`, exit 1 — so the obvious
  command produces an error on a perfectly healthy repo. `validate --all` is
  the working spelling, which is why CI is unaffected.
- **A delta with no capability directory is accepted.** `specs/spec.md`
  instead of `specs/<capability>/spec.md` yields capability `"."`; archive
  plans `create .: + R` and would write `openspec/specs/spec.md`, which is not
  a capability and is not reachable by `main_spec_path`.

## Why it matters

The track is the whole ceremony decision. Full track exists for contracts,
migrations, and security work — the changes where skipping the audit is the
expensive mistake. A silent downgrade means the one thing the author did to
raise the stakes is the thing that gets dropped, and every downstream signal
agrees the change is fine.

`validate` failing on a clean repo is smaller but corrosive in the same way:
it trains readers that a red exit code from this tool is not necessarily real.

## Evidence

Reproduced 2026-07-28.

```
$ printf 'track: ful\n' > openspec/changes/c1/.openspec.yaml
$ openspec.py status c1
Change: c1   track: standard
$ openspec.py validate c1
clean — no issues found.
```

```
$ openspec.py validate          # repo with specs but no active change
error: no active changes in openspec/changes/
$ echo $?
1
```

Code: `.claude/tools/openspec.py:250` (`Change.__init__`, the silent coerce),
`:907` (`resolve_change`), `:893` (`capability_of`), `:1616` (the
`args.all or not args.change` branch that decides what a bare run covers).

## Notes

- Error `change_invalid_track` naming the value and the three valid ones.
  Keep the coerce so the rest of the run still works — report, do not crash.
- Warning `change_no_meta` when `.openspec.yaml` is absent, stating that
  `standard` is being assumed. The proposer writes this file; its absence
  means something skipped a step.
- Error `delta_not_in_capability_dir` when `capability_of` returns `"."`.
- Make bare `validate` mean "validate everything" when there is no active
  change, instead of erroring. Keep the current message for the genuinely
  ambiguous case — several active changes and no name given.

All four are in `validate_change` / `main()` and need no new parsing. Fold the
`.openspec.yaml` cases into the same pass that reads `track`.

## Outcome (2026-07-28)

All three gaps closed.

**Track.** `Change` keeps `track_declared` alongside the coerced `track`, so
validation can tell "not stated" from "stated wrong". An unrecognised value is
now `invalid_track` (error); a `.openspec.yaml` with no track is
`track_not_declared` (warning); a missing file is `change_meta_missing`
(warning). The error is deliberate — the track is the whole ceremony decision,
and a silent downgrade drops exactly the rigour the author asked for.

**Bare `validate` on a repo with no active change.** Now validates main specs,
backlog, and design and exits 0 instead of dying in `resolve_change`. Nothing
is wrong with a repo where everything is archived; the obvious command should
not report failure on it.

**Delta with no capability directory.** `specs/spec.md` yields capability `"."`
and archive would write `openspec/specs/spec.md` — not a capability, never read
back by `main_spec_path`. Now `delta_without_capability` (error), so archive
refuses.
