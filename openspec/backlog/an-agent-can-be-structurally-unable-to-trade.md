---
id: an-agent-can-be-structurally-unable-to-trade
title: An agent can pay to think while being unable to place any valid order, and nothing says so
type: feature
status: open
priority: p2
created: 2026-08-03
updated: 2026-08-06
capability: agent-understanding
blocked_by: []
tags: [battlegrid, cost, sizing, derived-truth]
---

# An agent can be structurally unable to trade, and nothing says so

## Update 2026-08-06: the qualification surface does **not** answer this

`why-it-would-not-take-this-coin` shipped `/agents/[id]/qualification`, which
screens a coin against the agent's gates and says which one stops it. It looks
like the answer and is not: the three gates BattleGrid reports —
`aggregateScore`, `requiredCount`, `atrVolatility` — are all about *the
market*. None of them consults balance, allocation floor, leverage or the
exchange minimum.

So an agent with $4.20 can screen a coin as **qualifying**, in full, and still
fail the order the moment it places one. The two answers now sit one click
apart and disagree, which makes this item more worth doing rather than less —
and the new page is the natural place for the sentence, beside a verdict that
would otherwise read as a green light.

Found by analysing all 159 of `Fade Master II`'s evaluations on 2026-08-03.

## The observation

23 of 159 evaluations (14.5%) ended `FAILED`. Sampling their execution
messages:

```
Order notional $9.66 below exchange minimum
Order notional $7.24 below exchange minimum
Order notional below agent minimum
Order 0: Insufficient margin to place order
```

Every one is a **size** rejection, not a judgement. The agent evaluated,
paid to think, decided to enter, and the order could not be placed.

## The arithmetic, and why it is structural

| | |
|---|---|
| account balance | **$4.20** |
| agent `minAllocationUsd` | 10 |
| agent `balanceThresholdUsd` | 10 |
| `maxLeverage` | 3 |
| size presets | 30% / 40% / 50% |

Largest possible notional: `$4.20 × 50% × 3 = $6.30`, against an exchange
minimum that rejected `$9.66`. **No preset at this balance can produce a
placeable order.** The agent is also below its own configured $10 floor.

So this is not variance. Every ENTER this agent reaches is doomed before
it is placed, at roughly $0.056 of model spend each.

## What the product should say and does not

Grid-Commander already knows every input: the balance (`get_account_state`),
the size presets and leverage (`tradingConfig`), and the observed rejection
messages. It can therefore derive — and state plainly on
`/agents/[id]/pipeline` and the agent page —

> **This agent cannot place a valid order.** At $4.20 balance, its largest
> position (50% at 3× leverage) is $6.30, below the exchange minimum that
> rejected its last four orders. It will keep evaluating and keep failing.

That is exactly the class of derived truth this product exists for: the
platform reports each rejection individually and never says the agent is
structurally stuck.

## What this is NOT

Not a tuning problem, and the same analysis ruled that out:

- **The signal gate filters nothing.** All 159 evaluations passed it
  (gates in force 0.45 and 0.30; average score 0.650).
- **The score does not predict the outcome.** SKIPPED averaged 0.630, PASS
  0.672, EXPIRED 0.746 — the *highest*. Four candidates scored **1.000**
  and were skipped at 20–32% conviction.
- **Raising the gate trades away trades at about the same rate as spend.**
  A 0.65 gate would cut 98 evaluations and save ~$5.45, while losing 9 of
  18 PASSes. That is doing less, not doing better.

The filter that matters is the LLM's own judgement after the gate
(`LLM_DECLINED` on every SKIPPED sample), and it disagrees with the
scorecard. Re-weighting signals cannot move it.

## First step when taken

Compute the largest placeable notional from balance × largest preset ×
maxLeverage, compare against the most recent `BELOW_EXCHANGE_MINIMUM` /
`Insufficient margin` rejection, and render the verdict where the operator
already looks at why an agent did not trade. The exchange minimum itself is
not published by any tool — read it from the rejection messages rather than
assuming a figure.
