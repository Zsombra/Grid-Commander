# Proposal: The Decision Shows Its Work

## Why

`why-it-did-not-trade` shipped hours ago and reads `list_entry_decisions`.
Discovery for the *next* change found that the tool returns **35 fields per
row** and the mapper keeps eleven. Among the twenty-four dropped is
`signalChecklist` — the richest explanatory payload anywhere on this
surface, and it was already arriving on the wire.

Each decision carries eight checklist entries, one per signal the agent
consulted:

```
signalId: "rsi_overbought"   label: "RSI(14) Overbought"   verdict: CONFIRM
interpretation: "RSI deep in overbought territory, now pulling back from
                 peak — supports mean reversion short"
```

Verdicts observed live: `CONFIRM`, `WARN`, `REJECT`. The pipeline page
currently shows the agent's *summary* paragraph — its conclusion. The
checklist is the evidence the conclusion was drawn from, signal by signal,
each with the platform's own written reading. "It skipped ETH" becomes "it
skipped ETH because five signals confirmed, two warned, and one rejected —
and here is what each of them saw."

This is `the-payload-carries-more-than-is-read` (open backlog item),
observed concretely on the newest surface in the product.

Also dropped and worth carrying: `positionSizePct` / `positionSizePreset`
(what it would have staked), `timeHorizon`, `atrPct` (the volatility it
sized against), `convictionPercent`, `expiresAt` / `executedAt`, and the
three execution order ids that link a decision to what the exchange did.

**`get_entry_decision` is not needed.** It was the obvious way to build
this and it would have been wasted work: the detail tool returns the same
35 keys the list row already carries. Verified live across four decisions
spanning `SKIP/SKIPPED`, `ENTER/EXECUTED`, `ENTER/FAILED`, `ENTER/EXPIRED`.
No second fetch, no detail route.

## The second thing discovery found

`tradingConfig.tradingMode` accepts `APPROVAL_REQUIRED`, and **this product
already offers it** — `MoneyLimits` renders the option as *"Approval
required — proposes trades, waits for you"* on both the create and edit
surfaces.

Grid-Commander has nowhere to answer that queue. `accept_entry_decision`
and `cancel_entry_decision` are `mcp:wager` and unbuilt (filed as
`approvals-have-no-write-side`). An operator who picks that option today
gets an agent that proposes trades to a screen that does not exist, and the
proposals expire.

The writes are a separate change — they commit funds and need the full
ceremony. What belongs *here* is not letting the operator walk into it
unwarned: the option says, in one line, that answering still happens on
battlegrid.trade.

## What Changes

- **`SignalVerdict`** on the `EntryDecision` port type — the checklist
  entries, mapped whole, keeping the platform's verdict vocabulary rather
  than collapsing it to a boolean. A `WARN` is not a `REJECT`, and a
  three-state reading flattened to pass/fail is the same class of error as
  a missing figure rendered as zero.
- **The decision's remaining context** — sizing, horizon, volatility,
  expiry/execution times, and the exchange order ids.
- **`/agents/[id]/pipeline`** renders the checklist under each decision,
  grouped so the disagreement is visible at a glance, with each signal's
  written interpretation shown.
- **`MoneyLimits`** states, on the `APPROVAL_REQUIRED` option, that
  Grid-Commander cannot yet accept or cancel what the agent proposes.

## Capabilities

- `agent-understanding` (MODIFIED)

## Out of Scope

- `accept_entry_decision` / `cancel_entry_decision` — `mcp:wager`, one
  destructive, full ceremony. `approvals-have-no-write-side`.
- `list_pending_approvals` — still `{approvals: []}`; all five agents on
  this account are `FULL_EXECUTION`, so the queue has never had a row and
  its shape stays unobserved. Not modelled from the declaration.
