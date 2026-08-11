---
id: an-evaluation-explains-its-conditions-now
title: v17 gave get_signal_log a conditionEvaluation block — the evidence behind every skip, unread
type: feature
status: open
priority: p3
created: 2026-08-11
updated: 2026-08-11
change: ""
capability: agent-understanding
github: "133"
blocked_by: []
tags: [battlegrid, v17, signals, pipeline]
---

# An evaluation can explain its conditions now

## What

BattleGrid v17.2.0 grew `get_signal_log`'s declared output by a whole
`conditionEvaluation` block (~102 schema leaves, purely additive): per
condition an `outcome` with `conditionKey`, `sectionKey`, `evidence`,
`op`/`operand`/`literal`, `header`/`text`, `kind`, `name`, `required` and
`provisional`; beside them `counts` (`total`, `trueCount`,
`unresolvedCount`) and `decidedBy`.

That is the strategy's own conditions, evaluated one by one with their
evidence, attached to the evaluation that had consequences. The product
renders evaluations on the pipeline and scorecard pages today and can say
*that* an agent skipped; this block is the platform saying *which clause
decided it and on what evidence*.

## Why it matters

"Why didn't it trade?" is the question the pipeline surface exists for,
and the current answer stops at gate blocks and aggregate scores. A
per-condition verdict with evidence is the missing bottom layer — and it
is exactly the kind of read this product prefers: the platform's own
stated reason, rendered, never derived.

## Evidence

- Declared-schema diff v16.0.0 → v17.2.0, recorded in
  `docs/battlegrid-mcp-capabilities.json` (regenerated 2026-08-11):
  `get_signal_log` +102 leaves, no removals.
- The shape is declared; no live evaluation has been read for it yet —
  observed shape unestablished, which is the first step before modelling.

## Notes

First step is a live read of a real evaluation's `conditionEvaluation`
(both a traded and a skipped one) to establish what the platform actually
populates — v15's trade-level policy taught that a declared axis can be
inert. Model only after observing. Belongs beside the signal-log read in
the pipeline surface.
