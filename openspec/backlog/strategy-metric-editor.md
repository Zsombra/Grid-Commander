---
id: strategy-metric-editor
title: Section contents cannot be edited — only which sections are included
type: feature
status: open
priority: p3
created: 2026-07-30
updated: 2026-07-30
change: ""
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
