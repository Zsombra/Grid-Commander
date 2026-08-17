# Proposal: The Scorecard Is Tunable

## Why

Phase 1, change 3 of the assistant roadmap — and the phase's first write.
The signal library explains what a signal does; the metric workbench
explains what a column computes; neither lets a user act on what they
learned. `update_strategy_signal_rule` does: it changes one rule's
allocation, Required flag, and strict parameters "through the unified
revision planner", and the platform's own description states the stakes —
**"Changed scorecard configuration propagates to every bound agent
immediately; open positions do not block the edit."** The tool is
destructive-flagged and mutates on `mcp:read` alone: exactly the class of
act this product exists to put behind a ceremony.

## What Changes

- **`updateSignalRule` on the strategies port** — strategyId,
  expectedRevision, signalId, allocation (0–3), required, optional strict
  params, confirmation. The adapter sends the declared `{request: …}`
  envelope; the response passes through opaque (never observed live).
- **`DescribeRetuneQuery` / `RetuneRuleCommand`** — the describe reads the
  strategy fresh, requires the signal to already be one of its rules,
  refuses a no-op, states the blast radius in the bound-agent count and the
  platform's own propagation wording, and mints a token digest-bound to the
  strategy, its revision, the signal, and the exact proposed values. The
  perform recomputes the target from what was submitted and spends the
  token through the guard.
- **`/strategies/[id]/rules/[signalId]`** — two steps on one route (the
  deploy pattern): a form offering allocation, required, and the signal's
  declared parameters (prefilled from the current rule), then the
  consequence with the confirm form. Refusals return to the same surface
  via `?problem=`. Linked from the strategy page's rules table.
- Guard updates: payload-conformance case for the new tool; reachability
  pins; tests for binding, refusals, and rendering per branch.

## Out of Scope

- **Adding a rule** for a signal the strategy does not carry — unproven
  against the platform; composing new rules belongs to the compile→apply
  pipeline with `strategy-draft-preview`.
- Editing thresholds, cadence, sections — compile→apply territory already.
- Any batch edit. The tool updates exactly one rule; so does the surface.

## Capabilities

**Modified**: `strategy-authoring` — one ADDED requirement. No existing
requirement changes.
