# BattleGrid MCP — complete library reference

Generated from a live `tools/list`, `prompts/list` and `resources/list` against
`https://mcp.battlegrid.trade/mcp` (server `battlegrid v17.0.0`, protocol `2025-06-18`) on 2026-08-10.
Reconnaissance only — no wager tool was called.

> The server instructs clients to rediscover capabilities from the live connection,
> because this list stops being authoritative after a deployment. The machine-readable
> dump alongside this file (`battlegrid-mcp-capabilities.json`) is the diffable artifact;
> regenerate both rather than trusting them blindly.

**114 tools · 5 prompts · 3 resources · 0 resource templates**

## Scopes

| Scope | Grants |
|---|---|
| `mcp:read` | Discovery **and non-financial configuration writes** — creates agents, authors strategies. Not view-only. |
| `mcp:wager` | Commits funds or grants autonomous authority. |

**16 of 114 tools require `mcp:wager`**; the remaining 98 are `mcp:read`.

Platform caps on MCP-signed wagers: **10 per day**, **$500/day** (`mcpSignedWagerDailyCountLimit`, `mcpSignedWagerDailyVolumeLimitUsd`).

### Money / autonomous-authority tools — the complete set

- `accept_entry_decision`
- `cancel_entry_decision`
- `close_agent_position`
- `delete_deployment_policy`
- `delete_radar_deployment`
- `halt_intelligence_agent`
- `override_agent_protection`
- `random_submit_market_grid`
- `reset_agent_drawdown_baseline`
- `resume_intelligence_agent`
- `set_agent_per_trade_push`
- `submit_agent_grid`
- `submit_market_grid`
- `update_market_grid`
- `upsert_deployment_policy`
- `upsert_radar_deployment`

### Tools taking an explicit `confirm` flag as a second gate

- `archive_strategy`
- `close_agent_position`
- `delete_deployment_policy`
- `delete_radar_deployment`
- `rebind_intelligence_agent`

## Every tool carries MCP annotations — use them, not name heuristics

All 114 tools declare `readOnlyHint`, `destructiveHint`, `idempotentHint`
and `openWorldHint`, plus `execution.taskSupport` (`forbidden` on every tool — none may be
run as a detached task).

| Classification | Count |
|---|---:|
| Read-only (`readOnlyHint: true`) | 87 |
| Mutating (`readOnlyHint: false`) | 27 |
| Destructive (`destructiveHint: true`) | 10 |
| Requires `mcp:wager` | 16 |

### The gap that matters: 11 tools mutate state on `mcp:read` alone

Scope and mutation are **not** the same axis. These write without needing wager authority —
6 of them are flagged destructive:

| Tool | Destructive |
|---|:--:|
| `activate_intelligence_agent` |  |
| `apply_strategy_plan` | **YES** |
| `archive_intelligence_agent` | **YES** |
| `archive_strategy` | **YES** |
| `create_intelligence_agent` |  |
| `fork_strategy` |  |
| `generate_agent_grid` |  |
| `rebind_intelligence_agent` | **YES** |
| `restore_strategy` |  |
| `update_intelligence_agent` | **YES** |
| `update_strategy_signal_rule` | **YES** |

A credential issued as "read-only" can therefore create agents, rebind them to a different
strategy (replacing their configuration wholesale), archive them, author and apply strategy
plans, and edit signal rules that propagate immediately to every bound agent. It cannot move
money. Scope `mcp:read` accordingly — it is configuration authority, not view access.

## Contents

