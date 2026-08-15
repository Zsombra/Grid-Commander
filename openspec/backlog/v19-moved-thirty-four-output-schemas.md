---
id: v19-moved-thirty-four-output-schemas
title: v19 moved 34 output schemas and 5 input schemas — nothing has read the additions
type: question
status: open
priority: p3
created: 2026-08-15
updated: 2026-08-15
change: ""
capability: platform-mapping
github: "301"
blocked_by: []
tags: [battlegrid, v19, schemas]
---

# v19 moved thirty-four output schemas

## What

The v19.1.0 re-probe (2026-08-15) recorded, against the v18.2.0 generation:

- **114 tools, none added, none removed** — the count proved nothing again.
- **No description changed. No annotation changed.** The read/write/destructive
  split is identical.
- **5 input schemas changed**, all shrinking: `apply_strategy_plan` (−9 leaves),
  `compile_strategy_plan` (−8), `preview_strategy_report` (−2),
  `derive_strategy_rule_view` (−1), `get_strategy_column_contract` (−1).
- **34 output schemas changed.** The large growths:
  `preview_strategy_report` **+66**, `compile_strategy_plan` **+60**,
  `list_gate_blocks` **+39**, `get_agent_budget` **+27**,
  `reset_agent_drawdown_baseline` **+27**, `get_signal_log` **+17**,
  `get_public_agent_signal_log_detail` **+17**, three signal-log reads **+15**
  each. Sixteen tools shrank by 2–4 leaves.

The input shrinkages are handled: the regime keys leaving `apply` and
`preview` are `the-plan-matches-the-live-contract` (#285, landed) and
`the-preview-matches-the-live-contract` (this session). **The output additions
are read by nothing.**

## Why it matters

This is #198's lesson recurring on schedule: "outputs drift when inputs do
not", and the reason the capabilities record exists at all. The additions are
not defects — a field the product does not read costs nothing — but they are
*unexamined*, and three of the largest sit on surfaces this product already
renders (`get_agent_budget`, `list_gate_blocks`, the signal logs). Something
the platform now publishes per response may already answer a question a
backlog item is holding open.

p3 because nothing is broken; it is a survey, and the record it needs is now
committed.

## Evidence

- `docs/battlegrid-mcp-capabilities.json` at v19.1.0 vs the v18.2.0
  generation in git history — the leaf-delta sweep above was produced by a
  structural diff of the two, not by eyeballing.
- Precedent: [[the-capabilities-record-was-a-major-version-stale]] (#198),
  where 188 output leaves across 11 tools moved unseen because nothing
  compared the third record.

## Notes

The survey is cheap and mechanical: for each of the eleven tools that grew,
read the added leaves out of the record and ask whether the product's mapper
for that tool drops something now answerable. The four signal-log reads
growing by the same +15/+17 suggests one shared block was added across the
family — likely worth reading first, since it lands on four surfaces at once.

Do **not** re-probe to do this; the record is current as of 2026-08-15.
