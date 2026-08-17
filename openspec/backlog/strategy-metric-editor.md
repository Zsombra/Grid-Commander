---
id: strategy-metric-editor
title: Section contents cannot be edited — only which sections are included
type: feature
status: done
priority: p3
created: 2026-07-30
updated: 2026-08-06
change: the-inside-of-a-section-is-composable
capability: strategy-authoring
blocked_by: [strategy-section-editor]
tags: [ui]
---

# Section contents cannot be edited — only which sections are included

## What

`strategy-section-editor` adds the ability to choose which report sections a
strategy includes. It does not expose the contents of a section — the metrics,
transforms, timeframes, and per-metric parameters that make up each section
column.

BattleGrid publishes two tools for this:
- `get_metric_construction_hints({metric})` — canonical native value contract
  and transform-authoring hints for one metric
- `get_strategy_column_contract({column})` — compiles a proposed column into
  its normalized parameters, output contract, formula semantics, and null
  presentation without reading market values

Declared out of scope in `strategy-section-editor` (SL-1).

## Why it matters

Section-level selection is the outer shell of the compose surface. Metric-level
editing is the inner one — it is what determines what data a section actually
reads and how it reads it. Without it, a user can add or remove the RSI section
but cannot tune what RSI columns that section contains.

## Fix

After `list_strategy_vocabulary({category})` surfaces templates, let the user
drill into a template to see its default columns. For each column:
1. `get_metric_construction_hints({metric})` — what the metric is and how to
   configure its transforms
2. Edit transform, timeframe, window, offset → `get_strategy_column_contract`
   to validate the column before including it in the compile request

This is a deeper progressive-disclosure surface and should be its own change.

## Built — `the-inside-of-a-section-is-composable` (2026-08-06)

`/strategies/sections` lists every template the vocabulary advertises;
`/strategies/sections/[sectionKey]` opens one to the columns it renders, each
seeded into a column editor, with `get_metric_construction_hints` explaining the
metric and `get_strategy_column_contract` compiling what you compose.

Two things the fix above did not anticipate:

- **The columns were already on the wire.** `list_strategy_vocabulary`'s
  `templates[]` carry them; the mapper kept `sectionKey` and `label` and dropped
  the rest. `get_strategy_section_template` was never needed — and is recorded
  never-called, so nothing models it.
- **The composed column cannot be saved, and not for want of time.** The compile
  request closes a platform section to `{kind, sectionKey}` and carries no
  columns for it: its contents are the platform's. A column of your own travels
  only inside a `{kind: custom}` section — a table that needs a title, the
  timeframe-inertia law, the create-by-definition / modify-by-key loop, and the
  strategy's existing custom tables round-tripped. That is the remaining half
  and it is a change of its own; the surface says so on the page, the way
  `/strategies/[id]/conditions` does. **Not yet filed** — this change's report
  hands it to whoever lands these together.