- [Market Grid — playing the game](#market-grid--playing-the-game)
- [Account, ranking & leaderboard](#account-ranking--leaderboard)
- [Market data & context](#market-data--context)
- [Intelligence agents — lifecycle](#intelligence-agents--lifecycle)
- [Agent grid generation](#agent-grid-generation)
- [Agent introspection & journals](#agent-introspection--journals)
- [Strategy — discovery & vocabulary](#strategy--discovery--vocabulary)
- [Strategy — authoring & lifecycle](#strategy--authoring--lifecycle)
- [Trading — signals & entry decisions](#trading--signals--entry-decisions)
- [Trading — positions, orders & outcomes](#trading--positions-orders--outcomes)
- [Deployment policies & radar](#deployment-policies--radar)
- [Market regime](#market-regime)
- [Public agent explorer (other players)](#public-agent-explorer-other-players)
- [Prompts](#prompts)
- [Resources](#resources)


## Market Grid — playing the game

### `list_market_grid_sessions`

*List Market Grid Sessions* — read-only

List Market Grid sessions, optionally filtered by status. Each summary carries the coin-pool
preview, lock and settle times, the full fee and payout structure, and the crowd consensus.
Filter to PENDING to find a session you can still enter — the `sessionId` you get here is
the only valid input to submit_market_grid.

Returns: `sessions`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `status` | enum(PENDING|LIVE|RESOLVING|SETTLED|CANCELLED|SETTLEMENT_QUARANTINED) |  | Filter by session status: PENDING (open for submissions), LIVE (locked and scoring), RESOLVING (market closed, awaiting settlement), SETTLED (final s… |
| `limit` | integer |  | Maximum sessions to return (1-100, default 50) (default `50`) |

### `get_market_grid_session`

*Get Market Grid Session* — read-only

Full detail for one Market Grid session — grid dimensions, the resolved coin pool with
categories, candle timeframe, entry fee, prize pool, jackpot, War Bond contribution, the fee
split, payout bands, and jackpot payout highlights.

Returns: `id`, `gamePresetId`, `gameType`, `displayName`, `status`, `lockAt`, `settleAt`, `chartIntervalMs`, `playerCount`, `createdAt`, `gridRows`, `gridCols`, `gridSize`, `coinPool`, `coinCount`, `timeframe`, `timeRangeKey`, `entryFee`, `prizePool`, `perfectGameJackpot`, `warBondContribution`, `warBondDeployed`, `payoutStructure`, `payoutMultiplier`, `totalPurse`, `feeConfig`, `payoutBandSummary`, `jackpotPayoutHighlights`, `warBondPoolId`, `warBondCycleId`, `hostUserId`, `presetBadgeImageUrl`, `coinCaptainBadges`, `finalScoringSource`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `sessionId` | string | YES | The session UUID to retrieve |

### `check_market_grid_submission`

*Check Market Grid Submission* — read-only

Whether you have already submitted a grid to a session. When you have, the submission id and
timestamp are included — call update_market_grid rather than submit_market_grid in that
case.

Returns: `hasSubmitted`, `submissionId`, `submittedAt`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `sessionId` | string | YES | The session UUID to check |

### `submit_market_grid`

*Submit Market Grid* — **writes** · non-idempotent · **`mcp:wager`**

Submit a Market Grid prediction. Call list_market_grid_sessions with status PENDING first to
get a valid sessionId — never fabricate one. For a paid session the server transfers the
entry fee as part of this call. Each cell carries a coinId, position, prediction (UP/DOWN),
and isCaptain; exactly one cell must be captain. Requires mcp:wager scope.

Returns: `message`, `submissionId`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `sessionId` | string | YES | The session UUID. Must come from list_market_grid_sessions — never generate this value. |
| `grid` | array<object> | YES | Grid cells, each with position, coinId, prediction (UP/DOWN), and isCaptain. Exactly one cell must be captain. |
| `grid[].position` | integer | YES |  |
| `grid[].coinId` | string | YES |  |
| `grid[].prediction` | enum(UP|DOWN) | YES |  |
| `grid[].isCaptain` | boolean | YES |  |
| `reasoning` | string | YES | Your strategic reasoning for these predictions |
| `confidenceScore` | number | YES | Confidence in the predictions (0.0-1.0) |
| `modelName` | string | YES | LLM model used for the analysis |
| `pickReasoning` | array<object> | YES | Per-coin reasoning and confidence, required for at least one pick |
| `pickReasoning[].coinId` | string | YES | Coin id matching a grid cell |
| `pickReasoning[].reasoning` | string | YES | Per-coin analysis reasoning |
| `pickReasoning[].confidence` | number | YES | Per-coin confidence (0.0-1.0) |

### `update_market_grid`

*Update Market Grid* — **writes** · **`mcp:wager`**

Replace your existing Market Grid prediction before the session locks. The sessionId must
come from list_market_grid_sessions — never fabricate one. No further entry fee is charged;
it was paid on the initial submit. Returns the new version number. Requires mcp:wager scope.

Returns: `message`, `submissionId`, `version`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `sessionId` | string | YES | The session UUID. Must come from list_market_grid_sessions — never generate this value. |
| `grid` | array<object> | YES | Grid cells, each with position, coinId, prediction (UP/DOWN), and isCaptain. Exactly one cell must be captain. |
| `grid[].position` | integer | YES |  |
| `grid[].coinId` | string | YES |  |
| `grid[].prediction` | enum(UP|DOWN) | YES |  |
| `grid[].isCaptain` | boolean | YES |  |
| `reasoning` | string | YES | Your strategic reasoning for these predictions |
| `confidenceScore` | number | YES | Confidence in the predictions (0.0-1.0) |
| `modelName` | string | YES | LLM model used for the analysis |
| `pickReasoning` | array<object> | YES | Per-coin reasoning and confidence, required for at least one pick |
| `pickReasoning[].coinId` | string | YES | Coin id matching a grid cell |
| `pickReasoning[].reasoning` | string | YES | Per-coin analysis reasoning |
| `pickReasoning[].confidence` | number | YES | Per-coin confidence (0.0-1.0) |

### `random_submit_market_grid`

*Random Submit Market Grid* — **writes** · non-idempotent · **`mcp:wager`**

Shuffle the coin pool, assign random UP/DOWN predictions, place the captain at position 0,
and submit — one atomic call including the wager. The sessionId must come from
list_market_grid_sessions — never fabricate one. Requires mcp:wager scope.

Returns: `message`, `submissionId`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `sessionId` | string | YES | The session UUID. Must come from list_market_grid_sessions — never generate this value. |
| `reasoning` | string |  | Optional strategic reasoning |
| `confidenceScore` | number |  | Optional confidence in the predictions (0.0-1.0) |
| `modelName` | string |  | Optional LLM model name |

### `get_market_grid_results`

*Get Market Grid Results* — read-only

Results for a settled Market Grid session — the ranked leaderboard with payouts and
outcomes, per-coin resolutions with their on-chain capture provenance, the settled candle
display data, the final coin board, and every player grid with its score breakdown. Results
exist only after settlement: a session in any other status returns CONFLICT naming the
current status, never a partial or placeholder payload.

Returns: `gameType`, `session`, `leaderboard`, `resolutions`, `settledMarketData`, `coinBoard`, `playerGrids`, `players`, `itmCount`, `itmPercent`, `totalPlayers`, `sessionAccuracy`, `totalCorrectCount`, `totalPredictionCount`, `totalUpCount`, `totalDownCount`, `avgNetChangeCapture`, `captureEfficiency`, `dominantBiasPercent`, `dominantBiasDirection`, `coinCaptainBadges`, `gameName`, `gameDuration`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `sessionId` | string | YES | The settled session UUID |

### `get_market_grid_player_grid`

*Get My Market Grid* — read-only

Your submitted grid for a session, with live or settled per-cell scoring, direction
accuracy, captain rank, change capture, jackpot pattern overlay, and the agent attribution
when an agent submitted on your behalf.

Returns: `sessionId`, `userId`, `username`, `avatarUrl`, `submittedAt`, `grid`, `cellScores`, `correctCount`, `totalCount`, `accuracyPercent`, `captainRank`, `totalChangeCapture`, `netChangeCapture`, `jackpotPattern`, `agentId`, `agentDisplayName`, `agentAvatarUrl`, `agentModelImageUrl`, `agentModelName`, `agentConfidence`, `agentConfidencePercent`, `agentReasoning`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `sessionId` | string | YES | The session UUID |

### `get_mcp_reasoning_journal`

*Get MCP Reasoning Journal* — read-only

Your reasoning journal record for a Market Grid session submission — the reasoning,
confidence, model name, client name, and grid pick you supplied when submitting. `entry` is
null when this session has no record for you.

Returns: `entry`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `sessionId` | string | YES | The Market Grid session UUID |

### `list_game_presets`

*List Game Presets* — read-only

List all active game presets showing available game configurations (grid sizes, timeframes,
entry fees).

Returns: `presets`

_No parameters._


## Account, ranking & leaderboard

### `get_account_state`

*Get Account State* — read-only

Get the authenticated user's complete account state: play balance (USDC), game statistics
(level, rank, win rate), and intelligence agent slot usage. Use this to check if you're
ready to play.

Returns: `username`, `balance`, `stats`, `agentSlots`, `mcpWagerEnabled`, `tradingWalletProvisioned`

_No parameters._

### `get_leaderboard`

*Get Leaderboard* — read-only

Get the global leaderboard ranked by a specific metric (PROFIT, VOLUME, or SCORE) and
timeframe.

Returns: `filter`, `leaderboard`, `currentUser`, `generatedAt`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `metric` | enum(PROFIT|VOLUME|SCORE) | YES | Ranking metric: PROFIT, VOLUME, or SCORE |
| `timeframe` | enum(DAILY|WEEKLY|MONTHLY|ALL_TIME) | YES | Time window: DAILY, WEEKLY, MONTHLY, or ALL_TIME |
| `gameType` | enum(MARKET_GRID|COIN_GRID|ALL) |  | Game type filter: MARKET_GRID, COIN_GRID, or ALL (default: ALL) |
| `limit` | integer |  | Maximum entries to return (default: 100) |


## Market data & context

### `get_market_context`

*Get Market Context* — read-only · open-world

Get comprehensive market context with 25 selectable modules. Provide sessionId for session-
scoped context, or primaryTimeframe (5m, 15m, 1h, 4h, 1d) for general market research —
exactly one of the two. Returns GFM markdown sections — the same format Intelligence Agents
use during auto-play. Available modules: priceAction, subTimeframe, rsi, macd, volume,
volatility, bollingerBands, movingAverages, stochastic, fundingRates, openInterest,
relativeStrength, supportResistance, trendStrength, mfi, higherTimeframe, regimeContext,
structureZones, crowdIntelligence, cvd, cvdCrowdConvergence, mtfConfluence, perpSpotFlow,
marketBreadth, referencePairs. Default: ["priceAction", "rsi", "relativeStrength"]. Module 1
(Price Action) is selectable like any other module — included by default, omitted when your
list leaves it out.

Returns: `sessionId`, `presetDisplayName`, `gridSize`, `primaryTimeframe`, `coins`, `sections`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `sessionId` | string |  | Market Grid session UUID (provide this OR primaryTimeframe) |
| `primaryTimeframe` | enum(5m|15m|1h|4h|1d) |  | Candle timeframe for sessionless market research (provide this OR sessionId) |
| `modules` | array<enum(priceAction|subTimeframe|rsi|macd|volume|volatility|bollingerBands|movingAverages,…)> |  | Indicator modules to include. Available: priceAction, subTimeframe, rsi, macd, volume, volatility, bollingerBands, movingAverages, stochastic, fundin… |

### `get_coin_market_context`

*Get Coin Market Context* — read-only · open-world

Full per-coin market context (the indicator modules agents use) for one or more SPECIFIC
coins. Provide tickers (1-100) + a strategy timeframe (an enabled platform timeframe, e.g.
5m/15m/1h/4h/1d). Returns GFM sections per coin. For session/whole-universe context use
get_market_context. Discover the exact canonical tickers via get_coin_metadata.

Returns: `strategyTimeframe`, `coins`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `tickers` | array<string> | YES | 1-100 canonical coin tickers from get_coin_metadata (the "ticker" field, e.g. "BTC", "ETH", "PEPE"). Case-sensitive — do NOT alter casing. The k-pref… |
| `strategyTimeframe` | enum(1m|3m|5m|15m|30m|1h|2h|4h,…) | YES | Strategy timeframe — an enabled platform timeframe (e.g. 5m, 15m, 1h, 4h, 1d). |
| `modules` | array<enum(priceAction|subTimeframe|rsi|macd|volume|volatility|bollingerBands|movingAverages,…)> |  | Indicator modules. Available: priceAction, subTimeframe, rsi, macd, volume, volatility, bollingerBands, movingAverages, stochastic, fundingRates, ope… |

### `get_coin_metadata`

*Get Coin Metadata* — read-only · open-world

The tradable coin universe with per-coin metadata — ticker, name, exchange symbols, size
decimals, max leverage, asset class, category, and whether the coin is enabled.

Returns: `coins`

_No parameters._

### `get_coin_candles`

*Get Coin Candles* — read-only · open-world

Recent CLOSED OHLCV candles for one coin at a candle interval. Forming candles are never
returned.

Returns: `candles`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `ticker` | string | YES | Coin ticker, e.g. "BTC" or "ETH" (case-insensitive) |
| `interval` | enum(1m|3m|5m|15m|30m|1h|2h|4h,…) | YES | Candle interval |
| `limit` | integer |  | Number of closed candles (1-100, default 20) (default `20`) |

### `get_coin_performance_history`

*Get Coin Performance History* — read-only · open-world

Time-series of historical performance metrics for one coin at an interval — signed change
and its absolute-value rank, RSI activity and rank, volume ratio and rank. A metric is null
when the underlying series has no value at that timestamp.

Returns: `history`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `ticker` | string | YES | Coin ticker, e.g. "BTC" or "ETH" (case-insensitive) |
| `interval` | enum(1m|3m|5m|15m|30m|1h|2h|4h,…) | YES | Candle interval |
| `count` | integer |  | Number of metric sets (1-100, default 10) (default `10`) |

### `get_top_ranked_coins`

*Get Top Ranked Coins* — read-only · open-world

Top N coins by a discovery metric over a candle interval. `latestMetricValue` is signed
change for abs_change, RSI activity for rsi_activity, and the volume ratio for volume.

Returns: `coins`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `metric` | enum(abs_change|rsi_activity|volume) | YES | Ranking metric: abs_change, rsi_activity, or volume |
| `interval` | enum(1m|3m|5m|15m|30m|1h|2h|4h,…) | YES | Candle interval |
| `limit` | integer |  | Top N (1-100, default 25) (default `25`) |

### `get_macd_heatmap`

*Get MACD Heatmap* — read-only · open-world

Full MACD heatmap for a heatmap interval — per-coin PPO histogram across all four intervals,
price and 24h change, latest crossover signal, and exchange market stats, plus market-wide
bullish/bearish aggregates.

Returns: `meta`, `aggregates`, `data`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `timeframe` | enum(15m|1h|4h|1d) |  | Heatmap interval — PPO is computed for these four only (default 1h) (default `1h`) |
| `exchange` | enum(BINANCE|HYPERLIQUID) |  | Exchange source (default `HYPERLIQUID`) |
| `limit` | integer |  | Max symbols (1-100, default 100) (default `100`) |

### `get_coin_signal_preview`

*Get Coin Signal Preview* — read-only · open-world

Preview the signal pipeline for one coin at an interval — every evaluated signal (each
carrying its own `triggered` flag), the dominant bias, the aggregate score percent, the
conflict flag, and the comparison basket. Supply agentId to overlay that agent's weighting;
`isAgentWeighted` reports which path ran. A preview has no committed trade assessment, so it
carries no direction.

Returns: `coinTicker`, `coinName`, `coinImageUrl`, `currentPrice`, `priceChangePercent`, `dominantBias`, `aggregateScorePercent`, `hasConflictingSignals`, `allEvaluatedSignals`, `isAgentWeighted`, `comparison`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `ticker` | string | YES | Coin ticker, e.g. "BTC" or "ETH" (case-insensitive) |
| `interval` | enum(1m|3m|5m|15m|30m|1h|2h|4h,…) | YES | Signal interval — an enabled platform timeframe |
| `agentId` | string |  | One of your agent UUIDs, to overlay that agent's weighting. Omit for the default unweighted preview. |

### `get_agent_coin_qualification`

*Get Agent Coin Qualification* — read-only · open-world

Pre-qualify coins against one of your own agents' gates — candidate-level construction,
aggregate score, required-signal count, and the ATR% volatility floor — without spending an
LLM call. Each verdict carries per-direction detail and the first gate that failed in live
order.

Returns: `verdicts`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `agentId` | string | YES | One of your agent UUIDs |
| `coinTickers` | array<string> | YES | 1-12 coin tickers to screen, e.g. ["BTC", "ETH"] |


## Intelligence agents — lifecycle

### `list_intelligence_agents`

*List Intelligence Agents* — read-only

List the user's private intelligence agents. Returns each agent's id, display name,
lifecycle status, revision, strategy binding provenance (strategyId, strategyRevision,
strategyName, bindingState), behavior profile, materialized trading config, and performance
summary. Defaults to ACTIVE agents only; pass statuses to include ARCHIVED ones — that is
how you find an archived agent to reactivate, since permanent delete is not available over
MCP.

Returns: `agents`, `slotUsage`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `statuses` | array<enum(ACTIVE|ARCHIVED)> |  | Lifecycle states to return. Omit for ACTIVE only. Use ["ACTIVE","ARCHIVED"] for the full owned fleet, or ["ARCHIVED"] to find an agent to reactivate. |

### `get_intelligence_agent`

*Get Intelligence Agent* — read-only

Get full configuration for a specific intelligence agent including behavior profile, context
sources, and overlay text. Used for building specialist prompts.

Returns: `agent`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `agentId` | string | YES | Intelligence agent UUID to retrieve |

### `create_intelligence_agent`

*Create Intelligence Agent* — **writes** · non-idempotent

Create an intelligence agent by selecting a strategy and approved LLM model, then optionally
supplying one complete agent-owned trading configuration. Strategy-owned context, report,
rules, prose, and timeframe are materialized from strategyId. Agent slots are limited by
player rank and level.

Returns: `agent`, `slotUsage`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `displayName` | string | YES | Agent display name (1-80 characters) |
| `brain` | anyOf[object | object] | YES | Either a named BRAIN preset or a custom model + behavior. Never both. |
| `brain` *(anyOf variant 1)* | object | |  |
| `brain<1>.kind` | string | YES |  |
| `brain<1>.preset` | enum(MONTGOMERY|KESSELRING|CHUIKOV|EISENHOWER|ZHUKOV|NIMITZ|BRADLEY|ROMMEL,…) | YES | Named BRAIN preset (MONTGOMERY/KESSELRING/CHUIKOV/EISENHOWER/ZHUKOV/NIMITZ/BRADLEY/ROMMEL/PATTON/YAMAMOTO). It carries its own model AND trader soul,… |
| `brain` *(anyOf variant 2)* | object | |  |
| `brain<2>.kind` | string | YES |  |
| `brain<2>.modelId` | string | YES | Approved LLM model ID — use list_approved_models for valid values. |
| `brain<2>.behavior` | object | YES | Agent behavior profile |
| `brain<2>.behavior.risk` | enum(CONSERVATIVE|MODERATE|AGGRESSIVE) | YES | Risk tolerance |
| `brain<2>.behavior.outlook` | enum(OPTIMIST|REALIST|PESSIMIST) | YES | Market outlook — optimist / realist / pessimist |
| `brain<2>.behavior.conviction` | enum(CAUTIOUS|MEASURED|BOLD) | YES | Signal confidence threshold |
| `strategyId` | string | YES | Strategy to bind — a SYSTEM strategy or one you own. Its context modules, signal rules, prose, and timeframe are materialized onto the agent. Use lis… |
| `tradingConfig` | object |  | Optional trading configuration applied at create: mode, capital and execution limits (including maxConcurrentExposureUsd, maxCumulativeDrawdownUsd, a… |
| `tradingConfig.tradingMode` | enum(OFF|APPROVAL_REQUIRED|FULL_EXECUTION) | YES | OFF = no signals, APPROVAL_REQUIRED = evaluate + require manual accept, FULL_EXECUTION = auto-execute — required when tradingConfig is provided |
| `tradingConfig.minAllocationUsd` | number | YES | Minimum order size in USD (registry-bound) — required when tradingConfig is provided |
| `tradingConfig.maxDailyTrades` | integer | YES | Maximum trades per day (1-registry maximum) — required when tradingConfig is provided |
| `tradingConfig.balanceThresholdUsd` | number | YES | Minimum wallet equity to allow trading (registry-bound) — required when tradingConfig is provided |
| `tradingConfig.maxLeverage` | number | YES | Maximum leverage multiplier (registry-bound × 20x HL ceiling) — required when tradingConfig is provided |
| `tradingConfig.maxSlippageBps` | integer | YES | Max entry slippage in bps (registry-bound). Integer — required when tradingConfig is provided |
| `tradingConfig.maxConcurrentExposureUsd` | number | YES | Ceiling on capital simultaneously at risk, USD (0 = unset) |
| `tradingConfig.maxCumulativeDrawdownUsd` | number | YES | Cumulative realized-loss stop, USD (0 = no stop) |
| `tradingConfig.maxDailyLossUsd` | number | YES | Per-UTC-day realized-loss stop, USD (0 = no daily limit) |
| `tradingConfig.signalTimeoutMinutes` | enum(5|10|15) | YES | Signal approval window in minutes (5, 10, or 15) — APPROVAL_REQUIRED mode — required when tradingConfig is provided |
| `tradingConfig.maxEntryDeviationAtrMultiple` | number | YES | Max entry price deviation as ATR multiple (registry-bound) — required when tradingConfig is provided |
| `tradingConfig.minTradeConviction` | number | YES | Agent-level trade conviction base 0-1 — the default bar a deployment inherits; required when tradingConfig is provided |
| `tradingConfig.gridMinConfidence` | number | YES | Agent-level grid confidence base 0-1 — the default bar a deployment slot inherits; required when tradingConfig is provided |
| `tradingConfig.positionSizePresets` | object | YES | Position sizing presets with monotonic ordering constraint — required when tradingConfig is provided |
| `tradingConfig.positionSizePresets.sizingStrategy` | enum(MANUAL|VOLATILITY_AUTO) | YES | Position sizing strategy: MANUAL uses preset percentages, VOLATILITY_AUTO adjusts based on ATR |
| `tradingConfig.positionSizePresets.smallPct` | number | YES | Small position size as percentage of balance (0.5-100) |
| `tradingConfig.positionSizePresets.mediumPct` | number | YES | Medium position size as percentage of balance (0.5-100) |
| `tradingConfig.positionSizePresets.largePct` | number | YES | Large position size as percentage of balance (0.5-100) |
| `tradingConfig.positionManagement` | object | YES | Position management configuration for post-entry protection adjustments |
| `tradingConfig.positionManagement.positionManagementPreset` | enum(COLT|WEBLEY|BERETTA|LUGER|WALTHER|CUSTOM) | YES | Position management preset: COLT (patient/wide), BERETTA (balanced), LUGER (aggressive/tight), WALTHER (hair-trigger/max-tight), CUSTOM (manual) — re… |
| `tradingConfig.positionManagement.enabled` | boolean | YES |  |
| `tradingConfig.positionManagement.breakEvenEnabled` | boolean | YES |  |
| `tradingConfig.positionManagement.breakEvenTriggerR` | number | YES |  |
| `tradingConfig.positionManagement.trailingEnabled` | boolean | YES |  |
| `tradingConfig.positionManagement.trailingGivebackPct` | number | YES |  |
| `tradingConfig.positionManagement.trailingBufferPct` | number | YES |  |
| `tradingConfig.positionManagement.timeDecayEnabled` | boolean | YES |  |
| `tradingConfig.positionManagement.timeDecayGracePeriodMinutes` | integer | YES |  |
| `tradingConfig.positionManagement.timeDecayIntervalMinutes` | integer | YES |  |
| `tradingConfig.positionManagement.timeDecayTightenPct` | number | YES |  |
| `tradingConfig.positionManagement.timeDecayMaxTightenPct` | number | YES |  |
| `tradingConfig.positionManagement.timeDecayStaleThresholdTpProgressPct` | number | YES |  |
| `idempotencyKey` | string |  | Caller-generated key, 8-255 chars. A retry with the same key returns the original result rather than repeating the command. |

### `update_intelligence_agent`

*Update Intelligence Agent* — **writes** · **destructive** · non-idempotent

Update an existing private intelligence agent: display name, brain (model/behavior or
preset), and trading configuration. Supply at least one mutable field. A complete
tradingConfig is optional for non-config updates. Requires expectedRevision from the latest
read for optimistic concurrency; SYSTEM agents are immutable. Strategy REBINDING is not part
of this command — use rebind_intelligence_agent, which is separately confirmed.

Returns: `agent`, `feasibilityAdvisory`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `agentId` | string | YES | Intelligence agent UUID to update |
| `expectedRevision` | integer | YES | Current agent revision (from the latest read). The update is rejected with a CONFLICT error if the stored revision has advanced. |
| `displayName` | string |  | New display name |
| `behavior` | object |  | Non-empty partial behavior profile update |
| `behavior.risk` | enum(CONSERVATIVE|MODERATE|AGGRESSIVE) |  | Risk tolerance |
| `behavior.outlook` | enum(OPTIMIST|REALIST|PESSIMIST) |  | Market outlook — optimist / realist / pessimist |
| `behavior.conviction` | enum(CAUTIOUS|MEASURED|BOLD) |  | Signal confidence threshold |
| `modelId` | string |  | New LLM model ID |
| `brainPreset` | enum(MONTGOMERY|KESSELRING|CHUIKOV|EISENHOWER|ZHUKOV|NIMITZ|BRADLEY|ROMMEL,…) |  | Named BRAIN preset (MONTGOMERY/KESSELRING/CHUIKOV/EISENHOWER/ZHUKOV/NIMITZ/BRADLEY/ROMMEL/PATTON/YAMAMOTO) — replaces modelId + behavior when supplie… |
| `tradingConfig` | object |  | Optional complete trading configuration. When provided, every nested field is required. Omit it for a non-config update. |
| `tradingConfig.tradingMode` | enum(OFF|APPROVAL_REQUIRED|FULL_EXECUTION) | YES | OFF = no signals, APPROVAL_REQUIRED = evaluate + require manual accept, FULL_EXECUTION = auto-execute — required when tradingConfig is provided |
| `tradingConfig.minAllocationUsd` | number | YES | Minimum order size in USD (registry-bound) — required when tradingConfig is provided |
| `tradingConfig.maxDailyTrades` | integer | YES | Maximum trades per day (1-registry maximum) — required when tradingConfig is provided |
| `tradingConfig.balanceThresholdUsd` | number | YES | Minimum wallet equity to allow trading (registry-bound) — required when tradingConfig is provided |
| `tradingConfig.maxLeverage` | number | YES | Maximum leverage multiplier (registry-bound × 20x HL ceiling) — required when tradingConfig is provided |
| `tradingConfig.maxSlippageBps` | integer | YES | Max entry slippage in bps (registry-bound). Integer — required when tradingConfig is provided |
| `tradingConfig.maxConcurrentExposureUsd` | number | YES | Ceiling on capital simultaneously at risk, USD (0 = unset) |
| `tradingConfig.maxCumulativeDrawdownUsd` | number | YES | Cumulative realized-loss stop, USD (0 = no stop) |
| `tradingConfig.maxDailyLossUsd` | number | YES | Per-UTC-day realized-loss stop, USD (0 = no daily limit) |
| `tradingConfig.signalTimeoutMinutes` | enum(5|10|15) | YES | Signal approval window in minutes (5, 10, or 15) — APPROVAL_REQUIRED mode — required when tradingConfig is provided |
| `tradingConfig.maxEntryDeviationAtrMultiple` | number | YES | Max entry price deviation as ATR multiple (registry-bound) — required when tradingConfig is provided |
| `tradingConfig.minTradeConviction` | number | YES | Agent-level trade conviction base 0-1 — the default bar a deployment inherits; required when tradingConfig is provided |
| `tradingConfig.gridMinConfidence` | number | YES | Agent-level grid confidence base 0-1 — the default bar a deployment slot inherits; required when tradingConfig is provided |
| `tradingConfig.positionSizePresets` | object | YES | Position sizing presets with monotonic ordering constraint — required when tradingConfig is provided |
| `tradingConfig.positionSizePresets.sizingStrategy` | enum(MANUAL|VOLATILITY_AUTO) | YES | Position sizing strategy: MANUAL uses preset percentages, VOLATILITY_AUTO adjusts based on ATR |
| `tradingConfig.positionSizePresets.smallPct` | number | YES | Small position size as percentage of balance (0.5-100) |
| `tradingConfig.positionSizePresets.mediumPct` | number | YES | Medium position size as percentage of balance (0.5-100) |
| `tradingConfig.positionSizePresets.largePct` | number | YES | Large position size as percentage of balance (0.5-100) |
| `tradingConfig.positionManagement` | object | YES | Position management configuration for post-entry protection adjustments |
| `tradingConfig.positionManagement.positionManagementPreset` | enum(COLT|WEBLEY|BERETTA|LUGER|WALTHER|CUSTOM) | YES | Position management preset: COLT (patient/wide), BERETTA (balanced), LUGER (aggressive/tight), WALTHER (hair-trigger/max-tight), CUSTOM (manual) — re… |
| `tradingConfig.positionManagement.enabled` | boolean | YES |  |
| `tradingConfig.positionManagement.breakEvenEnabled` | boolean | YES |  |
| `tradingConfig.positionManagement.breakEvenTriggerR` | number | YES |  |
| `tradingConfig.positionManagement.trailingEnabled` | boolean | YES |  |
| `tradingConfig.positionManagement.trailingGivebackPct` | number | YES |  |
| `tradingConfig.positionManagement.trailingBufferPct` | number | YES |  |
| `tradingConfig.positionManagement.timeDecayEnabled` | boolean | YES |  |
| `tradingConfig.positionManagement.timeDecayGracePeriodMinutes` | integer | YES |  |
| `tradingConfig.positionManagement.timeDecayIntervalMinutes` | integer | YES |  |
| `tradingConfig.positionManagement.timeDecayTightenPct` | number | YES |  |
| `tradingConfig.positionManagement.timeDecayMaxTightenPct` | number | YES |  |
| `tradingConfig.positionManagement.timeDecayStaleThresholdTpProgressPct` | number | YES |  |

### `rebind_intelligence_agent`

*Rebind Intelligence Agent* — **writes** · **destructive** · non-idempotent

DESTRUCTIVE: rebind an agent to a different strategy. The target strategy's active revision
is materialized onto the agent, REPLACING its current context modules, signal rules, prose,
and timeframe — this is not a merge. Agent-owned settings (display name, brain, trading
configuration) are untouched; edit those with update_intelligence_agent. Requires
expectedRevision from the latest read and confirm:true. Returns the agent with its new
revision and strategy provenance.

Returns: `agent`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `agentId` | string | YES | Intelligence agent UUID to rebind |
| `strategyId` | string | YES | Target strategy — a SYSTEM strategy or one you own. Its context modules, signal rules, prose, and timeframe REPLACE the ones currently materialized o… |
| `expectedRevision` | integer | YES | Current agent revision from the latest read. Rejected with CONFLICT if the stored revision has advanced, so two clients rebinding from the same read … |
| `confirm` | boolean | YES | Acknowledgement that rebinding REPLACES the agent's materialized configuration. Only `true` is accepted. |
| `idempotencyKey` | string |  | Caller-generated key, 8-255 chars. A retry with the same key returns the original result rather than repeating the command. |

### `archive_intelligence_agent`

*Archive Intelligence Agent* — **writes** · **destructive** · non-idempotent

Archive an intelligence agent (ACTIVE -> ARCHIVED). This is the RECOVERABLE lifecycle —
reverse it with activate_intelligence_agent; permanent deletion is not available over MCP.
Archived agents stop entering games and signal evaluations, and remain discoverable via
list_intelligence_agents with statuses ["ARCHIVED"]. In-flight PROPOSED decisions remain
actionable via accept_entry_decision / cancel_entry_decision. Archiving is REFUSED while the
agent is deployed to a preset, holds an open or pending position, or is active in an
unsettled session — the CONFLICT names every unresolved precondition in
details.archiveBlockers, each with a typed reason (DEPLOYED / OPEN_TRADES / ACTIVE_SESSION)
and a count, so you can clear them and retry. Requires expectedRevision for optimistic
concurrency.

Returns: `agent`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `agentId` | string | YES | Intelligence agent UUID |
| `expectedRevision` | integer | YES | Current agent revision (from the latest read). |

### `activate_intelligence_agent`

*Activate Intelligence Agent* — **writes** · non-idempotent

Activate an archived intelligence agent (ARCHIVED -> ACTIVE). Subject to the per-rank
private-agent slot limit. Requires expectedRevision for optimistic concurrency.

Returns: `agent`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `agentId` | string | YES | Intelligence agent UUID |
| `expectedRevision` | integer | YES | Current agent revision (from the latest read). |

### `list_approved_models`

*List Approved Models* — read-only

List all approved LLM models available for intelligence agents. Use the returned modelId
values when creating or updating agents.

Returns: `models`

_No parameters._

### `get_trading_config_catalog`

*Get Trading Config Catalog* — read-only

Trading-config vocabulary in one call: position-management presets
(COLT/BERETTA/LUGER/WALTHER) + trading defaults and valid bounds (min/max ranges).
`tradingConfig` is an input to BOTH create_intelligence_agent and update_intelligence_agent
— read these values before either call, and never guess a bound. (Signal presets are retired
— the signal-gate/stop-loss/R:R fields are set directly.)

Returns: `positionManagementPresets`, `tradingDefaults`

_No parameters._


## Agent grid generation

### `generate_agent_grid`

*Generate Agent Grid* — **writes** · non-idempotent · open-world

Generate a grid recommendation using the user's Intelligence Agent. Returns the agent's grid
pick with confidence score and reasoning. This is a PROPOSAL: nothing is wagered and no
session is entered until you call submit_agent_grid, so it needs only mcp:read. Each call
spends a billed LLM inference and replaces any previously generated pick for this session
and agent.

Returns: `gridPick`, `confidence`, `confidenceThreshold`, `meetsThreshold`, `reasoning`, `agentDisplayName`, `isUpdate`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `sessionId` | string | YES | The Market Grid session UUID. Must be obtained from list_market_grid_sessions — never fabricate this value. |
| `agentId` | string | YES | The Intelligence Agent UUID. Must be obtained from list_intelligence_agents. |

### `submit_agent_grid`

*Submit Agent Grid* — **writes** · non-idempotent · **`mcp:wager`**

Submit a previously generated agent grid. Must be called after generate_agent_grid. The grid
is submitted with full audit trail including thought log, activity event, and LLM call log
linkage. Requires mcp:wager scope.

Returns: `submissionId`, `message`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `sessionId` | string | YES | The Market Grid session UUID. Must be obtained from list_market_grid_sessions — never fabricate this value. |
| `agentId` | string | YES | The Intelligence Agent UUID. Must be obtained from list_intelligence_agents. |

### `get_agent_automation_status`

*Get Agent Automation Status* — read-only

Get an agent's current preset assignments (what it's auto-playing) and all available presets
it can be assigned to.

Returns: `username`, `assignments`, `assignablePresets`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `agentId` | string | YES | Intelligence agent UUID to check automation status for |


## Agent introspection & journals

### `get_agent_journal`

*Get Agent Journal* — read-only

Get an agent's recent performance journal: thought log entries (decisions + reasoning),
activity events, and session summaries. Use this to monitor how your agent is performing.

Returns: `username`, `recentThoughts`, `recentActivity`, `recentGames`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `agentId` | string | YES | Intelligence agent UUID to get journal for |
| `limit` | integer |  | Number of entries per section (default: 10, max: 50) |

### `get_agent_thought_log`

*Get Agent Thought Log* — read-only

Paginated reasoning journal for one of your agents — one entry per decision cycle, carrying
the market snapshot the agent saw, its written reasoning, the parsed grid picks, and its
confidence against the configured threshold.

Returns: `entries`, `total`, `page`, `limit`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `agentId` | string | YES | One of your intelligence agent UUIDs |
| `page` | integer |  | Page number (default 1) (default `1`) |
| `limit` | integer |  | Results per page (1-50, default 20) (default `20`) |

### `get_agent_activity_feed`

*Get Agent Activity Feed* — read-only

Paginated activity feed for one of your agents — lifecycle, trade, funding, halt, and
deployment events, newest first.

Returns: `events`, `total`, `page`, `limit`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `agentId` | string | YES | One of your intelligence agent UUIDs |
| `page` | integer |  | Page number (default 1) (default `1`) |
| `limit` | integer |  | Results per page (1-50, default 20) (default `20`) |

### `get_user_thought_log`

*Get All Agents Thought Log* — read-only

Paginated reasoning journal aggregated across ALL your agents, newest first.

Returns: `entries`, `total`, `page`, `limit`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `page` | integer |  | Page number (default 1) (default `1`) |
| `limit` | integer |  | Results per page (1-50, default 20) (default `20`) |

### `get_user_activity_feed`

*Get All Agents Activity Feed* — read-only

Paginated activity feed aggregated across ALL your agents, newest first.

Returns: `events`, `total`, `page`, `limit`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `page` | integer |  | Page number (default 1) (default `1`) |
| `limit` | integer |  | Results per page (1-50, default 20) (default `20`) |

### `get_agent_budget`

*Get Agent Risk Budget* — read-only

Read an agent's live risk budget: the two static ceilings (maxConcurrentExposureUsd,
maxCumulativeDrawdownUsd) plus server-computed live state — capital at risk now, remaining
headroom (the sizing base), realized P&L and drawdown since baseline, today's realized P&L
and trade count against the daily stops, owner account equity, and the effective notional
the current headroom authorizes. `gauges` carries the four guardrail meters (dailyTrades,
exposure, drawdown, dailyLoss) already resolved to fill/remaining/configured/breached —
render them, never re-derive. `configured: false` means no limit is set, which is NOT a
limit of zero. `haltReason` names why the agent is halted, and decides whether resume alone
is enough.

Returns: `budget`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `agentId` | string | YES | Intelligence agent UUID. Discover via list_intelligence_agents. |

### `get_agent_performance`

*Get Agent Performance* — read-only

Read an agent's realized performance since its budget baseline: cumulative realized P&L
(trade net P&L plus wager payout minus stake), the peak-to-trough drawdown of that curve,
the drawdown stop it is measured against, and `pnlCurveUsd` — one point per settlement,
oldest-first, for a sparkline. An empty curve means no settlements yet, not missing data.

Returns: `performance`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `agentId` | string | YES | Intelligence agent UUID. Discover via list_intelligence_agents. |

### `get_agent_fund_allocation`

*Get Agent Fund Allocation* — read-only

Read an agent's funding envelope: spendable balance, funds committed to in-flight wagers and
trade margin, lifetime allocated and recalled totals, the halt timestamp, and the per-trade
push flag. Allocating and recalling funds are deliberately NOT available over MCP — this is
a read.

Returns: `allocation`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `agentId` | string | YES | Intelligence agent UUID. Discover via list_intelligence_agents. |

### `get_agent_explorer`

*Get Agent Explorer* — read-only

Agent discovery list for a stats window, sorted by net P&L, win rate, or trade count. Each
entry is a resume: identity and owner, windowed KPIs, best/worst trade, a 12-bucket P&L
sparkline, the public config spec (behavior, the 21 market-intel modules, trading spec,
strategy name), and a server-authored subtitle and operating spec. Also carries header
stats, model-vendor aggregations, top movers by ROI over the full filtered population, and
your own agents' positions in this sort on `currentUser`. The private edge — overlay
content, per-signal weights, position-size tuning, the daily trade cap — is never exposed.

Returns: `filter`, `stats`, `aggregations`, `entries`, `currentUser`, `generatedAt`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `timeframe` | enum(DAILY|WEEKLY|MONTHLY|ALL_TIME) |  | Performance window (default ALL_TIME) (default `ALL_TIME`) |
| `sortBy` | enum(NET_PNL|WIN_RATE|TRADE_COUNT) |  | Sort column (default NET_PNL) (default `NET_PNL`) |
| `search` | string |  | Filter by agent name (substring match) |
| `limit` | integer |  | Entries to return (1-100) (default `100`) |

### `get_agents_hub`

*Get Agents Hub* — read-only

Where every agent you own is right now, in one call. Each roster row carries the server-
computed `hubStatus` at its declared precedence — AWAITING_APPROVAL, then IN_TRADE, then
RADAR_ARMED, then ARENA_DEPLOYED, then IDLE — alongside the itemized footprint behind it:
the open positions (symbol, side, leverage), the radar coins with their coinId, and the
arena presets with their gamePresetId, so you can jump straight to get_radar_deployment or
get_deployment_policy. Each list's length equals its matching count field. Rows also carry
realized net P&L, trailing-24h LLM spend, and the read-only permission envelope (strategy
name, trading mode, leverage and daily-trade ceilings, exposure budget, sizing preset,
timeframes) — null exactly when the agent is ARCHIVED. `summary` totals the roster and adds
the daily conversational-message meter. Prefer this over rebuilding the same picture from
list_intelligence_agents + list_radar_deployments + list_deployment_policies +
list_pending_approvals + list_user_active_positions: the status precedence is decided here,
once.

Returns: `rows`, `summary`

_No parameters._

### `get_agent_conviction_calibration`

*Get Agent Conviction Calibration* — read-only

Does one of your agents' STATED conviction actually predict its outcomes — the feedback loop
for every conviction bar you can set (the agent base in tradingConfig.minTradeConviction, a
deployment slot's minConviction, a per-coin rule's). Groups the agent's closed trades over
the rolling window into the decide_trade prompt's own rubric bands (LOW / MODERATE / HIGH —
fixed boundaries, not quantiles, so two agents are comparable) per asset class, and
separately by the arena deployment rule that fired them, so you can see whether the bull-
rule slot really trades better than the bear one. Every group is discriminated on readiness:
below the minimum sample size a group carries INSUFFICIENT_DATA and a sampleSize and NO rate
at all — there is deliberately no win rate to read off a sample too small to support one. A
READY group adds winRate (and its pre-computed percent), average net P&L, and the provenance
mix naming which inheritance layer's bar each trade passed. `slices` is empty when the agent
closed no trades in the window; `deploymentRules` is empty when no closed trade carries an
arena rule stamp — conversational and radar trades never do.

Returns: `calibration`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `agentId` | string | YES | Intelligence agent UUID you own |

### `get_agent_decision_context`

*Get Agent Decision Context* — read-only

The pre-decision context your agents evaluated for a coin — the decision and signal-log ids,
direction, conviction, planned entry, horizon, and the effective protection levels with
their order ids. `context` is null when no context is available for that coin.

Returns: `context`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `coinTicker` | string | YES | Coin ticker, e.g. "BTC" |

### `get_agent_prompt_context_preview`

*Get Agent Prompt Context Preview* — read-only · open-world

Preview the full assembled prompt an agent will receive (system prompt + context sections +
overlay). Provide sessionId OR primaryTimeframe.

Returns: `preview`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `agentId` | string | YES | Agent UUID. |
| `gameType` | enum(MARKET_GRID|COIN_GRID) | YES | Game type the preview targets. |
| `sessionId` | string |  | Session to preview against. Provide this OR primaryTimeframe. |
| `primaryTimeframe` | enum(5m|15m|1h|4h|1d) |  | Timeframe to preview. Provide this OR sessionId. |

### `get_context_sources_preview`

*Get Context Sources Preview* — read-only · open-world

Preview the live per-source context an agent would receive. Returns all 22 entries of the
assembled context: the 21 TOGGLEABLE sources, whose `enabled` reflects the agent's own
configuration, plus `sessionContext`, which is always on and cannot be switched off. Provide
sessionId OR primaryTimeframe, never both.

Returns: `sources`, `snapshotTimestamp`, `sessionId`, `primaryTimeframe`, `coinCount`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `agentId` | string | YES | Agent UUID. |
| `gameType` | enum(MARKET_GRID|COIN_GRID) | YES | Game type the preview targets. |
| `sessionId` | string |  | Session to preview against. Provide this OR primaryTimeframe. |
| `primaryTimeframe` | enum(5m|15m|1h|4h|1d) |  | Timeframe to preview. Provide this OR sessionId. |

### `get_context_source_full_preview`

*Get Context Source Full Preview* — read-only · open-world

Full GFM content + token count for ONE context source. `sourceKey` is any of the 21
toggleable source keys or `sessionContext`; take the value from get_context_sources_preview
rather than composing it. Provide sessionId OR primaryTimeframe, never both.

Returns: `sourceKey`, `displayName`, `content`, `estimatedTokenCount`, `tokenCountModel`, `snapshotTimestamp`, `coinCount`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `gameType` | enum(MARKET_GRID|COIN_GRID) | YES | Game type. |
| `sourceKey` | enum(includePriceAction|includeSubTimeframe|includeRsi|includeMacd|includeVolume|includeVolatility|includeBollingerBands|includeMovingAverages,…) | YES | Context source key — one of the toggleable modules or "sessionContext". |
| `sessionId` | string |  | Session to preview against. Provide this OR primaryTimeframe. |
| `primaryTimeframe` | enum(5m|15m|1h|4h|1d) |  | Timeframe. Provide this OR sessionId. |

### `get_agent_game_history`

*Get Agent Game History* — read-only

Paginated Market Grid game history for one of your agents over a rolling window — per-game
grid picks with their settled scoring, placement, accuracy, change capture, and payout
split, plus the owner-only LLM telemetry on `ownerView`.

Returns: `entries`, `total`, `page`, `limit`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `agentId` | string | YES | One of your intelligence agent UUIDs |
| `timeframe` | enum(1D|7D|30D|LIFETIME) |  | Rolling window (default LIFETIME) (default `LIFETIME`) |
| `page` | integer |  | Page number (default 1) (default `1`) |
| `limit` | integer |  | Results per page (1-50, default 20) (default `20`) |

### `get_user_agent_game_history`

*Get All Agents Game History* — read-only

Paginated Market Grid game history aggregated across ALL your agents over a rolling window,
newest first.

Returns: `entries`, `total`, `page`, `limit`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `timeframe` | enum(1D|7D|30D|LIFETIME) |  | Rolling window (default LIFETIME) (default `LIFETIME`) |
| `page` | integer |  | Page number (default 1) (default `1`) |
| `limit` | integer |  | Results per page (1-50, default 20) (default `20`) |


## Strategy — discovery & vocabulary

### `list_strategies`

*List Strategies* — read-only

List the visible SYSTEM catalog and owned PRIVATE strategies with revision, lifecycle,
usage, and quota summaries. Include inactive owned strategies when preparing a RESTORE plan.

Returns: `strategies`, `quota`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `includeInactive` | boolean |  |  |

### `get_strategy`

*Get Strategy* — read-only

Get one active visible strategy by default, with its complete report, dense signal
scorecard, setup gates, lifecycle state, usage counts, and current revision. Set
includeInactive:true only to load an owned PRIVATE strategy, including an inactive revision
required for RESTORE planning; foreign PRIVATE strategies remain hidden.

Returns: `strategy`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `strategyId` | string | YES |  |
| `includeInactive` | boolean |  |  |

### `list_strategy_categories`

*List Strategy Categories* — read-only

Start report authoring here. List canonical metric categories with focused guidance and
examples, then pass one returned category to list_strategy_vocabulary.

Returns: `categories`

_No parameters._

### `list_strategy_vocabulary`

*List Strategy Vocabulary* — read-only

List compact report-authoring vocabulary for one category, including metrics, transforms,
timeframe references, budgets, enabled timeframes, and template summaries.

Returns: `category`, `metrics`, `transforms`, `timeframeRefs`, `budgets`, `previewExecutionLimits`, `timeframes`, `templates`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `category` | enum(price|momentum|trend|volatility|volumeFlow|derivatives|structure|regime,…) | YES | One canonical metric family returned by list_strategy_categories. |

### `get_metric_construction_hints`

*Get Metric Construction Hints* — read-only

Get the canonical native value contract and executable transform-authoring hints for one
metric returned by list_strategy_vocabulary.

Returns: `metric`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `metric` | enum(OPEN|HIGH|LOW|CLOSE|LAST|MARK|ORACLE|SPOT_CLOSE_CB,…) | YES | Canonical metric key returned by list_strategy_vocabulary. |

### `get_strategy_column_contract`

*Get Strategy Column Contract* — read-only

Compile one proposed strategy-report column into its normalized parameters, output contract,
formula semantics, timeframe contract, and null presentation without reading market values.

Returns: `contract`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `column` | object | YES |  |
| `column.metric` | enum(OPEN|HIGH|LOW|CLOSE|LAST|MARK|ORACLE|SPOT_CLOSE_CB,…) | YES |  |
| `column.transformId` | string | YES |  |
| `column.chainedTransformId` | string |  |  |
| `column.timeframe` | anyOf[object | object] | YES |  |
| `column.timeframe` *(anyOf variant 1)* | object | |  |
| `column.timeframe<1>.rel` | enum(anchor|lower|higher|regime) | YES |  |
| `column.timeframe` *(anyOf variant 2)* | object | |  |
| `column.timeframe<2>.abs` | enum(1m|3m|5m|15m|30m|1h|2h|4h,…) | YES |  |
| `column.window` | integer |  |  |
| `column.offset` | integer |  |  |
| `column.side` | enum(support|resistance) |  |  |
| `column.inputs` | array<object> |  |  |
| `column.inputs[].metric` | ? | YES |  |
| `column.bars` | enum(closed|all) |  |  |
| `column.ordering` | enum(hi|lo|far|near) |  |  |
| `sectionTimeframe` | ? |  |  |

### `get_strategy_section_template`

*Get Strategy Section Template* — read-only

Get the full canonical definition for one platform or custom report template listed by
list_strategy_vocabulary.

Returns: `template`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `request` | anyOf[object | object] | YES |  |
| `request` *(anyOf variant 1)* | object | |  |
| `request<1>.kind` | string | YES |  |
| `request<1>.sectionKey` | enum(includePriceAction|includeSubTimeframe|includeRsi|includeMacd|includeVolume|includeVolatility|includeBollingerBands|includeMovingAverages,…) | YES |  |
| `request` *(anyOf variant 2)* | object | |  |
| `request<2>.kind` | string | YES |  |
| `request<2>.templateKey` | string | YES |  |

### `preview_strategy_report`

*Preview Strategy Report* — read-only · open-world

Render a bounded live-market preview for a draft report and required bounded coin selection.
Returns server-owned budget usage — including the estimated-token budget as used/cap —
without saving or mutating strategy state. The preview execution limits (result byte cap,
deadline) are served by discovery, not by this result.

Returns: `renderedSections`, `tokenCountModel`, `budgetUsage`, `conditionOutcomes`, `conditionColumns`, `conditionVerdictTally`, `rankScopingNote`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `timeframe` | enum(1m|3m|5m|15m|30m|1h|2h|4h,…) | YES |  |
| `regimeAutoDerive` | boolean | YES |  |
| `regimeTimeframe` | anyOf[? | null] |  |  |
| `sections` | array<anyOf[object | object]> | YES |  |
| `conditions` | array<object> |  |  |
| `conditions[].conditionKey` | string | YES |  |
| `conditions[].name` | string | YES |  |
| `conditions[].definition` | anyOf[anyOf[anyOf[object | object | object | object] | object] | object] | YES |  |
| `conditions[].definition` *(anyOf variant 2)* | object | |  |
| `conditions[].definition<2>.kind` | string | YES |  |
| `conditions[].definition<2>.op` | enum(ALL|ANY|NOT|N_OF) | YES |  |
| `conditions[].definition<2>.n` | integer |  |  |
| `conditions[].definition<2>.members` | array<?> | YES |  |
| `conditions[].verdict` | anyOf[enum(UP|DOWN|NEITHER) | null] | YES |  |
| `conditions[].required` | boolean | YES |  |
| `coinSelection` | anyOf[object | object] | YES |  |
| `coinSelection` *(anyOf variant 1)* | object | |  |
| `coinSelection<1>.mode` | string | YES |  |
| `coinSelection<1>.limit` | integer | YES |  |
| `coinSelection<1>.category` | enum(ALL|CRYPTO|L1|MEMES|DEFI|TRADFI|STOCKS|INDICES,…) |  |  |
| `coinSelection` *(anyOf variant 2)* | object | |  |
| `coinSelection<2>.mode` | string | YES |  |
| `coinSelection<2>.tickers` | array<string> | YES |  |

### `list_strategy_signals`

*List Strategy Signals* — read-only

List compact canonical strategy-signal summaries, optionally narrowed by an exact module
and/or bounded text query. Use a returned signalId with get_strategy_signal_definition for
full authoring detail.

Returns: `signals`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `module` | enum(RSI|MACD|STOCHASTIC|VOLUME|VOLATILITY|BOLLINGER|MOVING_AVERAGES|TREND_STRENGTH,…) |  |  |
| `query` | string |  |  |

### `get_strategy_signal_definition`

*Get Strategy Signal Definition* — read-only

Get the canonical authoring definition for one listed strategy signal. Supply an enabled
timeframe only when a structural availability assessment is needed.

Returns: `signal`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `signalId` | enum(rsi_oversold|rsi_overbought|rsi_bull_divergence|rsi_bear_divergence|macd_bull_cross|macd_bear_cross|macd_bull_divergence|macd_bear_divergence,…) | YES |  |
| `timeframe` | enum(1m|3m|5m|15m|30m|1h|2h|4h,…) |  |  |

### `derive_strategy_rule_view`

*Derive Strategy Rule View* — read-only

Derive report membership, canonical report-default allocation and parameters, and non-
destructive suggestions from self-contained draft sections and optional sparse rules. This
reads no persisted strategy and writes nothing.

Returns: `rules`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `sections` | array<anyOf[object | object]> | YES |  |
| `rules` | array<object> |  |  |
| `rules[].signalId` | enum(rsi_oversold|rsi_overbought|rsi_bull_divergence|rsi_bear_divergence|macd_bull_cross|macd_bear_cross|macd_bull_divergence|macd_bear_divergence,…) | YES |  |
| `rules[].allocation` | integer | YES |  |
| `rules[].required` | boolean | YES |  |
| `rules[].params` | object |  |  |


## Strategy — authoring & lifecycle

### `compile_strategy_plan`

*Compile Strategy Plan* — read-only · open-world

Compile one strict CREATE, UPDATE, or RESTORE request into a complete normalized
approvedPlan, bounded live report review, exact revision/blast-radius diagnostics, and a
five-minute credential-bound token. This performs no write.

Returns: `approvedPlan`, `reviewContext`, `planToken`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `request` | anyOf[object | object | object] | YES |  |
| `request` *(anyOf variant 1)* | object | |  |
| `request<1>.operation` | string | YES |  |
| `request<1>.intentSummary` | string | YES |  |
| `request<1>.assumptions` | array<string> | YES |  |
| `request<1>.coinSelection` | anyOf[object | object] | YES |  |
| `request<1>.coinSelection` *(anyOf variant 1)* | object | |  |
| `request<1>.coinSelection<1>.mode` | string | YES |  |
| `request<1>.coinSelection<1>.limit` | integer | YES |  |
| `request<1>.coinSelection<1>.category` | enum(ALL|CRYPTO|L1|MEMES|DEFI|TRADFI|STOCKS|INDICES,…) |  |  |
| `request<1>.coinSelection` *(anyOf variant 2)* | object | |  |
| `request<1>.coinSelection<2>.mode` | string | YES |  |
| `request<1>.coinSelection<2>.tickers` | array<string> | YES |  |
| `request<1>.name` | string | YES |  |
| `request<1>.description` | string |  |  |
| `request<1>.tagline` | string |  |  |
| `request<1>.timeframe` | enum(1m|3m|5m|15m|30m|1h|2h|4h,…) | YES |  |
| `request<1>.regimeAutoDerive` | boolean | YES |  |
| `request<1>.regimeTimeframe` | anyOf[? | null] |  |  |
| `request<1>.marketReadText` | string |  |  |
| `request<1>.minAggregateScore` | number |  |  |
| `request<1>.minRequiredCount` | integer |  |  |
| `request<1>.minAtrPct` | number |  |  |
| `request<1>.minStopLossAtrMultiple` | number |  |  |
| `request<1>.maxStopLossPct` | number |  |  |
| `request<1>.minRiskRewardRatio` | number |  |  |
| `request<1>.sections` | array<anyOf[object | object]> | YES |  |
| `request<1>.conditions` | array<object> |  |  |
| `request<1>.conditions[].conditionKey` | string | YES |  |
| `request<1>.conditions[].name` | string | YES |  |
| `request<1>.conditions[].definition` | anyOf[anyOf[anyOf[object | object | object | object] | object] | object] | YES |  |
| `request<1>.conditions[].definition` *(anyOf variant 2)* | object | |  |
| `request<1>.conditions[].definition<2>.kind` | string | YES |  |
| `request<1>.conditions[].definition<2>.op` | enum(ALL|ANY|NOT|N_OF) | YES |  |
| `request<1>.conditions[].definition<2>.n` | integer |  |  |
| `request<1>.conditions[].definition<2>.members` | array<?> | YES |  |
| `request<1>.conditions[].verdict` | anyOf[enum(UP|DOWN|NEITHER) | null] | YES |  |
| `request<1>.conditions[].required` | boolean | YES |  |
| `request<1>.rules` | array<object> |  |  |
| `request<1>.rules[].signalId` | enum(rsi_oversold|rsi_overbought|rsi_bull_divergence|rsi_bear_divergence|macd_bull_cross|macd_bear_cross|macd_bull_divergence|macd_bear_divergence,…) | YES |  |
| `request<1>.rules[].allocation` | integer | YES |  |
| `request<1>.rules[].required` | boolean | YES |  |
| `request<1>.rules[].params` | object |  |  |
| `request` *(anyOf variant 2)* | object | |  |
| `request<2>.operation` | string | YES |  |
| `request<2>.intentSummary` | ? | YES |  |
| `request<2>.assumptions` | ? | YES |  |
| `request<2>.coinSelection` | ? | YES |  |
| `request<2>.strategyId` | string | YES |  |
| `request<2>.expectedRevision` | integer | YES |  |
| `request<2>.name` | ? |  |  |
| `request<2>.description` | ? |  |  |
| `request<2>.tagline` | ? |  |  |
| `request<2>.timeframe` | ? |  |  |
| `request<2>.regimeAutoDerive` | ? |  |  |
| `request<2>.regimeTimeframe` | ? |  |  |
| `request<2>.marketReadText` | string |  |  |
| `request<2>.minAggregateScore` | ? |  |  |
| `request<2>.minRequiredCount` | ? |  |  |
| `request<2>.minAtrPct` | ? |  |  |
| `request<2>.minStopLossAtrMultiple` | ? |  |  |
| `request<2>.maxStopLossPct` | ? |  |  |
| `request<2>.minRiskRewardRatio` | ? |  |  |
| `request<2>.sections` | ? |  |  |
| `request<2>.conditions` | ? |  |  |
| `request<2>.rules` | ? |  |  |
| `request` *(anyOf variant 3)* | object | |  |
| `request<3>.operation` | string | YES |  |
| `request<3>.intentSummary` | ? | YES |  |
| `request<3>.assumptions` | ? | YES |  |
| `request<3>.coinSelection` | ? | YES |  |
| `request<3>.strategyId` | ? | YES |  |
| `request<3>.expectedRevision` | integer | YES |  |
| `request<3>.name` | ? |  |  |
| `request<3>.description` | ? |  |  |
| `request<3>.tagline` | ? |  |  |
| `request<3>.timeframe` | ? |  |  |
| `request<3>.regimeAutoDerive` | ? |  |  |
| `request<3>.regimeTimeframe` | ? |  |  |
| `request<3>.marketReadText` | ? |  |  |
| `request<3>.minAggregateScore` | ? |  |  |
| `request<3>.minRequiredCount` | ? |  |  |
| `request<3>.minAtrPct` | ? |  |  |
| `request<3>.minStopLossAtrMultiple` | ? |  |  |
| `request<3>.maxStopLossPct` | ? |  |  |
| `request<3>.minRiskRewardRatio` | ? |  |  |
| `request<3>.sections` | ? |  |  |
| `request<3>.conditions` | ? |  |  |
| `request<3>.rules` | ? |  |  |

### `apply_strategy_plan`

*Apply Strategy Plan* — **writes** · **destructive** · non-idempotent

Confirm and atomically apply a compiled plan with its credential-bound token. Resubmit the
plan's identity, expiry, normalized sections, post-state fields, and rule overrides exactly
as compiled; the server re-derives the diff, viability, mismatches, scorecard, and revision,
and rejects anything that does not match the token. Changed axes propagate to every bound
agent immediately; open positions are reported for awareness and do not block configuration
edits.

Returns: `strategy`, `appliedImpact`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `request` | object | YES |  |
| `request.plan` | anyOf[object | object | object] | YES |  |
| `request.plan` *(anyOf variant 1)* | object | |  |
| `request.plan<1>.operation` | string | YES |  |
| `request.plan<1>.strategyId` | string | YES |  |
| `request.plan<1>.expiresAt` | string | YES |  |
| `request.plan<1>.sections` | array<anyOf[object | object]> | YES |  |
| `request.plan<1>.regimeTimeframe` | anyOf[? | null] | YES |  |
| `request.plan<1>.name` | string | YES |  |
| `request.plan<1>.description` | string | YES |  |
| `request.plan<1>.tagline` | string | YES |  |
| `request.plan<1>.timeframe` | ? | YES |  |
| `request.plan<1>.regimeAutoDerive` | boolean | YES |  |
| `request.plan<1>.marketReadText` | string | YES |  |
| `request.plan<1>.conditions` | array<object> | YES |  |
| `request.plan<1>.conditions[].conditionKey` | string | YES |  |
| `request.plan<1>.conditions[].name` | string | YES |  |
| `request.plan<1>.conditions[].definition` | anyOf[anyOf[anyOf[object | object | object | object] | object] | object] | YES |  |
| `request.plan<1>.conditions[].verdict` | anyOf[enum(UP|DOWN|NEITHER) | null] | YES |  |
| `request.plan<1>.conditions[].required` | boolean | YES |  |
| `request.plan<1>.minAggregateScore` | number | YES |  |
| `request.plan<1>.minRequiredCount` | integer | YES |  |
| `request.plan<1>.minAtrPct` | number | YES |  |
| `request.plan<1>.minStopLossAtrMultiple` | number | YES |  |
| `request.plan<1>.maxStopLossPct` | number | YES |  |
| `request.plan<1>.minRiskRewardRatio` | number | YES |  |
| `request.plan<1>.rules` | array<object> | YES |  |
| `request.plan<1>.rules[].signalId` | enum(rsi_oversold|rsi_overbought|rsi_bull_divergence|rsi_bear_divergence|macd_bull_cross|macd_bear_cross|macd_bull_divergence|macd_bear_divergence,…) | YES |  |
| `request.plan<1>.rules[].allocation` | integer | YES |  |
| `request.plan<1>.rules[].required` | boolean | YES |  |
| `request.plan<1>.rules[].params` | object |  |  |
| `request.plan` *(anyOf variant 2)* | object | |  |
| `request.plan<2>.operation` | string | YES |  |
| `request.plan<2>.strategyId` | ? | YES |  |
| `request.plan<2>.expiresAt` | ? | YES |  |
| `request.plan<2>.sections` | ? | YES |  |
| `request.plan<2>.regimeTimeframe` | ? | YES |  |
| `request.plan<2>.expectedRevision` | integer | YES |  |
| `request.plan<2>.name` | ? | YES |  |
| `request.plan<2>.description` | ? | YES |  |
| `request.plan<2>.tagline` | ? | YES |  |
| `request.plan<2>.timeframe` | ? | YES |  |
| `request.plan<2>.regimeAutoDerive` | ? | YES |  |
| `request.plan<2>.marketReadText` | ? | YES |  |
| `request.plan<2>.conditions` | ? | YES |  |
| `request.plan<2>.minAggregateScore` | ? | YES |  |
| `request.plan<2>.minRequiredCount` | ? | YES |  |
| `request.plan<2>.minAtrPct` | ? | YES |  |
| `request.plan<2>.minStopLossAtrMultiple` | ? | YES |  |
| `request.plan<2>.maxStopLossPct` | ? | YES |  |
| `request.plan<2>.minRiskRewardRatio` | ? | YES |  |
| `request.plan<2>.rules` | ? | YES |  |
| `request.plan` *(anyOf variant 3)* | object | |  |
| `request.plan<3>.operation` | string | YES |  |
| `request.plan<3>.strategyId` | ? | YES |  |
| `request.plan<3>.expiresAt` | ? | YES |  |
| `request.plan<3>.sections` | ? | YES |  |
| `request.plan<3>.regimeTimeframe` | ? | YES |  |
| `request.plan<3>.expectedRevision` | integer | YES |  |
| `request.plan<3>.name` | ? | YES |  |
| `request.plan<3>.description` | ? | YES |  |
| `request.plan<3>.tagline` | ? | YES |  |
| `request.plan<3>.timeframe` | ? | YES |  |
| `request.plan<3>.regimeAutoDerive` | ? | YES |  |
| `request.plan<3>.marketReadText` | ? | YES |  |
| `request.plan<3>.conditions` | ? | YES |  |
| `request.plan<3>.minAggregateScore` | ? | YES |  |
| `request.plan<3>.minRequiredCount` | ? | YES |  |
| `request.plan<3>.minAtrPct` | ? | YES |  |
| `request.plan<3>.minStopLossAtrMultiple` | ? | YES |  |
| `request.plan<3>.maxStopLossPct` | ? | YES |  |
| `request.plan<3>.minRiskRewardRatio` | ? | YES |  |
| `request.plan<3>.rules` | ? | YES |  |
| `request.planToken` | string | YES |  |
| `request.confirm` | boolean | YES |  |

### `update_strategy_signal_rule`

*Update Strategy Signal Rule* — **writes** · **destructive** · non-idempotent

Update exactly one signal allocation, Required flag, and optionally its strict parameters
through the unified revision planner. Changed scorecard configuration propagates to every
bound agent immediately; open positions do not block the edit.

Returns: `strategy`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `request` | object | YES |  |
| `request.strategyId` | string | YES |  |
| `request.expectedRevision` | integer | YES |  |
| `request.signalId` | enum(rsi_oversold|rsi_overbought|rsi_bull_divergence|rsi_bear_divergence|macd_bull_cross|macd_bear_cross|macd_bull_divergence|macd_bear_divergence,…) | YES |  |
| `request.allocation` | integer | YES |  |
| `request.required` | boolean | YES |  |
| `request.params` | object |  |  |

### `fork_strategy`

*Fork Strategy* — **writes** · non-idempotent

Fork one exact visible source revision into a new owned PRIVATE strategy at revision 1. The
locked source snapshot is copied coherently; the source must still match sourceRevision.

Returns: `strategy`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `strategyId` | string | YES |  |
| `sourceRevision` | integer | YES |  |
| `name` | string |  |  |

### `archive_strategy`

*Archive Strategy* — **writes** · **destructive** · non-idempotent

Archive an owned active PRIVATE strategy at the expected revision. Bound-agent configuration
stays byte-identical, provenance advances immediately, and open positions do not block the
lifecycle edit.

Returns: `strategy`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `strategyId` | string | YES |  |
| `expectedRevision` | integer | YES |  |
| `confirm` | boolean | YES |  |

### `restore_strategy`

*Restore Strategy* — **writes** · non-idempotent

Restore unchanged, already-viable content for an owned inactive PRIVATE strategy at the
expected revision. Bound-agent provenance advances immediately and open positions do not
block the lifecycle edit. Invalid content remains inactive with REPAIR_REQUIRED and must use
the RESTORE arm of compile_strategy_plan.

Returns: `strategy`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `strategyId` | string | YES |  |
| `expectedRevision` | integer | YES |  |


## Trading — signals & entry decisions

### `list_signal_logs`

*List Signal Logs* — read-only

List signal evaluation logs for one of your agents. Each row carries the aggregate score,
dominant bias, assessment direction, gate result, and terminal pipeline status. Use it to
monitor how the agent is reading market conditions, then drill in with get_signal_log.

Returns: `entries`, `total`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `agentId` | string | YES | Intelligence agent UUID |
| `page` | integer |  | Page number (default 1) (default `1`) |
| `limit` | integer |  | Results per page (1-50, default 10) (default `10`) |
| `coinTicker` | string |  | Filter by coin ticker, e.g. "BTC". |
| `dominantBias` | enum(BULLISH|BEARISH|NEUTRAL|MIXED) |  | Filter by dominant signal bias. |
| `direction` | enum(UP|DOWN) |  | Filter by assessment direction. |
| `terminalStatus` | enum(BLOCKED|EVALUATING|INELIGIBLE|SKIPPED|PENDING|OPEN|FAILED|EXPIRED,…) |  | Filter by terminal pipeline status. |
| `signalSource` | array<enum(MARKET_GRID|CONVERSATIONAL|ARENA_CHALLENGE|RADAR)> |  | Filter by origin — MARKET_GRID, CONVERSATIONAL, ARENA_CHALLENGE, or RADAR. |

### `get_signal_log`

*Get Signal Log* — read-only

Get full detail for one signal evaluation: the scorecard (every evaluated signal with score,
bias, direction, and indicator readings), per-signal attribution, comparison coins,
candidate trade levels, the whole gate → attempt → decision → execution → outcome pipeline,
and the linked entry decision. `log` is null when no log with that id belongs to that agent.

Returns: `log`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `agentId` | string | YES | Intelligence agent UUID |
| `logId` | string | YES | Signal log UUID from list_signal_logs |

### `get_signal_performance`

*Get Signal Performance* — read-only

Aggregate signal performance for one of your agents: evaluation and enter/skip counts, per-
status entry breakdown, average aggregate score and conviction, fill rate, top coins by
evaluation count, and realized trade metrics (win rate, average and total net P&L, average
duration).

Returns: `totalEvaluations`, `totalEntryDecisions`, `enterCount`, `skipCount`, `pendingCount`, `skippedCount`, `executedCount`, `failedCount`, `expiredCount`, `cancelledCount`, `blockedCount`, `avgAggregateScore`, `avgAggregateScorePercent`, `avgConviction`, `avgConvictionPercent`, `fillRatePct`, `avgRiskRewardRatio`, `topCoinsByEvaluation`, `outcomeCount`, `winCount`, `lossCount`, `winRate`, `winRatePercent`, `avgNetPnl`, `totalNetPnl`, `avgDurationSeconds`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `agentId` | string | YES | Intelligence agent UUID |

### `simulate_aggregate_score`

*Simulate Aggregate Score* — read-only

Stateless what-if: given a set of {label, score (0-1), allocation tier (0-3)} signals and a
gate threshold (0-1), compute the weighted aggregate score, per-signal attribution
percentages, and whether it would route (aggregate >= gate). No agent state is read or
written.

Returns: `aggregateScore`, `aggregateScorePercent`, `gate`, `gatePercent`, `wouldRoute`, `attributions`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `signals` | array<object> | YES | 1-20 signals to aggregate |
| `signals[].label` | string | YES | Human-readable signal label |
| `signals[].score` | number | YES | Signal score in [0,1] |
| `signals[].allocation` | integer | YES | Allocation tier 0-3 |
| `gate` | number | YES | Routing gate threshold in [0,1] |

### `list_entry_decisions`

*List Entry Decisions* — read-only

List entry decisions for an agent with optional filters. Returns paginated results with
total count. Filter by PENDING status to see actionable decisions requiring accept/cancel.

Returns: `entries`, `total`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `agentId` | string | YES | Intelligence agent UUID |
| `page` | integer |  | Page number (default: 1) (default `1`) |
| `limit` | integer |  | Results per page (1-50, default: 10) (default `10`) |
| `status` | enum(PENDING|SKIPPED|EXECUTED|FAILED|EXPIRED|CANCELLED) |  | Filter by derived status: PENDING (proposed or submitting — the actionable set for accept/cancel), SKIPPED (the agent chose not to enter), EXECUTED (… |
| `coinTicker` | string |  | Filter by exact coin ticker (e.g. "BTC", "ETH") |
| `decision` | enum(ENTER|SKIP) |  | Filter by the agent's verdict: ENTER or SKIP |
| `direction` | enum(LONG|SHORT) |  | Filter by trade direction |

### `get_entry_decision`

*Get Entry Decision* — read-only

Get one entry decision by id, including its signal checklist, candidate levels, execution
ids, and challenge context. `decision` is null when no decision with that id is visible to
you.

Returns: `decision`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `decisionId` | string | YES | Entry decision UUID |

### `accept_entry_decision`

*Accept Entry Decision* — **writes** · non-idempotent · **`mcp:wager`**

Accept a PENDING ENTER entry decision for trade execution. Only works for APPROVAL_REQUIRED
mode agents with PENDING decisions. Requires mcp:wager scope.

Returns: `decisionId`, `accepted`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `decisionId` | string | YES | Entry decision UUID. Ownership is enforced from the stored decision, so no agent id is needed. |

### `cancel_entry_decision`

*Cancel Entry Decision* — **writes** · **destructive** · non-idempotent · **`mcp:wager`**

Cancel/deny a PENDING ENTER entry decision. Prevents the trade from being executed. Only
works for PENDING decisions. Requires mcp:wager scope.

Returns: `decisionId`, `cancelled`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `decisionId` | string | YES | Entry decision UUID. Ownership is enforced from the stored decision, so no agent id is needed. |

### `list_pending_approvals`

*List Pending Approvals* — read-only

Every decision across all your agents awaiting your approval (status AWAITING_APPROVAL),
enriched with execution and outcome context. Read this before accept_entry_decision or
cancel_entry_decision. Returns the whole queue — there is no pagination.

Returns: `approvals`

_No parameters._

### `list_gate_blocks`

*List Gate Blocks* — read-only

Paginated pre-signal pipeline rejections for one of your agents — the gate stage, reason
code, quantified reason detail, and linked thought log for each candidate that never reached
signal evaluation. This is the first place to look when an agent isn't trading.

Returns: `entries`, `total`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `agentId` | string | YES | Intelligence agent UUID |
| `page` | integer |  | Page number (default 1) (default `1`) |
| `limit` | integer |  | Results per page (1-100, default 20) (default `20`) |


## Trading — positions, orders & outcomes

### `list_user_active_positions`

*List Active Positions* — read-only

Every open position across all your agents — account totals, per-agent groups, and per-
position live P&L (unrealizedPnlUsd, roePct, markPrice). Read `pricingStatus` and
`generatedAtMs` to judge mark-price freshness: a STALE_MARK_PRICE row's P&L is computed from
a price that has stopped updating.

Returns: `userId`, `totals`, `agents`, `positions`, `activeCoinTickers`

_No parameters._

### `list_session_agent_positions`

*List Session Agent Positions* — read-only

The same open-position view as list_user_active_positions, scoped to one Market Grid
session.

Returns: `userId`, `marketGridSessionId`, `totals`, `agents`, `positions`, `activeCoinTickers`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `marketGridSessionId` | string | YES | Market Grid session UUID |

### `get_agent_open_positions`

*Get Agent Open Positions* — read-only

Public view of any agent's current open positions — entry fills, protection levels,
leverage, and conviction. Entry-only: it carries no mark price and no unrealized P&L. Use
list_user_active_positions for live P&L on your own agents.

Returns: `positions`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `agentId` | string | YES | Intelligence agent UUID |
| `coinTicker` | string |  | Filter by coin ticker, e.g. "BTC". |

### `get_position_audit_history`

*Get Position Audit History* — read-only

Public view of the order-lifecycle audit trail for one position — the same transparency
record an anonymous visitor sees on the agent's profile, for any agent. Returned as a single
chronologically-ordered `events[]` stream (entry fill, SL/TP placement, reprices with
server-computed delta and tightened/held, terminal SL/TP fill, position close), oldest
first. Events are discriminated on `kind`. Every event carries `vsEntryPct` — the direction-
aware signed distance from the entry fill, positive on the profitable side; it is null on
the entry event itself, which is the baseline. A fill's `price` is null only when its fill
rows are not yet ingested — that is an honest unknown, not a zero.

Returns: `positionId`, `events`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `agentId` | string | YES | Intelligence agent UUID that owns the position |
| `positionId` | string | YES | Position UUID |

### `get_open_orders`

*Get Open Orders* — read-only · open-world

Your current open orders on the live exchange — resting limit, stop-loss, and take-profit
legs. Queries the venue directly, so it is slower than a cached read and can fail when the
exchange is unreachable.

Returns: `orders`

_No parameters._

### `get_order_status`

*Get Order Status* — read-only · open-world

Live status of one of your orders on the exchange by order id — filled / resting / canceled
plus fill detail. `order` is null when the venue has no order under that id for your
account. Queries the venue directly, so it is slower than a cached read and can fail when
the exchange is unreachable.

Returns: `order`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `orderId` | string | YES | Exchange order id |

### `close_agent_position`

*Close Agent Position* — **writes** · non-idempotent · open-world · **`mcp:wager`**

DESTRUCTIVE / irreversible: submits a reduce-only market order that closes the position and
realizes its P&L. Requires mcp:wager scope and confirm:true. An exchange rejection is
returned as an error carrying the exact tradingErrorCode — a successful result means the
close order was accepted.

Returns: `decisionId`, `outcomeId`, `closeOrderAccepted`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `decisionId` | string | YES | Entry-decision UUID of the agent position to close (resolves to the position internally). |
| `confirm` | boolean | YES | Must be true — closing realizes P&L and cannot be undone. |

### `override_agent_protection`

*Override Agent Protection* — **writes** · **destructive** · non-idempotent · **`mcp:wager`**

Override the agent's automated stop-loss on an OPEN execution with a manual stop level. SL-
only (manual TP uses the cancel/replace flow). Requires mcp:wager scope. Get
effectiveStopLossOrderId from get_position_audit_history or the position data. `result` is
discriminated by `kind`: only `committed` advanced state; every other branch names why the
amendment did not apply.

Returns: `decisionId`, `result`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `decisionId` | string | YES | Entry-decision UUID of the OPEN execution. |
| `effectiveStopLoss` | string | YES | New stop-loss price as a positive decimal string, e.g. "62150.5". |
| `effectiveStopLossOrderId` | string | YES | Exchange order ID of the CURRENT stop-loss order being amended. |

### `list_trade_outcomes`

*List Trade Outcomes* — read-only

List realized trade outcomes for one of your agents — entry and exit fills, gross and net
P&L, fees, slippage, leverage, duration, and close reason.

Returns: `outcomes`, `total`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `agentId` | string | YES | Intelligence agent UUID |
| `page` | integer |  | Page number (default 1) (default `1`) |
| `limit` | integer |  | Results per page (1-50, default 10) (default `10`) |

### `get_trade_outcome_by_decision`

*Get Trade Outcome By Decision* — read-only

The settled trade outcome for one of your entry decisions — entry and exit fills, gross and
net P&L, fees, slippage, leverage, duration, and close reason. `outcome` is null when the
decision has no settled outcome yet.

Returns: `outcome`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `decisionId` | string | YES | Entry decision UUID |

### `get_trade_chart`

*Get Trade Chart* — read-only

Frozen candle series with the entry/exit/SL/TP overlay for one of your own agent's signal
logs. `result` is discriminated on `status`: READY carries the chart, UNAVAILABLE means the
log never reached a filled trade, NOT_FOUND means no log with that id belongs to that agent.

Returns: `result`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `agentId` | string | YES | One of your intelligence agent UUIDs |
| `logId` | string | YES | Trading signal log UUID |

### `get_decision_order_attribution`

*Get Decision Order Attribution* — read-only

Maps each executed order back to the entry decision that produced it (decision id, order id,
agent, coin, direction, conviction) across all your agents. Use it to trace an order or
trade row to its originating decision.

Returns: `attributions`

_No parameters._

### `halt_intelligence_agent`

*Halt Intelligence Agent* — **writes** · **`mcp:wager`**

Stop an agent from opening any new trade, immediately. Requires the mcp:wager scope —
halting changes whether real capital can be committed. Open positions are NOT closed: use
close_agent_position for those. The slots and funding envelope are retained, so
resume_intelligence_agent restores the agent exactly as it was. Returns the refreshed
funding envelope with haltedAt set.

Returns: `allocation`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `agentId` | string | YES | Intelligence agent UUID. Discover via list_intelligence_agents. |

### `resume_intelligence_agent`

*Resume Intelligence Agent* — **writes** · **`mcp:wager`**

Lift a halt so the agent may open trades again. Requires the mcp:wager scope. Breach-gated:
while the stop that triggered the halt is STILL breached the resume is refused — clear the
breach first, or call reset_agent_drawdown_baseline to acknowledge the loss and re-arm the
drawdown stop. A manual halt resumes unconditionally. Returns the refreshed funding envelope
with haltedAt cleared.

Returns: `allocation`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `agentId` | string | YES | Intelligence agent UUID. Discover via list_intelligence_agents. |

### `set_agent_per_trade_push`

*Set Agent Per-Trade Push* — **writes** · **`mcp:wager`**

Turn per-trade push notifications on or off for one of your agents. Requires the mcp:wager
scope: it writes the same funding-envelope row that carries the halt state, so it is gated
with the rest of that surface rather than treated as a free-standing preference. Returns the
refreshed envelope.

Returns: `allocation`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `agentId` | string | YES | Intelligence agent UUID. Discover via list_intelligence_agents. |
| `enabled` | boolean | YES | True to receive a push notification per executed trade; false to stop them. |

### `reset_agent_drawdown_baseline`

*Reset Agent Drawdown Baseline* — **writes** · **`mcp:wager`**

Acknowledge the realized loss and re-arm the drawdown stop from today. Requires the
mcp:wager scope — this is the affordance that lets a drawdown-halted agent trade again, so
it re-authorizes real capital. It does NOT erase history: realized P&L is measured from a
new baseline, and the acknowledged loss is journaled to the agent's activity feed. Returns
the refreshed risk budget.

Returns: `budget`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `agentId` | string | YES | Intelligence agent UUID. Discover via list_intelligence_agents. |


## Deployment policies & radar

### `get_deployment_policy`

*Get Deployment Policy* — read-only

Read the deployment policy for a game preset. Returns { policy, authoringContext }: `policy`
is the ordered agent slots — each with its agentId, agentDisplayName, minConfidence gate,
priority, isDefault flag, and session-start / one-time-occurrence / regime conditions — or
null when the preset has no policy yet. `authoringContext` always carries the session
catalog (the exact recurring starts / one-time occurrence this preset schedules) plus the
resolved next-session target — use it to author valid session conditions.

Returns: `policy`, `authoringContext`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `presetId` | string | YES | Game preset UUID |

### `upsert_deployment_policy`

*Upsert Deployment Policy* — **writes** · **`mcp:wager`**

Create or replace the deployment policy for a game preset. Requires the mcp:wager scope — a
session-start policy is autonomous-wager authority (it auto-submits real wagers at the next
session). `request.slots` is the FULL ordered slot set (it replaces the preset's existing
policy). Each slot binds an agentId with a minConfidence gate (0-1) and is either: the
single DEFAULT slot (isDefault:true, priority:null, conditions:[]) which always matches as
the catch-all; or a RULE slot (isDefault:false, a unique positive priority where the lowest
priority wins, and 1-2 activation conditions). A condition is a session start
{kind:"session_start", startTimes:["HH:MM:SS", ...] UTC, days:[0-6, 0=Sunday, UTC]}, a one-
time occurrence {kind:"session_occurrence", scheduledStartAt:"<ISO 8601 UTC instant>"}, or a
regime {kind:"regime", regimes:[...], minConviction?}. Choose each start (and any
occurrence) from what the preset currently schedules (see get_deployment_policy
authoringContext) — an unscheduled start still saves but stays dormant until an admin
restores that hour. At MOST one default slot; rule-slot priorities must be unique.
Optionally set the per-policy regime-anchor override (regimeReferenceCoinId +
regimeTimeframe); omit/null inherits the preset default. `request.expectedRevision` is the
revision you read — pass null only for a first deploy; a stale value is a CONFLICT and
nothing is written. Returns the new revision.

Returns: `presetId`, `slotCount`, `revision`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `presetId` | string | YES | Game preset UUID |
| `request` | object | YES | Full ordered slot set plus the optional per-policy regime-anchor override. Replaces the existing policy for this preset. |
| `request.slots` | array<object> | YES |  |
| `request.slots[].agentId` | string | YES |  |
| `request.slots[].coinRules` | array<object> | YES |  |
| `request.slots[].coinRules[].coinId` | string | YES |  |
| `request.slots[].coinRules[].tradeEnabled` | boolean|null | YES |  |
| `request.slots[].coinRules[].minConviction` | anyOf[number | null] | YES |  |
| `request.slots[].minConfidence` | anyOf[number | null] | YES |  |
| `request.slots[].tradingEnabled` | boolean | YES |  |
| `request.slots[].minConviction` | anyOf[number | null] | YES |  |
| `request.slots[].entryStrategy` | enum(STANDARD|TWO_LOOK) | YES |  |
| `request.slots[].priority` | anyOf[integer | null] | YES |  |
| `request.slots[].isDefault` | boolean | YES |  |
| `request.slots[].conditions` | array<anyOf[object | object | object]> | YES |  |
| `request.expectedRevision` | anyOf[integer | null] | YES |  |
| `request.regimeReferenceCoinId` | anyOf[anyOf[? | string] | null] |  |  |
| `request.regimeTimeframe` | anyOf[anyOf[? | enum(1m|3m|5m|15m|30m|1h|2h|4h,…)] | null] |  |  |

### `delete_deployment_policy`

*Delete Deployment Policy* — **writes** · **destructive** · non-idempotent · **`mcp:wager`**

DESTRUCTIVE: delete the entire deployment policy for a game preset, un-deploying ALL agents
from it (the preset stops auto-submitting). Requires the mcp:wager scope — it revokes
autonomous-wager authority. Requires confirm:true plus `expectedRevision` (the revision you
read): a stale value, or a policy already removed, is a CONFLICT and nothing is deleted.

Returns: `presetId`, `deleted`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `presetId` | string | YES | Game preset UUID |
| `expectedRevision` | integer | YES | The policy revision you read. A stale value is a conflict — nothing is deleted. |
| `confirm` | boolean | YES | Must be true — deleting removes the ENTIRE policy and un-deploys every agent from this preset. |

### `list_deployment_policies`

*List Deployment Policies* — read-only

Read every Arena deployment policy you own, plus the fleet roll-up — the whole arena side of
your deployments in one call, with no preset id needed. Each policy carries its ordered
slots (agent, rules of engagement, per-coin rules, entry strategy, conditions), its
`revision` to echo as `expectedRevision` on the next write, the server-computed `resolution`
for the canonical next pending session, the live regime at the effective anchor, and the
preset's identity (display name, badge, timeframe, entry fee, current player count).
`presetIsActive: false` marks an admin-retired arena: the policy is dormant — it schedules
no sessions and never fires — rather than deleted. `summary` counts your policies across
every next-entry state (deployed, scheduled, sittingOut, warming, noSession, retired,
unconfigured) plus the distinct agents scheduled. Use `get_deployment_policy` for one
preset's authoring context (its session catalog and coin pool).

Returns: `policies`, `summary`

_No parameters._

### `preview_deployment_resolution`

*Preview Deployment Resolution* — read-only

Pure dry-run — resolve which agent/slot a DRAFT policy would deploy for the preset's NEXT
scheduled session (or under a simulated regime), exactly as the auto-submit scheduler would.
`resolution` is discriminated by `status`: RESOLVED carries the winning agent + matched slot
+ the concrete target session (its lockAt/settleAt); IDLE means no rule matched and there is
no default; WARMING means the regime classifier has no reading yet; NO_SESSION means the
preset has no upcoming session to target. Optionally set the per-policy regime-anchor
override so the dry-run resolves the SAME effective anchor production uses. No LLM call, no
writes — safe to call repeatedly while iterating on slots.

Returns: `resolution`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `presetId` | string | YES | Game preset UUID |
| `request` | object | YES | Draft slot set to resolve, with an optional simulated regime and regime-anchor override. |
| `request.slots` | array<object> | YES |  |
| `request.slots[].agentId` | string | YES |  |
| `request.slots[].coinRules` | array<object> | YES |  |
| `request.slots[].coinRules[].coinId` | string | YES |  |
| `request.slots[].coinRules[].tradeEnabled` | boolean|null | YES |  |
| `request.slots[].coinRules[].minConviction` | anyOf[number | null] | YES |  |
| `request.slots[].minConfidence` | anyOf[number | null] | YES |  |
| `request.slots[].tradingEnabled` | boolean | YES |  |
| `request.slots[].minConviction` | anyOf[number | null] | YES |  |
| `request.slots[].entryStrategy` | enum(STANDARD|TWO_LOOK) | YES |  |
| `request.slots[].priority` | anyOf[integer | null] | YES |  |
| `request.slots[].isDefault` | boolean | YES |  |
| `request.slots[].conditions` | array<anyOf[object | object | object]> | YES |  |
| `request.simulatedRegime` | ? |  |  |
| `request.regimeReferenceCoinId` | anyOf[anyOf[? | string] | null] |  |  |
| `request.regimeTimeframe` | anyOf[anyOf[? | enum(1m|3m|5m|15m|30m|1h|2h|4h,…)] | null] |  |  |

### `test_generate_deployment_grid`

*Test Generate Deployment Grid* — read-only · open-world

Runs the agent's LLM to generate a sample grid for this preset to preview what it would do.
Resolves the winning slot for the preset's NEXT scheduled session (or the chosen simulated
regime), like the scheduler, then generates with the resolved agent. `result` is keyed by
`status`: only RESOLVED carries a generation payload; IDLE / WARMING / NO_SESSION return no
generation (nothing resolves, so no LLM call happens). Requires only mcp:read — it places NO
wager. Optionally set the per-policy regime-anchor override so resolution reads the SAME
effective anchor production uses. Incurs model cost and writes agent thought/activity
records. Does NOT place a wager or execute a trade.

Returns: `result`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `presetId` | string | YES | Game preset UUID |
| `request` | object | YES | Draft slot set to resolve then test, with an optional simulated regime and regime-anchor override. |
| `request.slots` | array<object> | YES |  |
| `request.slots[].agentId` | string | YES |  |
| `request.slots[].coinRules` | array<object> | YES |  |
| `request.slots[].coinRules[].coinId` | string | YES |  |
| `request.slots[].coinRules[].tradeEnabled` | boolean|null | YES |  |
| `request.slots[].coinRules[].minConviction` | anyOf[number | null] | YES |  |
| `request.slots[].minConfidence` | anyOf[number | null] | YES |  |
| `request.slots[].tradingEnabled` | boolean | YES |  |
| `request.slots[].minConviction` | anyOf[number | null] | YES |  |
| `request.slots[].entryStrategy` | enum(STANDARD|TWO_LOOK) | YES |  |
| `request.slots[].priority` | anyOf[integer | null] | YES |  |
| `request.slots[].isDefault` | boolean | YES |  |
| `request.slots[].conditions` | array<anyOf[object | object | object]> | YES |  |
| `request.simulatedRegime` | ? |  |  |
| `request.regimeReferenceCoinId` | anyOf[anyOf[? | string] | null] |  |  |
| `request.regimeTimeframe` | anyOf[anyOf[? | enum(1m|3m|5m|15m|30m|1h|2h|4h,…)] | null] |  |  |

### `get_radar_deployment`

*Get Radar Deployment* — read-only

Read your Radar deployment policy for one coin, or null when that coin is not deployed.
`policy` carries the ordered agent slots — each with agentId, agentDisplayName, its
minConviction trade bar (null means inherit the agent's base), resolvedConviction (the
effective bar plus the layer that decided it), priority, isDefault, and its time-window /
regime conditions — plus `revision` and the live `resolvesNow` projection. `resolvesNow`
reports what the sweep would do right now: section (IN_POSITION / SCANNING / IDLE), the on-
duty agent, the matched slot, the confirmed regime and conviction used, a typed idle/blocked
reason, the qualification verdict and any failing gate, cooldown expiry, open-position
owner, and the last flip/fire timestamps. Pass `revision` back as `expectedRevision` on your
next write.

Returns: `policy`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `coinId` | string | YES | Coin id (coins.id — a text identifier, not a UUID). Discover via get_coin_metadata. |

### `list_radar_deployments`

*List Radar Deployments* — read-only

Read every coin you have deployed on Radar, each with its full policy, revision, and live
resolvesNow projection, plus a fleet roll-up. `summary` carries coinsDeployed (paused
policies included — it is the cap-meter denominator), the section counts (inPosition,
scanning, idle) with the idle split by reason (warming, sittingOut, needsAttention, paused),
onDutyNow, agentsActive, and coinCap (your live per-user coin limit). Use this to see your
whole Radar fleet in one call.

Returns: `policies`, `summary`, `blockedAgents`

_No parameters._

### `get_radar_activity`

*Get Radar Activity* — read-only

Read the transition journal and evaluation curve for one coin you have deployed — the
surface that answers "why did my radar agent not fire". `events` is newest-first and carries
one row per CHANGED discrete fact (never one per sweep): gate crossings with the gate they
name, verdict flips, fire dispositions (FIRED, or the edge consumed/deferred/preserved and
why), on-duty rotations, regime and section changes, and the policy-lifecycle rows. Each row
carries the margins AS OBSERVED at that instant — score, required count and ATR against the
minimums in force then, with the server's per-gate verdicts already projected — so a later
agent edit cannot falsify history, and the from→to `prev*` fields make every row self-
contained. `samples` is the bounded per-sweep score/threshold ring for the agent named by
`samplesAgentId` — chronological (oldest first), the order a progression curve is drawn in;
an empty array is a legitimate state (fresh deploy, rotation, ring expiry), not an error.
`filter` narrows BEFORE the page limit: KEY drops the ambient section/regime/baseline rows,
FIRES keeps only dispositions. Page with the opaque `nextCursor`; it encodes (occurredAt,
id) because a timestamp alone would skip or duplicate rows when a page boundary cuts through
one sweep's same-instant batch.

Returns: `events`, `samples`, `samplesAgentId`, `samplesAgentName`, `nextCursor`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `coinId` | string | YES | Coin id (coins.id — a text identifier, not a UUID). Discover via get_coin_metadata. |
| `limit` | integer |  | Journal rows per page, 1-200 (default 50). (default `50`) |
| `cursor` | string |  | Opaque `nextCursor` from the previous page. It encodes (occurredAt, id) — a timestamp alone would skip or duplicate rows when a page boundary cuts th… |
| `filter` | enum(ALL|KEY|FIRES) |  | ALL (everything), KEY (drops the ambient rows — section, regime, and baseline observations), or FIRES (fire dispositions only). Applied BEFORE the pa… (default `ALL`) |

### `upsert_radar_deployment`

*Upsert Radar Deployment* — **writes** · **`mcp:wager`**

Create or FULLY REPLACE your Radar deployment policy for one coin. Requires the mcp:wager
scope — a Radar policy is standing autonomous authority that fires real trades on confirmed-
regime flips. `request.slots` is the complete slot set and replaces whatever is stored. Each
slot binds an agentId, a minConviction trade bar (0-1, or null to inherit the agent's base),
and is either the single DEFAULT slot (isDefault:true, priority:null, conditions:[]) which
always matches as the catch-all, or a RULE slot (isDefault:false, a unique positive priority
where lowest wins, and 1-2 conditions). A condition is an hour set {kind:"hours",
hours:[0-23], days:[0-6, 0=Sunday]} — both UTC, both non-empty and without duplicates, and
both plain membership, so a gapped schedule like hours:[7,13] is one condition and an
overnight one like hours:[23,0,1] needs no special form — or a regime {kind:"regime",
regimes:[...], minConviction?}. A slot may carry at most one of each kind; with both, BOTH
must match (AND). Set `request.enabled` false to pause without losing slots, true to resume.
`request.expectedRevision` is the revision you read — pass null only for a first deploy; a
stale value is a CONFLICT and nothing is written. Returns the new revision.

Returns: `revision`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `coinId` | string | YES | Coin id (coins.id — a text identifier, not a UUID). Discover via get_coin_metadata. |
| `request` | object | YES | The FULL replacement policy: deployment timeframe, enabled flag (pause/resume), the complete slot set, and expectedRevision (the revision you read; n… |
| `request.deploymentTimeframe` | enum(1m|3m|5m|15m|30m|1h|2h|4h,…) | YES |  |
| `request.enabled` | boolean | YES |  |
| `request.slots` | array<object> | YES |  |
| `request.slots[].agentId` | string | YES |  |
| `request.slots[].minConviction` | anyOf[number | null] | YES |  |
| `request.slots[].priority` | anyOf[integer | null] | YES |  |
| `request.slots[].isDefault` | boolean | YES |  |
| `request.slots[].conditions` | array<anyOf[object | object]> | YES |  |
| `request.expectedRevision` | anyOf[integer | null] | YES |  |

### `delete_radar_deployment`

*Delete Radar Deployment* — **writes** · **destructive** · non-idempotent · **`mcp:wager`**

DESTRUCTIVE: un-deploy a coin entirely, removing its Radar policy with every slot and
condition. Requires the mcp:wager scope — it revokes standing autonomous authority. Requires
confirm:true, the headless equivalent of the web un-deploy confirmation. `expectedRevision`
must be the revision you read: a stale value (or a policy already removed) is a CONFLICT and
nothing is deleted. To stop trading without losing your slots, call upsert_radar_deployment
with enabled:false instead.

Returns: `coinId`, `deleted`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `coinId` | string | YES | Coin id (coins.id — a text identifier, not a UUID). Discover via get_coin_metadata. |
| `expectedRevision` | integer | YES | The policy revision you read. A stale value is a conflict — nothing is deleted. |
| `confirm` | boolean | YES | Must be true — un-deploying removes the ENTIRE policy for this coin, including every slot and condition. |

### `preview_radar_resolution`

*Preview Radar Resolution* — read-only

Pure dry-run — resolve which agent a DRAFT Radar policy would put on duty for this coin
right now, through the same resolver the live sweep uses. Returns the full `resolvesNow`
projection, so you see the real outcome including a typed idle reason (COLD_REGIME when no
confirmed regime is cached, NO_RULE_MATCH when nothing matched and there is no default,
ALL_SLOTS_FILTERED when every candidate agent was ineligible). Omit
`request.simulatedRegime` to resolve against the same confirmed regime the sweep reads; set
it to test a specific regime. No LLM call, no writes, no revision needed — safe to call
repeatedly while iterating on slots.

Returns: `resolvesNow`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `coinId` | string | YES | Coin id (coins.id — a text identifier, not a UUID). Discover via get_coin_metadata. |
| `request` | object | YES | Draft slot set plus deployment timeframe, with an optional simulated regime. Nothing is written; omit simulatedRegime to resolve against the same con… |
| `request.deploymentTimeframe` | enum(1m|3m|5m|15m|30m|1h|2h|4h,…) | YES |  |
| `request.simulatedRegime` | enum(bull_expansion|bear_expansion|bull_ranging|bear_ranging|contraction|volatile|fallback) |  |  |
| `request.slots` | array<object> | YES |  |
| `request.slots[].agentId` | string | YES |  |
| `request.slots[].minConviction` | anyOf[number | null] | YES |  |
| `request.slots[].priority` | anyOf[integer | null] | YES |  |
| `request.slots[].isDefault` | boolean | YES |  |
| `request.slots[].conditions` | array<anyOf[object | object]> | YES |  |


## Market regime

### `get_regime_snapshot`

*Get Regime Snapshot* — read-only

Read the CURRENT market-regime snapshot for a coin at a timeframe: regime + conviction + how
many bars it has held (regimeRunLengthBars) + the classified context (trend / volatility /
momentum / structural bias / price position). Prefers the active forming bar, falling back
to the last confirmed close. Defaults to 4h (the interval the deployment gate matches on)
when no timeframe is given; pass any timeframe (e.g. "1h", "1d") for that interval.
`snapshot` is null when no regime is classified for that coin/timeframe.

Returns: `symbol`, `timeframe`, `snapshot`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `symbol` | string |  | Coin ticker — any coin (e.g. "BTC", "SOL", "ETH"); defaults to "BTC" (default `BTC`) |
| `timeframe` | enum(1m|3m|5m|15m|30m|1h|2h|4h,…) |  | Regime timeframe — defaults to "4h"; pass any, e.g. "1h", "1d" (default `4h`) |

### `get_regime_history`

*Get Regime History* — read-only

Read the market-regime time-series for a coin at a timeframe. Each point is {timestamp,
regime, conviction} on that timeframe's candle grid, oldest-first. The MDS persists the per-
bar regime projection for every enriched timeframe, so pass any timeframe (e.g. "1h", "1d")
— defaults to "4h" when omitted. A cold cache or an un-enriched timeframe returns few or
zero points.

Returns: `symbol`, `timeframe`, `points`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `symbol` | string |  | Coin ticker — any coin (e.g. "BTC", "SOL", "ETH"); defaults to "BTC" (default `BTC`) |
| `timeframe` | enum(1m|3m|5m|15m|30m|1h|2h|4h,…) |  | Regime timeframe — defaults to "4h"; pass any, e.g. "1h", "1d" (default `4h`) |
| `bars` | integer |  | Look-back depth in timeframe bars (1-500, default 240) (default `240`) |


## Public agent explorer (other players)

### `get_public_agent_signal_logs`

*Get Public Agent Signal Logs* — read-only

Paginated public signal logs for any public agent — each row's coin, dominant bias,
assessment direction, aggregate score, gate result, and terminal pipeline status. Filter by
coin plus any signal facet; every facet is an array of canonical enum members.

Returns: `entries`, `total`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `agentId` | string | YES | Intelligence agent UUID (a public agent) |
| `page` | integer |  | Page number (default 1) (default `1`) |
| `limit` | integer |  | Results per page (1-50, default 20) (default `20`) |
| `filter` | object |  | Facet filter. Every facet is an array of canonical enum members — see the published schema for the exact vocabulary. (default `{}`) |
| `filter.coinTicker` | array<string> |  | Coin tickers to include, e.g. ["BTC", "ETH"]. |
| `filter.dominantBias` | array<enum(BULLISH|BEARISH|NEUTRAL|MIXED)> |  | Dominant signal bias facet. |
| `filter.direction` | array<enum(UP|DOWN)> |  | Predicted direction facet. |
| `filter.terminalStatus` | array<enum(BLOCKED|EVALUATING|INELIGIBLE|SKIPPED|PENDING|OPEN|FAILED|EXPIRED,…)> |  | Terminal pipeline status facet. |
| `filter.tradeOutcome` | array<enum(WIN|LOSS)> |  | Trade economic verdict facet. |
| `filter.gateReason` | array<enum(TRADING_MODE_OFF|CANDIDATE_LEVELS_UNAVAILABLE|AGGREGATE_BELOW_MIN|REQUIRED_COUNT_BELOW_MIN)> |  | Gate reason — applied only when terminalStatus includes BLOCKED. |
| `filter.rejectionReason` | array<enum(BELOW_EXCHANGE_MINIMUM|INSUFFICIENT_BALANCE|ORDER_REJECTED|EXCHANGE_ERROR|TIMEOUT|SIGNAL_STALE|SLIPPAGE_REJECTED|UNKNOWN,…)> |  | Rejection reason — applied only when terminalStatus includes FAILED. |
| `filter.expiryReason` | array<enum(TIME|PRICE_DEVIATION|PRICE_BREACH_WORKING|SETUP_DECAY|INDICATOR_FLIP|ENTRY_ORDER_CANCELLED|ENTRY_ORDER_REJECTED|SESSION_ENDED)> |  | Expiry reason — applied only when terminalStatus includes EXPIRED. |
| `filter.closeReason` | array<enum(TAKE_PROFIT|STOP_LOSS|MARKET_CLOSE|LIQUIDATION)> |  | Close reason — applied only when tradeOutcome is selected. |
| `filter.closedBy` | array<enum(EXCHANGE|HUMAN)> |  | Closer — applied only when tradeOutcome is selected. |
| `filter.signalSource` | array<enum(MARKET_GRID|CONVERSATIONAL|ARENA_CHALLENGE|RADAR)> |  | Origin facet — MARKET_GRID, CONVERSATIONAL, ARENA_CHALLENGE, or RADAR. |

### `get_public_agent_signal_log_detail`

*Get Public Agent Signal Log Detail* — read-only

Full pipeline detail for one public signal log: the scorecard (per-signal scores, bias, and
indicator readings), per-signal attribution, comparison coins, candidate trade levels, and
the gate → attempt → decision → execution → outcome chain. Owner-only LLM telemetry
(`pipeline.attempt.ownerView`, `pipeline.attempt.llmPartialReasoning`) is always null on
this public read. `log` is null when no public log with that id belongs to that agent.

Returns: `log`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `agentId` | string | YES | Intelligence agent UUID (a public agent) |
| `logId` | string | YES | Trading signal log UUID |

### `get_public_agent_signal_performance`

*Get Public Agent Signal Performance* — read-only

Aggregate public signal performance for any public agent: evaluation and enter/skip counts,
per-status entry breakdown, average aggregate score and conviction, fill rate, top coins by
evaluation count, and realized trade metrics (win rate, average and total net P&L, average
duration).

Returns: `totalEvaluations`, `totalEntryDecisions`, `enterCount`, `skipCount`, `pendingCount`, `skippedCount`, `executedCount`, `failedCount`, `expiredCount`, `cancelledCount`, `blockedCount`, `avgAggregateScore`, `avgAggregateScorePercent`, `avgConviction`, `avgConvictionPercent`, `fillRatePct`, `avgRiskRewardRatio`, `topCoinsByEvaluation`, `outcomeCount`, `winCount`, `lossCount`, `winRate`, `winRatePercent`, `avgNetPnl`, `totalNetPnl`, `avgDurationSeconds`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `agentId` | string | YES | Intelligence agent UUID (a public agent) |

### `get_public_agent_trade_chart`

*Get Public Agent Trade Chart* — read-only

Frozen candle series with the entry/exit/SL/TP overlay for one public agent's signal log.
`result` is discriminated on `status`: READY carries the chart, UNAVAILABLE means the log
never reached a filled trade, NOT_FOUND means no public log with that id belongs to that
agent.

Returns: `result`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `agentId` | string | YES | Intelligence agent UUID (a public agent) |
| `logId` | string | YES | Trading signal log UUID |

### `get_public_agent_realized_trades`

*Get Public Agent Realized Trades* — read-only

Paginated public realized (closed) trades for any public agent over a rolling window — per-
trade entry and exit fills, net P&L, win flag, price move %, return on equity, leverage,
conviction, duration, and close reason. Filter by coin plus any trade facet; closeReason and
closedBy apply only when tradeOutcome is selected.

Returns: `trades`, `total`, `page`, `limit`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `agentId` | string | YES | Intelligence agent UUID (a public agent) |
| `timeframe` | enum(1D|7D|30D|LIFETIME) |  | Rolling window (default LIFETIME) (default `LIFETIME`) |
| `page` | integer |  | Page number (default 1) (default `1`) |
| `limit` | integer |  | Results per page (1-50, default 20) (default `20`) |
| `filter` | object |  | Facet filter. Every facet is an array of canonical enum members; closeReason and closedBy apply only when tradeOutcome is selected. (default `{}`) |
| `filter.coinTicker` | array<string> |  | Coin tickers to include, e.g. ["BTC", "ETH"]. |
| `filter.dominantBias` | array<enum(BULLISH|BEARISH|NEUTRAL|MIXED)> |  | Dominant signal bias facet. |
| `filter.direction` | array<enum(UP|DOWN)> |  | Predicted direction facet. |
| `filter.terminalStatus` | array<enum(BLOCKED|EVALUATING|INELIGIBLE|SKIPPED|PENDING|OPEN|FAILED|EXPIRED,…)> |  | Terminal pipeline status facet. |
| `filter.tradeOutcome` | array<enum(WIN|LOSS)> |  | Trade economic verdict facet. |
| `filter.gateReason` | array<enum(TRADING_MODE_OFF|CANDIDATE_LEVELS_UNAVAILABLE|AGGREGATE_BELOW_MIN|REQUIRED_COUNT_BELOW_MIN)> |  | Gate reason — applied only when terminalStatus includes BLOCKED. |
| `filter.rejectionReason` | array<enum(BELOW_EXCHANGE_MINIMUM|INSUFFICIENT_BALANCE|ORDER_REJECTED|EXCHANGE_ERROR|TIMEOUT|SIGNAL_STALE|SLIPPAGE_REJECTED|UNKNOWN,…)> |  | Rejection reason — applied only when terminalStatus includes FAILED. |
| `filter.expiryReason` | array<enum(TIME|PRICE_DEVIATION|PRICE_BREACH_WORKING|SETUP_DECAY|INDICATOR_FLIP|ENTRY_ORDER_CANCELLED|ENTRY_ORDER_REJECTED|SESSION_ENDED)> |  | Expiry reason — applied only when terminalStatus includes EXPIRED. |
| `filter.closeReason` | array<enum(TAKE_PROFIT|STOP_LOSS|MARKET_CLOSE|LIQUIDATION)> |  | Close reason — applied only when tradeOutcome is selected. |
| `filter.closedBy` | array<enum(EXCHANGE|HUMAN)> |  | Closer — applied only when tradeOutcome is selected. |
| `filter.signalSource` | array<enum(MARKET_GRID|CONVERSATIONAL|ARENA_CHALLENGE|RADAR)> |  | Origin facet — MARKET_GRID, CONVERSATIONAL, ARENA_CHALLENGE, or RADAR. |

### `get_public_agent_game_history`

*Get Public Agent Game History* — read-only

Paginated public Market Grid game history for any public agent over a rolling window — per-
game grid picks with their settled scoring, placement, accuracy, change capture, and payout
split. Owner-only LLM telemetry (`ownerView`) is always null on this public read.

Returns: `entries`, `total`, `page`, `limit`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `agentId` | string | YES | Intelligence agent UUID (a public agent) |
| `timeframe` | enum(1D|7D|30D|LIFETIME) |  | Rolling window (default LIFETIME) (default `LIFETIME`) |
| `page` | integer |  | Page number (default 1) (default `1`) |
| `limit` | integer |  | Results per page (1-50, default 20) (default `20`) |

### `get_public_agent_unrealized_pnl`

*Get Public Agent Unrealized P&L* — read-only · open-world

Live unrealized P&L snapshot for a PUBLIC agent's open positions — per-position size, entry
price, unrealized P&L, leverage, raw price move, and return on equity, plus the account
total. This is the public profile projection: it returns the same data an anonymous visitor
sees on the agent's profile, for any ACTIVE agent, and carries no owner-private reasoning or
configuration. `snapshot` is null when the agent has no open positions. Marks come from the
platform market-data feed, not a direct venue query, so this is a fast read — a position
whose coin has no cached price is omitted from the total rather than estimated.

Returns: `snapshot`

| Param | Type | Req | Description |
|---|---|:--:|---|
| `agentId` | string | YES | One of your intelligence agent UUIDs |
| `signalSource` | array<enum(MARKET_GRID|CONVERSATIONAL|ARENA_CHALLENGE|RADAR)> |  | Restrict to these signal origins. Empty (default) means every origin. (default `[]`) |


## Prompts

### `play-market-grid`

End-to-end workflow for playing a Market Grid prediction game

Arguments: `strategy`?  
_(`?` marks optional)_

### `analyze-market`

Deep market analysis for informed predictions

Arguments: `sessionId`?  
_(`?` marks optional)_

### `check-performance`

Review your game results, stats, and leaderboard standing

Arguments: —  
_(`?` marks optional)_

### `strategy-guide`

Learn BattleGrid game mechanics, rules, and strategies

Arguments: —  
_(`?` marks optional)_

### `author-strategy`

Discover, compile, review, and atomically apply a BattleGrid strategy

Arguments: `operation`?, `strategyId`?  
_(`?` marks optional)_


## Resources

| Name | URI | Description |
|---|---|---|
| `game-rules` | `battlegrid://rules/overview` |  |
| `grid-format` | `battlegrid://reference/grid-format` |  |
| `quick-start` | `battlegrid://guide/quick-start` |  |
