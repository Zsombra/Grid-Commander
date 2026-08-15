---
id: dt-0011-no-longer-covers-the-row-it-styled
title: agent-roster gained eight states since DT-0011 styled it, and the ticket covers none of them
type: debt
status: open
priority: p3
created: 2026-08-15
updated: 2026-08-15
change: ""
capability: agent-authoring
github: "274"
blocked_by: []
tags: [design, tickets, state-coverage]
---

# DT-0011 no longer covers the row it styled

## What

The #237 re-survey (2026-08-15) brought the `agent-roster` manifest back in
line with `src/presentation/components/agent-roster.tsx`, and the honest
consequence is eight `design_state_not_covered` warnings on **DT-0011**
(`implemented`): the drift that staled the manifest had added the
deployment-standing vocabulary (`holding-position`,
`slot-held-not-scanning`), the unscanned-market line, and the
resolution-note family (`not-qualifying` with and without a platform
reason, `cooldown`, `regime`, `unrecognised-section`) — and the ticket
styles none of them.

## Why it matters

p3, same argument as every state-coverage warning: nothing renders wrong —
the new lines are plain text in the row and legible. The cost is a design
that "looks broken exactly when users notice": the row's most
information-dense lines (why an agent is not qualifying, what market sits
unscanned) are the ones no design round has seen.

The warning count moved 14 → 21 with this re-survey. That is the system
working — one dishonest stale warning became eight honest coverage rows —
but 8 standing warnings become scenery exactly the way #237's single one
did, which is why this item exists: the deferral is filed once, here.

## What would settle it

A `/design agent-roster` round covering the eight states (or a DT-0011
revision). Pure restyle territory — no behavior change; the constraints in
the refreshed manifest (verbatim platform tokens, null-resolution renders
nothing) are the veto lines the round must keep.

## Evidence

- `python3 .claude/tools/openspec.py validate --all` — the eight
  `design_state_not_covered` rows on `openspec/design/tickets/DT-0011.json`
- `openspec/design/surfaces/agent-roster.json` — re-pinned at `042266a`
  with the full state list
- `openspec/backlog/agent-roster-has-been-stale-for-four-rounds.md` (#237)
  — predicted exactly this: "if the drift that staled it added a state, the
  ticket is now incomplete and design_state_not_covered will say so"
