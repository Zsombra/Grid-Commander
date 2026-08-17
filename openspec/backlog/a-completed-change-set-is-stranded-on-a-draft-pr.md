---
id: a-completed-change-set-is-stranded-on-a-draft-pr
title: Three archived changes and seven requirements live only on draft PR #82 — reconcile them against main
type: debt
status: done
priority: p2
created: 2026-08-15
updated: 2026-08-15
change: ""
capability: platform-mapping
github: "289"
blocked_by: []
tags: [openspec, source-of-truth, platform-mapping, battlegrid-connection, pr-82]
---

# A completed change set is stranded on a draft PR

## What

`claude/agent-creation-data-strategies-fw6av8` (draft PR #82, last touched
2026-08-11) carries 23 files that never reached `main`. Three of them are
**archived** changes — the archiver ran, which means each was implemented and
declared merged into the source of truth *on that branch only*:

- `2026-08-11-the-record-learns-the-other-three-surfaces` (delta specs for
  `platform-mapping` and `battlegrid-connection`)
- `2026-08-11-the-vocabulary-values-enter-the-record` (`platform-mapping`)
- `2026-08-11-the-probes-catch-up-to-v17` (no delta specs)

Seven requirement titles from those deltas are absent from `openspec/specs/`
on `main`, verified by exact-string search:

| Requirement | Capability |
|---|---|
| The Record Carries Every Surface The Server Declares | platform-mapping |
| Prose Surface Drift Fails The Live Freshness Guard | platform-mapping |
| The Reference Renders What The Record Carries | platform-mapping |
| The Authoring Vocabulary's Values Are Recorded | platform-mapping |
| Vocabulary Drift Fails The Live Freshness Guard | platform-mapping |
| The Platform's Declared Request Budget Is Read | battlegrid-connection |
| A Rate-Limited Request Names The Wait | battlegrid-connection |

Seven backlog items are also branch-only, so seven filed findings are currently
invisible to `board`.

## Why it matters

`openspec/specs/` is the behavior contract every later change is written
against. Where it under-describes a capability, the next `/propose` reasons from
an incomplete contract, and the archiver may re-add a conflicting requirement
under a different name without any collision being detectable. This is not an
outage — nothing in production is broken by it — which is why it is p2 and not
higher. What it costs is the spec layer's core promise.

## What is genuinely missing vs. possibly re-landed

**Do not blind-merge the branch.** `main` is 87 commits ahead of it, and some of
this work appears to have been redone since:

- **Request budget — absent from `main` entirely.** No match for
  `requestBudget|request-budget|retryAfter` anywhere in `src/` or `tests/`.
  `tests/connection/request-budget.test.ts` exists only on the branch.
- **Prose/vocabulary freshness — partially present under other names.** `main`
  has `tests/live/surface-freshness.test.ts` and
  `tests/live/signal-vocabulary-probe.test.ts`, both matching `prose|vocabulary`.
  The overlap needs reading before anything is merged; the requirement titles
  differ, so string search cannot settle it.

## Evidence

- Branch tip preserved at tag `archive/claude/agent-creation-data-strategies-fw6av8`
  and on the open PR #82.
- Branch-only files: `git diff --name-only main...origin/claude/agent-creation-data-strategies-fw6av8`
  or `comm -23` of the two `ls-tree` listings — 23 paths.
- Requirement absence: `grep -rF "<title>" openspec/specs/` returns nothing for
  all seven titles listed above (checked 2026-08-15).
- `openspec/changes/archive/` on `main` holds ten `2026-08-11-*` changes; none
  of the three named above.

## Notes

Found during the 2026-08-15 branch reconciliation, which pruned 65 branches and
110 refs. Every other branch in the repo was provably absorbed into `main`; this
was the **only** one carrying unmerged content, which is what makes it worth a
p2 rather than getting lost in the sweep.

Deliberately not resolved in that session — the operator scoped the session to
pruning and chose to give this its own session.

## Done when

- The three archived changes are read against `main` and each requirement is
  either merged into `openspec/specs/` or explicitly declined with a reason.
- The request-budget behavior is either implemented on `main` or filed as its
  own item and dropped from this one.
- The seven branch-only backlog items are re-filed on `main` (each with its
  mirrored issue) or declined.
- PR #82 is closed or merged — it should not remain open as a draft holding the
  only copy of anything.

