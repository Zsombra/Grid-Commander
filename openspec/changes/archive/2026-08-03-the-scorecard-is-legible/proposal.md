# Proposal: The Scorecard Is Legible

## Why

`/explorer` says the field loses money. `/explorer/[agentId]` says how one
competitor operates — 245 evaluations into 73 entries at a 76% fill rate.
Neither says what an agent **actually read** on a given candidate.

`get_public_agent_signal_log_detail` does, and it is the deepest payload on
the BattleGrid surface. Read live 2026-08-03 on `Market Predator`'s ETH
evaluation:

- **`scorecard.allEvaluatedSignals`: 72 entries, 12 triggered.** One per
  signal the agent consulted — *including the sixty it dismissed*. Each
  carries its module, trigger state, score, bias, direction, whether it was
  primary or required, its effective allocation, the **raw indicator
  values**, and a written sentence:

  > `RSI(14) at 38.1 — not oversold (threshold 30)`
  > `MACD bull divergence: price lower but histogram rising`

- **`attributions`: how the aggregate was built.** Twelve entries, each
  with an `attributionPercent` — `macd_bull_divergence` contributed 13% of
  a 0.566 score. This answers "why that number" rather than restating it.

- **`pipeline`: the whole chain**, gate → attempt → decision → execution →
  outcome, and it is a real state machine. `LLM_APPROVED` → `ENTER` at 62%
  conviction → `CLOSED` → `LOSS −$0.40`. Or `LLM_DECLINED` → `SKIP` at 28%
  and nothing after it.

Seventeen modules are represented (RSI, MACD, STOCHASTIC, VOLUME,
VOLATILITY, BOLLINGER, MOVING_AVERAGES, TREND_STRENGTH, FUNDING,
OPEN_INTEREST, RELATIVE_STRENGTH, SUPPORT_RESISTANCE, MFI, COMPARISON,
REGIME, PRICE_STRUCTURE, CVD). **The untriggered sixty are the point**: what
an agent looked at and dismissed is as much its strategy as what fired.

## What discovery established that changes the design

1. **A listed evaluation can have no detail.** Of 20 logs returned by
   `get_public_agent_signal_logs`, **4 answered `{log: null}`** on detail —
   and all four were exactly the ones whose `terminalStatus` is `FAILED`,
   with every other status resolving. A perfect correlation over 20 rows is
   suggestive, not a rule, so this change links every row and renders the
   null as its own state rather than hiding links it predicts will fail.
2. **Owner-private telemetry is genuinely nulled.** `pipeline.attempt.ownerView`
   and `llmPartialReasoning` were null on every log checked, as declared.
   They are not read, and nothing renders an empty slot in their place.
3. **`executionMessage` is JSON inside a string** —
   `"{\"kind\":\"INDICATOR_STATE\",\"indicator\":\"emaCross\",…}"`. It is
   carried and shown verbatim rather than parsed: parsing means modelling a
   shape seen once, and the clean enums (`expiryReason: INDICATOR_FLIP`,
   `failureReason`) already carry the answer in a form the platform commits
   to.

## What Changes

- **`readCompetitorEvaluationDetail`** on `ExplorerPort`, returning the
  scorecard, the attributions, and the chain — with `none` for the
  published-nothing case, distinct from `unreadable`.
- **`/explorer/[agentId]/evaluations/[logId]`**: the header, then every
  evaluated signal grouped by module with triggered ones marked and the
  platform's sentence kept whole, then the attribution breakdown, then the
  chain from gate to outcome.
- Each evaluation on the competitor page links to it.

## Capabilities

- `agent-comparison` (MODIFIED)

## Out of Scope

- `scorecard.comparison` (peer coins with correlations),
  `tradeAssessment.candidateLevels` and `attempt.setupOptions` (the
  candidate stop/target grid). Real and rich; a second page.
- `get_public_agent_trade_chart` — belongs with candidate levels.
- `get_public_agent_game_history` — belongs with the arena.
- **Our own agents' pipeline does not gain this.** `/agents/[id]/pipeline`
  shows `signalChecklist` — triggered signals with an interpretation. This
  public read is richer, which is an odd asymmetry worth its own
  investigation rather than a silent copy. Filed.
