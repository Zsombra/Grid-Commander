---
id: eleven-surfaces-have-never-been-verified
title: Eleven surface manifests have never been verified and cannot be until they are re-surveyed
type: debt
status: done
priority: p3
created: 2026-08-13
updated: 2026-08-13
change: ""
capability: app-access
github: "197"
blocked_by: []
tags: [ui, design, coverage, never-verified]
---

# Eleven surfaces have never been verified

## What

`a-manifest-pins-to-what-it-described` (#192) replaced commit-based staleness
with a per-file content digest. Thirteen manifests could be migrated honestly —
their recorded commit still resolved, so the digest was taken from the content
they actually described.

**Eleven could not.** Their commits were destroyed by squash-merge, so what they
described is unrecoverable:

```
agent-archive-confirm   explorer-evaluation   pending-queue
agent-roster            explorer-field        pipeline-evaluation
audit-log               pending-proposal      strategy-catalog
connect                 explorer-competitor
```

They now report `design_surface_never_verified` — not fresh, not stale, because
both would be claims about a comparison that never happened.

## Why it matters

p3. Nothing renders wrong; these are records about records.

The cost is coverage that reads as present and is not. Each of the eleven is a
surface a design round could be run against, and none of them can currently tell
you whether it still describes the code. Before #192 they reported *fresh* —
confidently, and on no evidence at all. Now they report the truth, which is the
improvement, but the truth is that eleven surfaces are undescribed.

**The trap to avoid**: back-filling a digest from the files as they now stand.
That records today's content as though it had been surveyed and converts an
unverifiable surface into a confidently wrong one — the exact failure #192 was
about. The validator refuses to do it and so should anyone reading this.

## What would settle it

Eleven `ui-surveyor` passes, one per surface — a real read of each surface's
code, not a digest written by hand. They are independent and can be done in any
order or in parallel. `connect`, `agent-roster` and `strategy-catalog` are the
most-visited and worth doing first.

Each pass ends with a digest, and from then on the surface is checkable forever
— the digest survives squash, rebase and a fresh clone.

## Evidence

```
$ python3 .claude/tools/openspec.py validate --all | grep never_verified | wc -l
11
```

Related: [[the-re-pin-pins-to-the-commit-before-its-own-edits]] (#192, done —
this is the debt its fix made visible).

## Done 2026-08-13 — all eleven, and five had gaps a digest could not have caught

Every one re-surveyed against its actual code. **24 of 24 manifests now carry a
digest**; `never_verified` is zero.

Five carried an **incomplete `source_files`**, which matters more than the
staleness they were missing: a file the manifest does not list cannot make it
stale, digest or no digest. This is the one drift no freshness mechanism can
see, and it is why the surveyor skill makes completeness a hard rule.

| surface | what was missing | why it renders |
|---|---|---|
| `agent-roster` | `fleet-spend.tsx`, **and the component itself** | the page renders `<FleetSpend>` |
| `pending-queue` | `carried-problem.tsx` | added by #174, never recorded |
| `agent-archive-confirm` | `carried-problem.tsx` | added by #174, never recorded |
| `pending-proposal` | `carried-problem.tsx`, `ports/proposals.ts` | `OPERATIONS[…].label` is rendered |
| `pipeline-evaluation` | `ports/strategies.ts` | `SIMULATION_SIGNAL_CAP` is rendered |
| `explorer-field` | `ports/explorer.ts` | `FIELD_SORTS`/`FIELD_WINDOWS` render the option lists |

`agent-roster` is the sharpest: the manifest described neither the component nor
its file, so `FleetSpend` was invisible to the design layer entirely.

Two state corrections: `connect` treated `?declined=` and `?error=` as exclusive
when both render together, and `agent-roster` gained `fleet-spend`'s three
states — an amount, a null total that is **not** zero, and unreadable.

`audit-log`, `explorer-competitor`, `explorer-evaluation` and `strategy-catalog`
needed no correction. Verified and digested.

## What is left, and it is not this

Three surfaces are **stale** — `agent-reactivate-confirm`,
`strategy-conditions-save`, `strategy-rule-editor`. That is honest drift with a
named file each, not the silence this item was about. They are a design-round
concern now.
