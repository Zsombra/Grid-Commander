# Proposal: The Column Grammar Is Learnable

## Why

Phase 1, change 2 of the assistant roadmap. The signal vocabulary shipped;
beneath it sits the layer the operator called the highest-impact part of the
whole application: the metrics and transforms a strategy's report columns are
built from, and the grammar that governs which combinations are legal.

The discovery read (2026-08-01, three probes) established the platform
publishes all of it:

- **`list_strategy_vocabulary`** carries a full `metrics` index this product
  has been dropping — 76 metrics, each with label, family, native output
  contract (kind/unit/precision/range), timeframe mode, and legal transform
  ids. The mapper read only `templates` from this payload.
- **`get_metric_construction_hints`** explains each transform per metric:
  parameters with defaults and descriptions, the actual formula, calculation
  summary, null behavior, operand requirements, chain successors.
- **`get_strategy_column_contract`** compiles a proposed column without
  touching market data. A valid column answers with its normalized form,
  effective parameters, output contract, formula, glossary, and null
  presentation. **A refused column teaches**: `VALIDATION_ERROR` with an
  authoring code, the offending path, the received value, and an
  `allowedDomain` naming exactly what is legal there — observed live: spread
  on RSI14 names the six unit-commensurable oscillators and says why.

That refusal structure is the find. The platform teaches its own grammar
through this tool, and a surface that preserves it — rather than flattening
it to "invalid" — is what closes the gap for users and gives a future
assistant its ground truth.

## What Changes

- **Port reads**: `listMetrics` (the vocabulary's metric index),
  `metricHints(metric)` (per-transform authoring detail), and
  `columnContract(column)` — returning either the contract or the
  **structured refusal** (code, message, authoring code, path, received
  value, allowed values), which is a result, not an error.
- **`/strategies/metrics`** — the metric index grouped by family: label,
  unit, range, and which transforms each metric takes. Linked from the
  strategies section alongside the signal library.
- **`/strategies/metrics/[metric]`** — the metric card: native output
  contract, then every transform with its parameters, formula, null
  behavior, and what it can chain into.
- **The contract check on the metric card**: a GET form (this is a read) —
  choose a transform, timeframe, and optional parameters; the page renders
  the compiled contract, or the refusal as guidance in the platform's words
  with the allowed domain listed.
- Rendering tests per branch, mapper tests over the live shapes, a key-gated
  live probe covering the good contract and the teaching refusal.

## Out of Scope

- **`update_strategy_signal_rule`** — the write. Next change, full track:
  destructive-flagged, propagates to every bound agent immediately, needs
  consequence wording and the confirmation ceremony.
- Writing composed columns into a strategy's sections — that rides
  compile→apply and belongs with the draft-preview change
  (`strategy-draft-preview`).
- `budgets` / `timeframeRefs` from the vocabulary payload — recorded as
  observed; surfaced when the draft-preview change needs token budgets.

## Capabilities

**Modified**: `strategy-authoring` — ADDED requirements for the metric
vocabulary and the column contract check. No existing requirement changes.
