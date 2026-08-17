# Proposal: Your Own Agent Is As Legible

## Why

`the-scorecard-is-legible` shipped hours ago and left the product in a
state that is backwards: it explains a **stranger's** agent better than
the user's own.

`our-own-agents-show-less-than-strangers` (P2) asked which of two causes
that was, and said not to assume. Called live 2026-08-03, the answer is the
first one, and it is not close:

| | keys |
|---|---|
| `list_signal_logs` row — what `ReadPipelineQuery` reads | **23** |
| `get_signal_log` detail — never called | **31** |

The eight it never sees: `scorecard`, `attributions`, `pipeline`,
`linkedEntryDecision`, `challenge`, `agentName`, `agentAvatarUrl`,
`agentModelName`.

On this account's own agent "Flow State": **64 signals consulted, 13
fired**, each with the module, score, bias, indicator readings and the
platform's sentence — `RSI(14) at 76.2 — not oversold`. Thirteen
attributions. The whole gate → attempt → decision → execution → outcome
chain.

This is the **eighth** instance of `the-payload-carries-more-than-is-read`,
and the second this month to be caught after shipping (`why-it-did-not-trade`
mapped 11 of 35 fields on a page that shipped the same afternoon).

## The part a stranger's page can never have

`pipeline.attempt.ownerView` is nulled on the public read and **populated
on your own**:

```json
{"provider": "Anthropic", "modelDisplayName": "Claude Opus 4.6",
 "billingType": "PLATFORM", "costUsd": 0.047775, "durationMs": 20711,
 "errorMessage": null}
```

That is what one decision cost to think — **4.8 cents and 20.7 seconds** —
and nothing in this product has ever shown it. An operator tuning a
strategy is spending this money on every evaluation, including the 51 of
64 signals that came back "no".

`get_signal_performance` is also unused: the same funnel built for
competitors in `a-competitor-can-be-opened`, available for the user's own
agents and never called.

## What Changes

- **Shared evaluation shapes move to the domain.** `ConsultedSignal`,
  `ScoreAttribution` and `EvaluationChain` are the platform's shapes for
  *an evaluation*, not for *the explorer*, and both ports now need them.
  They move to `src/domain/agent/scorecard.ts`; `ExplorerPort` re-exports
  from there rather than declaring its own. Duplicating three interfaces
  across two ports would guarantee they drift.
- **`readOwnEvaluationDetail` and `readOwnFunnel`** on `AgentsPort`.
- **`/agents/[id]/pipeline` gains the funnel** — how much this agent
  evaluated versus acted on, the figure that made a competitor's page worth
  reading.
- **`/agents/[id]/pipeline/[logId]`** — the scorecard, the attribution, the
  chain, and **what the thinking cost**, reached from each evaluation.

## Capabilities

- `agent-understanding` (MODIFIED)

## Out of Scope

- `simulate_aggregate_score` — a stateless what-if calculator (given
  signals and a gate, compute the aggregate and whether it would route). It
  belongs beside strategy tuning, not beside a record of what already
  happened. Filed.
- `scorecard.comparison`, `candidateLevels` and `setupOptions` — out of
  scope on the competitor page for the same reason, and they should land on
  both surfaces together or neither.
