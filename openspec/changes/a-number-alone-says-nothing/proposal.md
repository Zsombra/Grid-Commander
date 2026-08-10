# Proposal: A Number Alone Says Nothing

## Why

`maxDailyTrades: 34` looks like a setting. Against BattleGrid's own declared
default of **10**, it is a decision to trade 3.4× as often as the platform
suggests, and nothing in this product says so. `maxStopLossPct: 1` looks
careful. Against a measured single-bar adverse excursion of 0.47%, it is a stop
inside the noise. Both render as a number, and a number rendered on its own has
no opinion.

The backlog item `a-stop-inside-the-noise-looks-like-a-tight-stop` (p1) asks for
a panel that shows each setting **against the thing that makes it safe or
unsafe**. This change ships the part of that which can be read rather than
guessed.

**Two independent samples reached the same conclusion, three orders of
magnitude apart.** A 776-trade population study (`_PM/TRADE_CATEGORIES_AND_
MATHEMATICAL_FAMILIES.md` §D.3): 74% of all trades exit at `STOP_LOSS`, median
move at stop **0.623%**, against a mean single-bar adverse excursion of
**0.47%**. And a 26-trade fleet this product built and ran (JOURNAL, 2026-08-09
→ 08-10): placed RR **3.34**, realised RR **1.05–1.33**; of a five-position
book, four stopped out **within 0.07pp of their own stop**; 10 of 11 losers
closed on a sub-1% move.

That second sample is the important one for this change, because **it was
computed from data this product already reads**.

## What the item asked for that is already shipped

Checked against the code before proposing, and three of the item's six rows
turned out to be done or covered:

| The item asks for | State |
|---|---|
| `maxDailyLossUsd: 0` / `maxCumulativeDrawdownUsd: 0` named as **OFF**, never a number | **Already shipped.** `Ceilings` renders "no limit set" and "Nothing will stop this agent on …"; spec'd at *A Limit Nobody Set Is Not A Limit Of Zero* and *What Would Stop This Agent Is Stated, Including Nothing* |
| `maxConcurrentExposureUsd` against what is at risk | **Already shipped.** The exposure gauge renders `used of ceiling · remaining left` |
| `minStopLossPct` / `maxStopLossPct` / `minRiskRewardRatio` against measured excursion | **Not ours to show yet** — see below |

So this change is three requirements, not six. Proposing the other three would
have been re-specifying shipped behaviour.

## What moved underneath the item

The item was filed 2026-08-06, against BattleGrid **v11**. At **v15** the
platform moved the trade-level policy off the agent and onto the strategy:
`maxStopLossPct`, `minStopLossPct` → `minStopLossAtrMultiple`, and
`minRiskRewardRatio` (`src/domain/agent/catalog.ts:127`,
`src/domain/strategy/compiled-plan.ts:57`). An *agent* risk panel can no longer
show them, because an agent no longer has them.

They are also **inert**: the compiler ignores all three and no write path works
(`v15-trade-level-policy-is-declared-but-inert`, p1, retested against v16 today
and still refused). So the stop-versus-noise comparison is deferred twice over —
wrong subject, and a subject the platform does not act on.

## What Changes

- **A ceiling is shown against the platform's own default for it.** BattleGrid
  declares a default for many capped fields in `get_trading_config_catalog`,
  which this product already reads. Where an agent's value departs from it, the
  departure is stated as a multiple, in the platform's own units. Derived from
  the catalog, never from a list of defaults kept here — if BattleGrid changes
  one, the surface changes with it.

- **An agent's realised exit geometry is stated, from its own closed trades.**
  `list_trade_outcomes` — already read for `/agents/[id]/trades` — carries
  `closeReason`, `direction`, `entryFillPrice` and `exitFillPrice`. From those
  four: how the agent's trades ended, and **the median realised move at each
  ending**. That is the study's single most important statistic, computed for
  one agent from its own record, with no candle history, no borrowed constant,
  and no extra platform call.

- **Position management is shown as what it does, not as the label it wears.**
  The catalog carries each preset's fourteen values; `positionDrift()` already
  computes whether an agent's values still match the label it claims. Both go on
  the read surface, beside the agent's own median position life — the number
  that says whether the management is closing positions early.

- **Every figure carries its sample and its window.** A median over eleven
  trades is a different claim from a median over seven hundred, and the surface
  says which it is. Where a figure is derived by this product rather than
  published by the platform, it is labelled derived — as the trading record
  already is, because `get_agent_performance` answers zeros on agents with real
  losses.

## What is deliberately not here

- **No population constants in the product.** The study's 0.47% noise floor and
  0.623% median stop are measurements taken on a stated date over a stated
  sample. Hardcoding them would put a number with false precision on a screen
  whose entire purpose is to be trusted instead of the raw setting. The item
  says this in as many words: *do not compute a noise floor from 100 bars and
  present it as authoritative.* The agent's own record needs no such constant.

- **No stop-versus-excursion comparison.** Wrong subject since v15, and inert on
  the platform. Filed rather than half-built.

- **No account balance.** The item asks for exposure against balance. **There is
  no balance read** — `AccountPort` answers identity only, and equity appears
  solely inside gate-block details (`equityUsd` in `INSUFFICIENT_EQUITY`).
  Deriving one from positions would be inventing a figure. Filed.

- **No writes.** The item is explicit: retuning a live agent is a separate
  question and a separate item. This surface reads.

## Capabilities

**Modified**: `agent-understanding` — three ADDED requirements.
