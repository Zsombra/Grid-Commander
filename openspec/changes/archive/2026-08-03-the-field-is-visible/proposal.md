# Proposal: The Field Is Visible

## Why

Every performance number this product shows is unanchored. An agent that
lost $9.64 over three trades — is that bad? Nothing in Grid-Commander can
say, because there is no comparison class. `public-explorer-is-unmodelled`
has been filed since 2026-08-01 as the answer, and reporting work has now
reached the point where it is the missing half.

`get_agent_explorer` is not a list of names. Each entry is a **resume**:
rank, model and its vendor, owner, tenure, windowed net P&L, win rate,
trade count, ROI, average trade size, best and worst trade with tickers, a
12-bucket P&L sparkline, live position count, the agent's behaviour triple
(risk / outlook / conviction), its 21 market-intel toggles, its full
trading spec, its strategy name, and a server-authored subtitle and
objective. Alongside it come field-wide `stats`, per-vendor
`aggregations`, top movers, and — the part that makes it a workbench
feature rather than a scoreboard — **`currentUser`**, which names this
account's own agents and their rank in the field.

`get_leaderboard` does the same one level up: owner rank, value, and
percentile against every player.

Read live 2026-08-03, the field is a genuinely useful fact:

- **37 agents, 773 closed trades, 31% win rate, −$162.07 net.** The field
  as a whole loses money.
- Of nine model vendors, **one is in profit** (Moonshot AI, +$27.97 over
  88 trades). Anthropic-model agents — 18 of them, 351 trades — are down
  $59.98.
- This account sits at **rank 7 by profit (97th percentile)** and **rank 1
  by both volume and score**.

That is the expected-value anchor the reporting phase was missing.

## What the platform does that the surface must not repeat

Three things were established live, and each one is a way this page could
lie if built naively:

1. **The list can be shorter than the field it reports, and `limit` does
   not change that.** `ALL_TIME`/`NET_PNL` returned **5 entries** against
   `stats.totalAgents: 37` at every limit from 3 to 100, four runs in a
   row; `DAILY`/`WIN_RATE` returned 3. Twenty minutes later the same
   parameters returned all 37. So it is **intermittent**, which is worse
   than deterministic: a page that renders the rows under a "37 agents"
   heading is right some of the time and silently wrong the rest, with
   nothing to distinguish the two. Both numbers get stated, always.
2. **Win rate is null before it is zero.** A vendor with no trades
   (DeepInfra, xAI) has `winRate: null`, and the whole field has
   `winRatePercent: null` on a day nobody traded. Rendered as 0% that
   reads as "everyone lost", which is the opposite of "nobody played".
3. **Sorting by win rate promotes the smallest sample.** `WIN_RATE` puts
   `TRADFI KING` first at **100% on one trade**, ahead of `Market
   Predator` at 45% on 51 trades and $50 of profit. The rank is real; the
   inference an operator would draw from it unaided is not.

## What Changes

- **`ExplorerPort`** with two reads — the field and the leaderboard — each
  returning its own three-state result so one failing does not blank the
  other.
- **Mappers** that keep null win rates null, keep the platform's own
  subtitle and objective unparaphrased, and carry `shown` alongside
  `totalAgents` as two separate numbers rather than one implied one.
- **`/explorer`** — where this account stands first, then the field's
  baseline, then the ranked resumes, then the per-vendor breakdown. Every
  rank sits next to the sample it was computed from.
- Nav entry alongside Arena.

## Capabilities

- `agent-comparison` (ADDED)

## Out of Scope

The seven per-agent public reads — `get_public_agent_realized_trades`,
`_signal_logs`, `_signal_log_detail`, `_signal_performance`,
`_trade_chart`, `_unrealized_pnl`, `_game_history`. They are one public
agent's detail page, a second change, and they only make sense once there
is a list to arrive from.
