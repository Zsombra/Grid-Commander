---
id: the-re-pin-pins-to-the-commit-before-its-own-edits
title: Four manifests pin to the parent of the commit that staled them — the re-pin was squashed together with its own code edits
type: debt
status: open
priority: p3
created: 2026-08-13
updated: 2026-08-13
change: ""
capability: app-access
github: "192"
blocked_by: []
tags: [ui, design, coverage, process, squash-merge]
---

# The re-pin pins to the commit before its own edits

## What

Four surface manifests report `design_surface_stale`:

```
agent-reactivate-confirm   1 source file changed since e7c56ce
recorder-trim              1 source file changed since e7c56ce
strategy-conditions-save   1 source file changed since 6562791
strategy-rule-editor       1 source file changed since e7c56ce
```

All four went stale in **the same commit**, `94bd854` ("the re-pin belongs at
the end of a design round", #184) — the commit whose entire subject is fixing
when a re-pin should happen.

`e7c56ce` is the **direct parent** of `94bd854`. So the re-pin wrote
`generated_at_commit: e7c56ce` — correct against the tree it measured — and the
same squashed commit then edited the four pages those manifests describe. The
pins point one commit behind the code.

What the commit edited is small and real: `<CarriedProblem />` added to render
branches the widened banner guard had just caught.

```
app/(app)/agents/[id]/reactivate/page.tsx           | 2 ++
app/(app)/recorder/trim/page.tsx                    | 3 +++
app/(app)/strategies/[id]/conditions/save/page.tsx  | 3 ++-
app/(app)/strategies/[id]/rules/[signalId]/page.tsx | 5 +++--
```

Its own gate line reads *"Zero stale surfaces"*, and that was true when
measured — before the branch's later edits joined it under one squash.

## Why it matters

p3, and it is the **structural** half rather than the four warnings.

#184 established that a re-pin is necessarily a second commit, because a
manifest pins to a commit hash and the hash of the commit being written does
not exist yet. That reasoning is written into design-contract §8, the
ui-surveyor skill, the design-director's checklist and CLAUDE.md.

**Squash-merge defeats it.** However many commits a branch separates the re-pin
from the code into, `main` receives one — and the re-pin inside it necessarily
names that commit's parent. So the convention as written is unreachable through
this repo's own merge strategy, which is how the exact failure it describes
reappeared inside the commit that describes it.

This is the fourth guard-with-a-hole of the same shape: a rule written against
the one example in front of it, correct for that example, silent one step out.

## Evidence

```
$ git rev-parse --short 94bd854^
e7c56ce

$ git log --oneline e7c56ce..HEAD -- "app/(app)/recorder/trim/page.tsx"
94bd854 fix: the re-pin belongs at the end of a design round (#184)

$ python3 .claude/tools/openspec.py validate --all
WARNING design_surface_stale: agent-reactivate-confirm  … since e7c56ce
WARNING design_surface_stale: recorder-trim             … since e7c56ce
WARNING design_surface_stale: strategy-conditions-save  … since 6562791
WARNING design_surface_stale: strategy-rule-editor      … since e7c56ce
```

Found by the 2026-08-13 verification sweep, while closing #173 — the twelve
manifests that item covered are all correctly re-pinned (`grep -l cdecf31` →
0), so these four are a later and different cause and would have been buried by
that closure.

## Notes

**Two halves, and the second is the one worth having.**

1. **The bookkeeping.** Re-survey the four. Cheap, and it clears the warnings.
2. **The convention.** Decide what a re-pin means under squash-merge. Candidates,
   none obviously right:
   - Re-pin in a **follow-up commit on `main`** after the merge — restores the
     two-commit shape the reasoning requires, at the cost of a commit whose only
     content is four hashes.
   - Let the freshness check **tolerate a pin at `HEAD~1`** when the only
     changed files are ones the manifest already lists — narrow, and it weakens
     the one measurement the check exists to make.
   - **Accept the lag** and say so in design-contract §8, so the next reader
     meets a documented one-commit skew instead of rediscovering it.

Do not settle this by bumping `generated_at_commit` by hand — the same reason
#173 refused that fix. Freshness is measured, not asserted.

Related: [[the-ceremony-manifests-went-stale-the-day-they-were-written]] (#173,
done — the twelve this is *not*), [[a-design-round-stales-the-manifests-it-designed-against]]
(#179, the round-level version of the same structure).
