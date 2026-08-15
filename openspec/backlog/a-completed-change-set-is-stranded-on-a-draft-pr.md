---
id: a-completed-change-set-is-stranded-on-a-draft-pr
title: Three archived changes and seven requirements live only on draft PR #82 — reconcile them against main
type: debt
status: open
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
