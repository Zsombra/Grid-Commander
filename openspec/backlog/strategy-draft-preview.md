---
id: strategy-draft-preview
title: A draft section selection cannot be previewed against live market data
type: feature
status: done
priority: p3
created: 2026-07-30
updated: 2026-08-01
change: "the-draft-is-previewable"
capability: strategy-authoring
blocked_by: [strategy-section-editor]
tags: [ui]
---

# A draft section selection cannot be previewed against live market data

## What

`preview_strategy_report` (read-only, open-world) renders a bounded live-market
preview for a draft report without saving or mutating strategy state. It returns
`renderedSections`, `estimatedTokenCount`, `budgetUsage`, and a `rankScopingNote`.

`derive_strategy_rule_view` takes draft sections and optional sparse rules,
returns canonical default allocations and non-destructive suggestions for how
signal rules relate to the sections — also without persisting anything.

Neither is called by this product. Declared out of scope in
`strategy-section-editor` (SL-2 and SL-3).

## Why it matters

A user composing a section change is working blind — they know what BattleGrid's
vocabulary says a section does, but not what it would actually produce on their
active coins. The preview is the evidence-before-commitment that makes the
compose step something other than guessing.

`derive_strategy_rule_view` is complementary: the signal rules a strategy applies
are defined relative to its sections, and changing sections may make existing
rules inconsistent. The view shows the suggested canonical allocations for the
draft sections before the user compiles.

## Fix

After the section checklist is built (in `strategy-section-editor`), a "Preview"
action calls `preview_strategy_report` with the current draft sections and a
bounded coin selection. The preview is shown inline or in a drawer — it does not
replace the compose form. A "Suggested rules" panel calls `derive_strategy_rule_view`
and displays the canonical allocations for the user to accept or override before
compiling.

Both calls are effect-free and can be made as many times as the user wants
before committing to a compile.

## Done (2026-08-01)

`the-draft-is-previewable` (archived): `/strategies/[id]/preview` renders
the strategy's current composition as the report text an agent receives —
live, bounded coin selection, token estimate with the counting model,
budget gauges, and `derive_strategy_rule_view`'s membership summary (which
signals the composition feeds). Live-proven on Dunkirk: 5 sections, ~1393
tokens (o200k_base), 12/82 signals in report. The remaining slice — a
*draft-composer* preview for not-yet-applied section selections — needs the
edit page to carry a draft in the URL and is recorded in the change's
out-of-scope note.
