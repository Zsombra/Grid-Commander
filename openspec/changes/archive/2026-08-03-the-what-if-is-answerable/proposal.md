# Proposal: The What-If Is Answerable

## Why

Everything this product shows about a strategy is retrospective. The
retune ceremony (`the-scorecard-is-tunable`) lets an operator change a
signal's allocation and save it — but nothing says what that change would
have *done*. They find out by waiting for the next evaluation, with real
money in the loop.

`simulate_aggregate_score` is the only tool on the surface that answers a
question about a strategy that has not run yet. It was filed rather than
built because a simulator that models something other than what the
pipeline runs is worse than none.

## The correctness check came back clean, five for five

`the-what-if-calculator-is-unused` said to verify before building anything.
Fed the triggered signals and effective allocations from five real
evaluations, with each one's own gate:

| evaluation | fired / consulted | platform `aggregateScore` | simulator |
|---|---|---|---|
| BTC (EXPIRED) | 14 / 72 | 0.647 | 0.64705 |
| ETH (PASS) | 12 / 72 | 0.566 | 0.56614 |
| BTC (PASS) | 18 / 72 | 0.636 | 0.63579 |
| APT (EXPIRED) | 8 / 72 | 0.53 | 0.53 |

Exact to the platform's own rounding, and the **per-signal attribution
percentages match signal-for-signal**. The simulator is the pipeline's own
arithmetic, exposed.

It also settled how the aggregate is built: over the **triggered** signals
only. The fifty-eight that did not fire contribute nothing — which is why
`/agents/[id]/pipeline/[logId]` showing them was worth doing, and why the
what-if seeds from the fired ones.

## Where it goes, and a concern I raised against myself

`the-scorecard-is-legible` argued this belongs "beside tuning, not beside a
record of what already happened — a what-if rendered next to a real outcome
invites reading the simulation as the thing that occurred."

That concern is real and it is not a reason to keep them apart. A blank
form asking an operator to invent scores produces a number about nothing;
the whole reason to trust this tool is that it reproduces real evaluations
exactly. So it seeds from one, and the requirement below makes the
distinction structural rather than a matter of tone: the simulated figure
must be labelled as not having happened, and shown beside the real one it
departs from.

## What discovery established that shapes the surface

- **Twenty signals, hard.** 21 is refused with a validation error, not
  truncated. An evaluation that fired more than twenty (one did — CRV, 21
  of 72) cannot be simulated, and the page says so rather than quietly
  dropping one.
- **Allocation 0 contributes nothing** — attribution 0%, excluded from the
  weighted mean. All-zero answers an aggregate of 0 rather than an error,
  so a fully-muted composition is a legible answer.
- **`wouldRoute` is `>=`**: an aggregate exactly equal to the gate routes.

## What Changes

- **`simulateAggregate`** on `StrategiesPort` — allocation tiers are a
  strategy-rule concept, and the retune flow already sets exactly these.
- **`/agents/[id]/pipeline/[logId]` gains a what-if**: the evaluation's own
  fired signals with their real allocations, each changeable, re-scored on
  submit. It states what the evaluation actually scored, what the change
  would score, and whether that crosses the gate.

## Capabilities

- `strategy-authoring` (MODIFIED)

## Out of Scope

- Writing the simulated allocation back to the strategy. The retune
  ceremony exists and is the way to do that; a simulator that could also
  save would be a second write path around a confirmation flow built to be
  the only one.
- A standalone bench with hand-entered signals. Nothing anchors those
  numbers, and the tool's value is that it reproduces reality.
