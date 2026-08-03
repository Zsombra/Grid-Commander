---
id: the-what-if-calculator-is-unused
title: simulate_aggregate_score — a stateless what-if the strategy editor could use
type: feature
status: done
priority: p3
created: 2026-08-03
updated: 2026-08-03
change: "the-what-if-is-answerable"
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

## Done (2026-08-03)

**The correctness check came back clean, five for five.** Fed the triggered
signals and effective allocations from five real evaluations, each with its
own gate: the returned aggregate matched the platform's own
`aggregateScore` to its rounding every time (0.647 → 0.64705, 0.566 →
0.56614, 0.636 → 0.63579, 0.53 → 0.53), and the per-signal attribution
percentages matched signal-for-signal. The simulator is the pipeline's own
arithmetic, exposed.

It also settled how the aggregate is built: over the **triggered** signals
only. The ~58 that did not fire contribute nothing.

`the-what-if-is-answerable` (archived) put it on
`/agents/[id]/pipeline/[logId]`, seeded from that evaluation's fired
signals at their real allocations — so the unchanged form reproduces the
evaluation's own score, and every departure is the user's edit. The live
probe asserts exactly that, and will fail if BattleGrid ever changes the
aggregation.

**Three platform facts the surface is built around**: the cap is twenty and
twenty-one is **refused**, not truncated (one real evaluation fired 21, and
the page says it cannot be re-scored rather than dropping one); allocation
0 contributes nothing and an all-zero set scores 0 rather than erroring;
and `wouldRoute` is `>=`, so an aggregate equal to the gate routes.

**A concern raised against this in `the-scorecard-is-legible` was
answered rather than ignored** — that a what-if beside a real outcome
invites reading the simulation as what occurred. The answer is structural:
a spec requirement that the simulated figure states it did not happen and
sits beside the real score, with a test.