## Reconciled 2026-08-15 — every requirement declined with a reason, four items carry the residue

All three archived changes read in full against `main` and the known platform
state (two deployments have passed since they were written). **No requirement
merged; all seven declined**, on two distinct grounds:

| Requirement | Disposition |
|---|---|
| The Authoring Vocabulary's Values Are Recorded | **Superseded** — `main`'s "The Vocabulary's Values Are Recorded Verbatim" (`platform-mapping/spec.md:329`) carries the same substance via `docs/battlegrid-vocabulary.json` + `tools/probe_vocabulary.py` |
| Vocabulary Drift Fails The Live Freshness Guard | **Superseded** — "A Values-Only Deployment Fails A Named Gate" (`platform-mapping/spec.md:366`); the live gate compares values directly, per category |
| The Record Carries Every Surface The Server Declares | **Declined as unbuilt** — `main`'s dump carries instructions verbatim but prompt/resource *lists* only; a spec must not claim unbuilt behavior. Residue → [[the-prose-record-carries-lists-where-the-platform-declares-bodies]] (#294) |
| Prose Surface Drift Fails The Live Freshness Guard | **Declined as unbuilt** — no live prose comparison exists on `main`. Residue → #294 |
| The Reference Renders What The Record Carries | **Declined as unbuilt** — `generate_mcp_reference.py:14` still loads-and-discards instructions; no bodies rendered. Residue → #294 |
| The Platform's Declared Request Budget Is Read | **Declined as unbuilt** — zero budget code on `main`. Residue → [[the-request-budget-is-published-and-discarded]] (#292) |
| A Rate-Limited Request Names The Wait | **Declined as unbuilt** — same. Residue → #292 |

The third change (`the-probes-catch-up-to-v17`) carried no requirements
(`skip_specs`); its three assertion repairs were checked individually against
`main`'s rebuilt 31-file probe suite — two of the three stale assertions no
longer exist, one survives (below).

**Request budget**: filed as its own item and dropped from this one
([[the-request-budget-is-published-and-discarded]], #292, full scope — the
branch's reading half never reached `main`; the tag holds it as reference).

**The seven branch-only backlog items**: three re-filed (still true on
`main`), four declined (the problem no longer exists here):

| Branch item | Disposition |
|---|---|
| the-feasibility-advisory-is-unread | **Re-filed** (#291) — still no reader in `src/`; re-priced p2 → p3 because the v15 dials item that lent it urgency is done on `main` |
| the-request-budget-is-published-and-discarded | **Re-filed** (#292) — full scope |
| write-probe-thinking-pagination-assertion-too-strict | **Re-filed** (#293) — the exact assertion still lives at `tests/live/write-probe.test.ts:575` |
| three-quarters-of-the-mcp-surface-is-unrecorded | **Declined, residue consolidated** into #294 — instructions + lists landed on `main` independently (capture_mcp_dump + version-agreement sweep) |
| create-probes-assert-a-pre-v17-config-width | **Declined** — the `>20`/`>19` width literals no longer exist in `main`'s probes |
| radar-first-deployment-refusal-drifted | **Declined, doubly obsolete** — the platform now *accepts* first deployments via `expectedRevision: null` (`main`'s radar-probe establishes it live, slot-shuffle test), and the describe-step refusal in `deploy-agent.command.ts` is gone with it |
| the-probe-failure-path-is-untested | **Declined** — it describes `fetch_prompts`/`fetch_resources` in `probe_mcp_surface.py`, code that exists only on the branch; `main`'s probe never fetches prose surfaces |

**PR #82**: annotated tag `archive/claude/agent-creation-data-strategies-fw6av8`
created at its head (`9c60e93`) and pushed — the prune session's convention;
the branch was the only one it deliberately did not tag. PR closed with the
disposition; remote branch deleted after tagging. The archived change folders
remain readable on the tag; they were deliberately **not** imported into
`main`'s archive, because their delta specs claim requirements this
reconciliation declined, and an archive folder whose deltas never merged here
would read as though they had.

One observation recorded, not filed: `main`'s live vocabulary gate compares
three value classes of the ~8 keys each category carries (`metrics`/`templates`
drift under an unchanged version would pass); the spec scopes it with "at
least" deliberately. Noted inside #294, whose digest mechanism would close
both if built.
