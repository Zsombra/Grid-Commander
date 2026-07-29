# Zero does not mean nothing

## Why

The form asks **"Most it may lose in a day"** and hints **"Trading stops for the
day once this is reached."** It accepts `0`.

BattleGrid's schema says:

```
maxConcurrentExposureUsd   0 = unset
maxCumulativeDrawdownUsd   0 = no stop
maxDailyLossUsd            0 = no daily limit
```

**An operator typing `0` gives the most cautious answer the form's own language
allows, and creates an agent with no daily loss limit at all.** The safest input
produces the least bounded agent.

The product does not merely fail to warn — it asserts the opposite. From
`money-limits.test.ts`:

> Zero is a real answer to "most it may lose in a day" — it means the same as
> `OFF` for that limit.

That comment is wrong, it was written by me, and it is load-bearing: it is the
reason nothing questioned a zero anywhere else.

This is in `name-what-an-agent-may-spend`, whose stated purpose was to stop
creating agents "under limits nobody chose". It closed the case where a limit
was **absent** and left open the case where a limit is **zero** — which the
platform treats identically to absent, and which the form makes the natural
thing to type.

The live account shows why it matters: `THE .0` runs with
`maxDailyLossUsd: 0` and `maxCumulativeDrawdownUsd: 0`, and the agent page
calls that **"Money limits: configured"**.

## What Changes

- The domain knows that `0` means unbounded for the three caps whose schema says
  so, and says which. `UNBOUNDED_AT_ZERO` sits beside `TRADING_CONFIG_FIELDS`,
  derived from the platform's own descriptions rather than assumed.
- The form states it where it is typed: a zero in these fields removes the
  limit, and the hint no longer describes a stop that would never fire.
- Creating an agent with an unbounded cap is **allowed and named**. Some
  operators do want no ceiling; what they must not get is one by accident, so
  the consequence is stated before the agent exists.
- `agent.tradingConfig != null` stops being rendered as "configured". A present
  object is not a set limit, and the agent page must not say otherwise.
- The wrong comment and its test are corrected.

## Capabilities

- `agent-authoring` — one requirement modified.

## Out of Scope

- **Refusing zero.** The platform accepts it and it is a real choice. Overriding
  a platform capability because it is dangerous is not this product's call; the
  product's job is to make sure it was chosen rather than stumbled into.
- **Changing `THE .0`.** It runs unbounded on two caps today. Saying so is this
  change; altering a live agent's limits is the operator's decision.
- **The `balanceThresholdUsd` and `minAllocationUsd` floors.** The schema gives
  no `0 = …` note for either, so nothing is established about what zero means
  there and nothing will be guessed. → backlog.
