---
id: the-ceremony-surfaces-missed-the-role-sweep
title: Eight ceremony pages wear pre-sweep block treatments — tickets like DT-0014 are owed
type: debt
status: open
priority: p3
created: 2026-08-12
updated: 2026-08-12
change: ""
capability: app-access
github: "166"
blocked_by: []
tags: [ui, design, coverage]
---

# The ceremony surfaces missed the role sweep

## What

The 2026-08-12 surveys (backlog #157's manifests) found presentation drift the
sweeps never reached, because these pages were built before the manifests
existed or after the sweep ran:

- **agent-deploy / agent-undeploy / agent-rebind**: consequence blocks wear
  plain `border-border-default`, not the consequence role.
- **agent-edit**: the confirm's consequence block wears
  `border-consequence-border` *without* the subtle fill, and its problem
  banner lacks the "Refused:" prefix the other four ceremonies carry.
- **all four agent action rows**: `flex flex-wrap gap-3` without the archive
  page's mobile full-width stack (`w-full tablet:w-auto`).
- **strategy-archive / strategy-restore / strategy-fork**: refused and
  unreadable reason paragraphs are bare `text-sm` with role=alert — no
  danger/notice block treatment.

DT-0014 (recorder-trim) is the template: per-surface tickets restating decided
rulings — consequence role for what-would-happen blocks, danger for bounced
attempts, "Refused:" prefix, the mobile stack — with zero new decisions.

## Why it matters

p3: nothing renders wrong, and every role ruling already exists. The cost is
consistency — the confirmation pages are the product's highest-stakes screens
and currently disagree about how a consequence looks.

## Evidence

Recorded per-surface in `current_implementation` fields of the 2026-08-12
manifests: `agent-deploy-confirm`, `agent-undeploy-confirm`,
`agent-rebind-confirm`, `agent-edit`, `strategy-archive-confirm`,
`strategy-restore-confirm`, `strategy-fork-confirm` (all at commit cdecf31),
against the archive page's designed treatment in `agent-archive-confirm`.

## Notes

Deferred from the 2026-08-12 session that wrote DT-0011–DT-0015: eight more
tickets in one sitting was judged unreviewable. The work is `/design` per
surface, mechanical against DT-0004/DT-0014 precedent. Split out of #157's
close.
