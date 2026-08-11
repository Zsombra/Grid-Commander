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

## Observed 2026-08-11 — present on every position, one value seen

`list_user_active_positions` live: 8 open positions across two agents,
rows of 38 keys, and **every row carries both fields as plain strings** —
`breakEvenStatus: "ACTIVE"`, `trailingStatus: "ACTIVE"`, all eight
identical. So the fields are real and populated, but the observation is
one value deep:

- The rest of the vocabulary is unobserved — whatever the platform says
  for armed-but-not-yet-tracking, triggered/completed, or
  management-disabled states has not been seen.
- Both agents on the board have position management enabled; the
  disabled-management case (fields absent? a DISABLED value?) could not
  be observed.

That is enough to build the honest version: render the platform's words
verbatim beside the resting-order legs on the exposure surface
("break-even ACTIVE · trailing ACTIVE"), absent renders nothing, and any
value this product has never seen renders as itself — no enum is
modelled from a single observed member. The richer treatment (explaining
what a state *means*) waits for vocabulary the platform has not yet
shown.
