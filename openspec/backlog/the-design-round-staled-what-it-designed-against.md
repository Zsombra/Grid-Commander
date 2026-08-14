---
id: the-design-round-staled-what-it-designed-against
title: Seven surveyed surfaces are stale and the design lane aims at old targets
type: debt
status: done
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

## Resolution (2026-08-14)

All seven re-surveyed and re-pinned at `28bbb27` — deliberately after
`a-bounced-reason-survives-the-agent-editor` (#255) landed and was committed,
so one pass captured the refusal round's mounts, the fork pre-flight (#102),
AND #255's reconciliation; re-pinning against committed content only, per the
surveyor's rule. None of the drift was cosmetic: every manifest needed prose
corrections, the sharpest being agent-reactivate-confirm, whose prose still
claimed one-branch-only mounting and "not in CARRY_PROBLEM" while the code
mounted per-branch and the pin list held it — a digest refreshed without its
prose, which is its own small lesson. `validate --all` shows zero
`design_surface_stale` for the seven; agent-roster (#237) alone remains, as
intended. Two artifacts of the survey: gap filed as
[[the-edit-bounce-carries-money-nothing-refills]] (#260), and DT-0004 now
reads `design_state_not_covered` for the archive page's new
`refused-with-problem` state — the ticket is incomplete for a state that now
exists, which is the flag doing its job; it waits for the design lane.

## Related

- [[agent-roster-has-been-stale-for-four-rounds]] (#237) — the eighth
  surface, tracked separately and longer.
- [[the-edit-bounce-carries-money-nothing-refills]] (#260) — found by this
  re-survey.
