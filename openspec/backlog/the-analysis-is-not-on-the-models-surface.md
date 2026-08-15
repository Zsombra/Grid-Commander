---
id: the-analysis-is-not-on-the-models-surface
title: A model can read the record but must re-derive the forward returns itself
type: feature
status: open
priority: p3
created: 2026-08-15
updated: 2026-08-15
change: ""
capability: mcp-control
github: "283"
blocked_by: []
tags: [mcp-control, parity, signals]
---

# The analysis is not on the model's surface

## What

`/recorder/analysis` renders forward returns per signal state with sample
sizes (`the-record-answers-forward`). The product's MCP surface was
deliberately not widened: a model holding `read_signal_history` can
re-derive the analysis (which is what #94 called "a model-side workflow"),
but it does not get the product's own figures — with the gap-exclusion
discipline and sample sizes already applied — the way the operator does.

## Why it matters

Parity is the MCP surface's convention (`read_trade_story`, `read_loss_shape`
both followed their pages). A model re-deriving risks skipping exactly the
disciplines the product enforces: pairing across gaps, and sorting by the
interesting column.

## What would settle it

A lite change following the `read_loss_shape` shape: a `read_forward_returns`
tool wrapping `ReadForwardReturnsQuery`, the description carrying the two
disciplines in the contract, registry pin 26 → 27, probe call added.

## Notes

Filed 2026-08-15 as the Out of Scope residue of `the-record-answers-forward`.
