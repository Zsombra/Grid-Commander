# Performance was already in the payload

## Why

An older account was made available — nine agents, one with **97 games played**.
Everything below came from calling it. Nothing came from a schema.

### The tool named "performance" is not where the performance is

`get_agent_performance` returns:

```
{ agentId, realizedPnlUsd, drawdownUsd, maxCumulativeDrawdownUsd, pnlCurveUsd, haltedAt }
```

Called on all nine agents: `pnlCurveUsd` empty on every one, every value zero
except `maxCumulativeDrawdownUsd: 100` on three — which is their configured cap
echoed back. `get_agent_fund_allocation` is the same: zeros across all nine.
Across two accounts and twelve agents, neither tool has ever returned a
populated figure.

**The numbers are on the roster.** `list_intelligence_agents` — which this
product already calls on every agents page — returns a `performance` block per
agent, and it is full:

```
Fade Master II   97 games · 39% win · 50% avg accuracy · $73.87 earned
                 18 trades · 5W/13L · avg −$0.25
Fade Master      20 games · 65% win · 63% avg accuracy · $36.90 earned
Apex             42 games · 26% win · 52% avg accuracy · $22.96 earned
                 3 trades · 0W/3L · avg −$3.21
Flow State        7 games · 57% win · 62% avg accuracy · $40.14 earned
```

`mapAgent` discards all of it. The data has been arriving in a response the
product parses, on every roster load, for the life of the product.

`get_intelligence_agent` carries the identical thirty keys, so one mapper fixes
both reads.

### The exclusion was reasoned, and the reasoning stopped one step short

`Agent`'s doc comment names it:

> That carries thirty fields including avatar urls, cost telemetry and a
> performance block, none of which participates in a rule.

That is correct and it is the right rule for a domain type. What does not follow
is that the **product** should show none of it. This is a workbench for building,
tuning and *understanding*, and `agent-understanding` exists to answer "how is my
agent doing". A comment that reads as settled is why nobody asked again.

### Vocabulary the first account was too young to contain

Seven event kinds and one outcome this product has no copy for, all live:

```
AGENT_OUTCOMPETED               {winnerId, confidence, winnerConfidence}
AGENT_WON_COMPETITION           {competitorCount, confidence, picksCount}
MULTI_AGENT_DISPATCHED          {agentCount, agentIds, sessionId}
AGENT_ASSIGNED_TO_PRESET        {gamePresetId, presetDisplayName}
TRADING_BALANCE_BELOW_THRESHOLD {equityUsd, thresholdUsd}
COST_LIMIT_REACHED              {error, errorCategory}
SESSION_SETTLED                 {rank, score}
SKIPPED_COST_LIMIT              (thought outcome)
```

Each rendered as a bare identifier rather than being dropped — the open maps
working exactly as intended, for the second time.

**`COST_LIMIT_REACHED` is a defect they exposed.** Its message is under `error`:

> `"Daily cost limit reached ($6.0544 / $6)"`

`eventSentence` reads `reason` only, so the one sentence explaining why the agent
stopped is missed and falls through to the key-value list. `TRADING_BALANCE_BELOW_THRESHOLD`
carries the same warning as numbers — an agent at `equityUsd: 2.18` against a
`thresholdUsd: 10`.

### One guess confirmed, and it can stop being a guess

`settled()` reads `score !== null`. Measured across five agents and 37 games:

```
finalScore and outcome both present   24
finalScore only                        0
outcome only                           0
both absent                           13
```

Never once disagreeing. The comment saying settled games were unobserved is now
wrong in the good direction, and `finalScore` turns out to be **signed** —
`−403`, `−177` observed — while `outcome: "WON"` appears alongside
`isItm: false` and a payout of zero. Rank, outcome, in-the-money and payout are
four independent axes, which is exactly why they are passed through rather than
summarised.

## What Changes

- `Performance` is modelled from the roster payload — games and trades, each with
  the platform's own totals. `mapAgent` reads it; both agent reads carry it.
- `Agent` gains it, and its doc comment records the reversal rather than quietly
  dropping the sentence that excluded it. Cost telemetry and avatar urls stay out.
- `/agents/[id]` shows it. An agent that has never played says so, distinctly from
  one whose record could not be read.
- A percentage that is the same number twice is kept once. `winRate: 0.3917…` and
  `winRatePercent: 39` are one fact; the fraction is kept and nothing is derived,
  as `confidenceScore` already is.
- The eight new names get copy. `eventSentence` reads `error` as well as `reason`.
- `eventFacts` stops printing raw JSON arrays of UUIDs.
- `settled()`'s caveat is replaced by the measurement.

## Capabilities

- `agent-understanding` — one requirement added.

## Out of Scope

- **`get_agent_performance` and `get_agent_fund_allocation`.** Their shapes are
  now observed and their values never populated — on any agent, on either
  account. Building a surface on fields that have only ever been zero is how the
  `finalScore` caveat happened, in reverse. → backlog, with the evidence.
- **Reconciling the two P&L numbers.** `get_agent_performance` reports
  `realizedPnlUsd: 0` for an agent whose roster `tradeStats` shows 18 trades at
  avg −$0.25. Something distinguishes them and this change does not know what,
  so it shows the roster's figure, says it is the roster's, and reconciles
  nothing. → backlog.
- **The other fields the payload carries** — `last24hCostUsd`, `activeGameCount`,
  `hasActiveAssignments`, `provider`, `modelDisplayName`, avatar urls. `last24hCostUsd`
  is the one worth a look, since `COST_LIMIT_REACHED` proves an agent can be
  stopped by spend. → backlog.
- **Charting the sparklines.** `earningsSparkline` and `pnlSparkline` carry
  timestamped points. Drawing them is a design question with a design lane.
