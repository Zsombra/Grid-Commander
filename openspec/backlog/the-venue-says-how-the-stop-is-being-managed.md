---
id: the-venue-says-how-the-stop-is-being-managed
title: v17 positions reads carry breakEvenStatus and trailingStatus — live position-management state, unread
type: feature
status: open
priority: p3
created: 2026-08-11
updated: 2026-08-11
change: ""
capability: agent-understanding
github: "134"
blocked_by: []
tags: [battlegrid, v17, positions, exposure]
---

# The venue says how the stop is being managed

## What

BattleGrid v17.2.0 grew `list_user_active_positions` and
`list_session_agent_positions` by per-position `breakEvenStatus` and
`trailingStatus` (additive, no removals). Together with the same
deployment's redesign of the management vocabulary (`breakEvenTriggerR`,
`trailingGivebackPct`), the platform now *reports* what the management
engine is doing to each open position, not just what it was configured to
do.

## Why it matters

The exposure surface just learned to say whether a protective order rests
at the venue at all (`the-stop-that-exists-only-in-software`). The next
honest sentence is whether break-even and trailing are armed, tracking, or
done for the position in front of you — the difference between "a stop is
configured" and "the stop has already been moved to protect the entry".
This is the platform's own statement of it, which is the only version this
product renders.

## Evidence

- Declared-schema diff v16.0.0 → v17.2.0 in
  `docs/battlegrid-mcp-capabilities.json` (regenerated 2026-08-11): both
  positions reads +8 leaves, fields `breakEvenStatus`, `trailingStatus`.
- Values unobserved: the account's open positions at probe time did not
  have the fields' possible values recorded. Enum-or-string is
  unestablished.

## Notes

First step is observation on live open positions (values, and whether the
fields appear on positions whose agent has management disabled). Then it
belongs on the exposure read alongside `RestingProtection`, rendered where
the position is.
