# BattleGrid MCP — read/write surface map

Probed live with `tools/probe_mcp_surface.py` against **`battlegrid v5.0.0`**
on 2026-08-04. Regenerate after any BattleGrid deployment: the server says its
own list goes stale, and this file inherits that.

**110 tools** · 83 read ·
17 write · 10 destructive

**Grid-Commander calls 52 of them** — 40 read, 5 write, 7 destructive. The
other 58 are unconsumed capability.

Classification is the server's own annotation, never inferred from a name — the
product reads it at runtime and treats anything unannotated as destructive.
There are currently no unannotated tools.

## The count is not the check

This file was written against **`battlegrid v3.0.0`**. BattleGrid deployed
twice to **v5.0.0** and the tool count was 110 throughout, so nothing here
looked wrong while enums, required arguments and one module's semantics moved
underneath it.

`docs/battlegrid-mcp-surface.json` now records the server version it was taken
from, and `tests/live/surface-freshness.test.ts` fails when that disagrees with
the live server. Do not read an unchanged 110 as evidence of anything.

## How much of this is actually verified

- **43 tools were called live** and their responses recorded. Across all of
  them, the declared `outputSchema` matched the observed response **exactly** —
  zero keys declared-but-absent, zero returned-but-undeclared.
- That is why the remaining tools can be checked against their declared schema
  without being called, which matters because 27 of them change things.
- Every observed response carried **both** encodings — `structuredContent` and a
  JSON text block — and they were byte-identical.

One call failed:

- `get_market_context` — {"code":"VALIDATION_ERROR","message":"Provide sessionId or primaryTimeframe"}

`get_open_orders` failed with an `INTERNAL_ERROR` on the v3 probe and answers
on v5. Recorded because it is the only thing that quietly *fixed* itself, and a
map that only ever grows defects misrepresents the platform.

`get_market_context` declares **no required arguments** and refuses an empty call.
An input schema can under-declare what a tool actually needs, so a client building
arguments from the schema alone — the assistant does exactly this — can construct
a request the tool rejects.

## What Grid-Commander uses

