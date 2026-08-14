---
id: the-design-round-staled-what-it-designed-against
title: Seven surveyed surfaces are stale and the design lane aims at old targets
type: debt
status: open
priority: p3
created: 2026-08-14
updated: 2026-08-14
change: ""
capability: ""
github: "259"
blocked_by: []
tags: [design, surfaces, stale]
---

# Seven surveyed surfaces are stale and the design lane aims at old targets

## What

`validate --all` reports `design_surface_stale` on eight surfaces; seven have
no backlog item. The eighth — agent-roster — is [[agent-roster-has-been-stale-for-four-rounds]]
(#237), which this item deliberately does not duplicate.

The seven: agent-archive-confirm, agent-edit, agent-reactivate-confirm,
strategy-conditions-save, strategy-editor (two files), strategy-fork-confirm,
strategy-rule-editor.

## Evidence

Two sources of drift, both journaled and neither filed until now:

- The refusal round's banner mounts — the 2026-08-14 (roads) entry flagged
  "eight `design_surface_stale` warnings are this round's — the design lane
  should re-pin", and no item was filed. The deferral survived two further
  sessions unrecorded, which is exactly the failure mode the backlog exists
  to prevent.
- This session's fork pre-flight deepened strategy-fork-confirm's drift
  (`app/(app)/strategies/[id]/fork/page.tsx`, change
  `a-taken-name-is-refused-before-it-is-sent`).

## Why it matters

The design contract (§8) makes re-pinning the round's own last task because a
ticket authored against a stale manifest aims at UI that no longer exists —
its acceptance lines cannot be checked against the code that is actually
there.

## First step when taken

Run `/surface` across the seven (one ui-surveyor pass), or confirm
per-surface that the drift is cosmetic and re-pin. Nothing here blocks
feature work; it blocks the next *design* round.

## Related

- [[agent-roster-has-been-stale-for-four-rounds]] (#237) — the eighth
  surface, tracked separately and longer.
