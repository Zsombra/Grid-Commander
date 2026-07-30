---
id: strategy-section-editor
title: A strategy can be edited only by its tagline
type: feature
status: in-progress
priority: p2
created: 2026-07-27
updated: 2026-07-30
change: "strategy-section-editor"
capability: strategy-authoring
blocked_by: []
tags: [ui]
---

# A strategy can be edited only by its tagline

## What

`author-strategies` delivered the compile → review → apply pipeline complete:
compiling, the review screen with blast radius and changed axes, local refusal of
expired and superseded plans, the confirmation carrying BattleGrid's own summary,
the projection onto the apply plan, and applying. The editor above it composes
one field.

Declared out of scope in the proposal and recorded as SL-9.

## Why it matters

Report sections are what a strategy mostly *is* — ten categories and 61 metrics,
each with construction hints and a column contract, discovered progressively.
Until they can be composed, the pipeline is exercised on a change nobody
particularly wants to make.

## Fix

A section editor driven by the discovery chain: `list_strategy_categories` →
`list_strategy_vocabulary({category})` → `get_metric_construction_hints({metric})`
→ `get_strategy_column_contract({column})`, with `preview_strategy_report` and
`derive_strategy_rule_view` for draft-only guidance.

Nothing about the pipeline changes — `compilePlan` already takes an arbitrary
request object. This is a composing surface, and the interesting design question
is progressive disclosure over 61 metrics without guessing at any of them.