| tool | class | required input | declared output |
|---|---|---|---|
| `activate_intelligence_agent` | write | `agentId`, `expectedRevision` | `agent` |
| `apply_strategy_plan` | destructive | `request` | `appliedImpact`, `strategy` |
| `archive_intelligence_agent` | destructive | `agentId`, `expectedRevision` | `agent` |
| `archive_strategy` | destructive | `confirm`, `expectedRevision`, `strategyId` | `strategy` |
| `check_market_grid_submission` | read | `sessionId` | `hasSubmitted`, `submissionId`, `submittedAt` |
| `compile_strategy_plan` | read | `request` | `approvedPlan`, `planToken`, `reviewContext` |
| `create_intelligence_agent` | write | `brain`, `displayName`, `strategyId` | `agent`, `slotUsage` |
| `delete_radar_deployment` | destructive | `coinId`, `confirm`, `expectedRevision` | `coinId`, `deleted` |
| `derive_strategy_rule_view` | read | `sections` | `rules` |
| `fork_strategy` | write | `sourceRevision`, `strategyId` | `strategy` |
| `get_account_state` | read | — | `agentSlots`, `balance`, `mcpWagerEnabled`, `stats`, `tradingWalletProvisioned`, `username` |
| `get_agent_budget` | read | `agentId` | `budget` |
| `get_agent_explorer` | read | — | `aggregations`, `currentUser`, `entries`, `filter`, `generatedAt`, `stats` |
| `get_agent_journal` | read | `agentId` | `recentActivity`, `recentGames`, `recentThoughts`, `username` |
| `get_agent_thought_log` | read | `agentId` | `entries`, `limit`, `page`, `total` |
| `get_intelligence_agent` | read | `agentId` | `agent` |
| `get_leaderboard` | read | `metric`, `timeframe` | `currentUser`, `filter`, `generatedAt`, `leaderboard` |
| `get_market_grid_results` | read | `sessionId` | `avgNetChangeCapture`, `captureEfficiency`, `coinBoard`, `coinCaptainBadges`, `dominantBiasDirection`, `dominantBiasPercent`, `gameDuration`, `gameName`, `gameType`, `itmCount`, `itmPercent`, `leaderboard`, `playerGrids`, `players`, `resolutions`, `session`, `sessionAccuracy`, `settledMarketData`, `totalCorrectCount`, `totalDownCount`, `totalPlayers`, `totalPredictionCount`, `totalUpCount` |
| `get_market_grid_session` | read | `sessionId` | `chartIntervalMs`, `coinCaptainBadges`, `coinCount`, `coinPool`, `createdAt`, `displayName`, `entryFee`, `feeConfig`, `finalScoringSource`, `gamePresetId`, `gameType`, `gridCols`, `gridRows`, `gridSize`, `hostUserId`, `id`, `jackpotPayoutHighlights`, `lockAt`, `payoutBandSummary`, `payoutMultiplier`, `payoutStructure`, `perfectGameJackpot`, `playerCount`, `presetBadgeImageUrl`, `prizePool`, `settleAt`, `status`, `timeRangeKey`, `timeframe`, `totalPurse`, `warBondContribution`, `warBondCycleId`, `warBondDeployed`, `warBondPoolId` |
| `get_metric_construction_hints` | read | `metric` | `metric` |
| `get_public_agent_realized_trades` | read | `agentId` | `limit`, `page`, `total`, `trades` |
| `get_public_agent_signal_log_detail` | read | `agentId`, `logId` | `log` |
| `get_public_agent_signal_logs` | read | `agentId` | `entries`, `total` |
| `get_public_agent_signal_performance` | read | `agentId` | `avgAggregateScore`, `avgAggregateScorePercent`, `avgConviction`, `avgConvictionPercent`, `avgDurationSeconds`, `avgNetPnl`, `avgRiskRewardRatio`, `blockedCount`, `cancelledCount`, `enterCount`, `executedCount`, `expiredCount`, `failedCount`, `fillRatePct`, `lossCount`, `outcomeCount`, `pendingCount`, `skipCount`, `skippedCount`, `topCoinsByEvaluation`, `totalEntryDecisions`, `totalEvaluations`, `totalNetPnl`, `winCount`, `winRate`, `winRatePercent` |
| `get_public_agent_unrealized_pnl` | read | `agentId` | `snapshot` |
| `get_signal_log` | read | `agentId`, `logId` | `log` |
| `get_signal_performance` | read | `agentId` | `avgAggregateScore`, `avgAggregateScorePercent`, `avgConviction`, `avgConvictionPercent`, `avgDurationSeconds`, `avgNetPnl`, `avgRiskRewardRatio`, `blockedCount`, `cancelledCount`, `enterCount`, `executedCount`, `expiredCount`, `failedCount`, `fillRatePct`, `lossCount`, `outcomeCount`, `pendingCount`, `skipCount`, `skippedCount`, `topCoinsByEvaluation`, `totalEntryDecisions`, `totalEvaluations`, `totalNetPnl`, `winCount`, `winRate`, `winRatePercent` |
| `get_strategy` | read | `strategyId` | `strategy` |
| `get_strategy_column_contract` | read | `column` | `contract` |
| `get_strategy_signal_definition` | read | `signalId` | `signal` |
| `get_trading_config_catalog` | read | — | `positionManagementPresets`, `tradingDefaults` |
| `get_user_thought_log` | read | — | `entries`, `limit`, `page`, `total` |
| `list_approved_models` | read | — | `models` |
| `list_entry_decisions` | read | `agentId` | `entries`, `total` |
| `list_gate_blocks` | read | `agentId` | `entries`, `total` |
| `list_intelligence_agents` | read | — | `agents`, `slotUsage` |
| `list_market_grid_sessions` | read | — | `sessions` |
| `list_radar_deployments` | read | — | `policies`, `summary` |
| `list_signal_logs` | read | `agentId` | `entries`, `total` |
| `list_strategies` | read | — | `quota`, `strategies` |
| `list_strategy_categories` | read | — | `categories` |
| `list_strategy_signals` | read | — | `signals` |
| `list_strategy_vocabulary` | read | `category` | `budgets`, `category`, `metrics`, `templates`, `timeframeRefs`, `timeframes`, `transforms` |
| `list_trade_outcomes` | read | `agentId` | `outcomes`, `total` |
| `list_user_active_positions` | read | — | `activeCoinTickers`, `agents`, `positions`, `totals`, `userId` |
| `preview_strategy_report` | read | `coinSelection`, `regimeAutoDerive`, `sections`, `timeframe` | `budgetUsage`, `conditionOutcomes`, `estimatedTokenCount`, `rankScopingNote`, `renderedSections`, `tokenCountModel` |
| `rebind_intelligence_agent` | destructive | `agentId`, `confirm`, `expectedRevision`, `strategyId` | `agent` |
| `restore_strategy` | write | `expectedRevision`, `strategyId` | `strategy` |
| `simulate_aggregate_score` | read | `gate`, `signals` | `aggregateScore`, `aggregateScorePercent`, `attributions`, `gate`, `gatePercent`, `wouldRoute` |
| `update_intelligence_agent` | destructive | `agentId`, `expectedRevision` | `agent` |
| `update_strategy_signal_rule` | destructive | `request` | `strategy` |
| `upsert_radar_deployment` | write | `coinId`, `request` | `revision` |

## What it does not use yet

Grouped by classification. These are the surfaces available if the product grows
into them — positions, orders, market context, deployment policies, wagering.

### read (43 unused)

`get_agent_activity_feed`, `get_agent_automation_status`, `get_agent_coin_qualification`, `get_agent_decision_context`, `get_agent_fund_allocation`, `get_agent_game_history`, `get_agent_open_positions`, `get_agent_performance`, `get_agent_prompt_context_preview`, `get_coin_candles`, `get_coin_market_context`, `get_coin_metadata`, `get_coin_performance_history`, `get_coin_signal_preview`, `get_context_source_full_preview`, `get_context_sources_preview`, `get_decision_order_attribution`, `get_deployment_policy`, `get_entry_decision`, `get_macd_heatmap`, `get_market_context`, `get_market_grid_player_grid`, `get_mcp_reasoning_journal`, `get_open_orders`, `get_order_status`, `get_position_audit_history`, `get_public_agent_game_history`, `get_public_agent_trade_chart`, `get_radar_deployment`, `get_regime_history`, `get_regime_snapshot`, `get_strategy_section_template`, `get_top_ranked_coins`, `get_trade_chart`, `get_trade_outcome_by_decision`, `get_user_activity_feed`, `get_user_agent_game_history`, `list_game_presets`, `list_pending_approvals`, `list_session_agent_positions`, `preview_deployment_resolution`, `preview_radar_resolution`, `test_generate_deployment_grid`

### write (12 unused)

`accept_entry_decision`, `close_agent_position`, `generate_agent_grid`, `halt_intelligence_agent`, `random_submit_market_grid`, `reset_agent_drawdown_baseline`, `resume_intelligence_agent`, `set_agent_per_trade_push`, `submit_agent_grid`, `submit_market_grid`, `update_market_grid`, `upsert_deployment_policy`

### destructive (3 unused)

`cancel_entry_decision`, `delete_deployment_policy`, `override_agent_protection`
