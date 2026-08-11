---
id: create-probes-assert-a-pre-v17-config-width
title: the create probes demand >20/>19 tradingConfig fields; v17.2 reads 18, on healthy agents everywhere
type: bug
status: done
priority: p3
created: 2026-08-11
updated: 2026-08-11
change: the-probes-catch-up-to-v17
capability: agent-authoring
blocked_by: []
tags: [live-probe, test-robustness, v17]
---

# A width the platform slimmed under the assertion

## What

The first-ever run of the create-gated probes (testing account ANBUJEFF,
19 free slots, operator-approved 2026-08-11) proved the full lifecycle live:
`create_intelligence_agent` → read-back → propose/agree edit →
`archive_intelligence_agent`, every audit row `succeeded`, throwaways cleaned
up in `finally`. The only failures were two width assertions:

- `write-probe.test.ts:361` — `Object.keys(config).length > 20`, got **18**
- `proposal-probe.test.ts:441` — `> 19`, got **18**

## Why 18 is correct, not collapsed

Undertow on account 1 — healthy, live-trading, v17.2 — reads exactly the same
**18** top-level `tradingConfig` keys (15 write-required children + the three
read-only extras `regimeAutoDerive`, `regimeTimeframe`, `strategyTimeframe`).
The thresholds encode the pre-v17 width; the v17 exit-model rewrite
(`breakEven*`/`trailing*` collapse) narrowed the shape, and these two literals
never followed. Same class as
`write-probe-thinking-pagination-assertion-too-strict` and
`radar-first-deployment-refusal-drifted` — probe expectations that lag a
platform the guards track by *schema*, not by observed width.

## Fix

Assert against the record instead of a literal: the read must carry at least
every child the recorded write schema requires (15 at v17.2), i.e. derive the
floor from `docs/battlegrid-mcp-surface.json` the way `wire-values` derives
enums — then the assertion moves when the platform does. Fold into one lite
change with the other two probe repairs.
