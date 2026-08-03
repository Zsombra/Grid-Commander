---
id: the-what-if-calculator-is-unused
title: simulate_aggregate_score — a stateless what-if the strategy editor could use
type: feature
status: open
priority: p3
created: 2026-08-03
updated: 2026-08-03
capability: strategy-authoring
blocked_by: []
tags: [battlegrid, strategy, simulation]
---

# The what-if calculator is unused

`simulate_aggregate_score` takes a set of `{label, score (0-1), allocation
tier (0-3)}` signals and a gate threshold, and returns the weighted
aggregate, the per-signal attribution percentages, and whether it would
route. Declared as stateless: "No agent state is read or written."

It is the only tool on the surface that answers a question about a strategy
that has not run yet.

## Why it fits the strategy editor

`the-scorecard-is-tunable` (archived 2026-08-01) lets an operator retune a
signal rule's allocation and Required flag through the confirmation
ceremony. What they cannot do is see what that retune would have done to
the score *before* saving it.

`your-own-agent-is-as-legible` (archived 2026-08-03) supplies the other
half: a real evaluation now shows every consulted signal with its score and
effective allocation, plus the attribution the platform computed. Feeding
those exact numbers back into the simulator with one allocation changed
answers "would this candidate have routed if I had weighted RSI higher?"
against a real past evaluation rather than an invented one.

## Why it is not on the reporting surfaces

It belongs beside tuning, not beside a record of what already happened. A
what-if rendered next to a real outcome invites reading the simulation as
the thing that occurred.

## First step when taken

Call it with the exact signals from one real evaluation
(`/agents/[id]/pipeline/[logId]` now has them) and check whether the
returned aggregate reproduces the platform's own `aggregateScore` for that
evaluation. If it does not, the tool is modelling something other than what
the pipeline runs, and that is worth knowing before any UI is built on it.
