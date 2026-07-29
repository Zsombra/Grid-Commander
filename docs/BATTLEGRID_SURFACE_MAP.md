# BattleGrid MCP — read/write surface map

Probed live with `tools/probe_mcp_surface.py`. Regenerate after any BattleGrid
deployment: the server says its own list goes stale, and this file inherits that.

**110 tools** · 83 read ·
17 write · 10 destructive

**Grid-Commander calls 20 of them.** The other 90 are unconsumed capability.

Classification is the server's own annotation, never inferred from a name — the
product reads it at runtime and treats anything unannotated as destructive.
There are currently no unannotated tools.

## How much of this is actually verified

- **21 tools were called live** and their responses recorded. Across all of
  them, the declared `outputSchema` matched the observed response **exactly** —
  zero keys declared-but-absent, zero returned-but-undeclared.
- That is why the remaining tools can be checked against their declared schema
  without being called, which matters because 27 of them change things.
- Every observed response carried **both** encodings — `structuredContent` and a
  JSON text block — and they were byte-identical.

Two calls failed, and both are worth knowing:

- `get_market_context` — {"code":"VALIDATION_ERROR","message":"Provide sessionId or primaryTimeframe"}
- `get_open_orders` — {"code":"INTERNAL_ERROR","message":"Internal server error"}

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
| `compile_strategy_plan` | read | `request` | `approvedPlan`, `planToken`, `reviewContext` |
| `create_intelligence_agent` | write | `brain`, `displayName`, `strategyId` | `agent`, `slotUsage` |
| `fork_strategy` | write | `sourceRevision`, `strategyId` | `strategy` |
| `get_account_state` | read | — | `agentSlots`, `balance`, `mcpWagerEnabled`, `stats`, `tradingWalletProvisioned`, `username` |
| `get_agent_journal` | read | `agentId` | `recentActivity`, `recentGames`, `recentThoughts`, `username` |
| `get_intelligence_agent` | read | `agentId` | `agent` |
| `get_leaderboard` | read | `metric`, `timeframe` | `currentUser`, `filter`, `generatedAt`, `leaderboard` |
| `get_trading_config_catalog` | read | — | `positionManagementPresets`, `tradingDefaults` |
| `list_approved_models` | read | — | `models` |
| `list_intelligence_agents` | read | — | `agents`, `slotUsage` |
| `list_market_grid_sessions` | read | — | `sessions` |
| `list_strategies` | read | — | `quota`, `strategies` |
| `list_strategy_categories` | read | — | `categories` |
| `rebind_intelligence_agent` | destructive | `agentId`, `confirm`, `expectedRevision`, `strategyId` | `agent` |
| `restore_strategy` | write | `expectedRevision`, `strategyId` | `strategy` |
| `update_intelligence_agent` | destructive | `agentId`, `expectedRevision` | `agent` |

## What it does not use yet

Grouped by classification. These are the surfaces available if the product grows
into them — positions, orders, radar deployments, market context, wagering.

### read (72 unused)

`check_market_grid_submission`, `derive_strategy_rule_view`, `get_agent_activity_feed`, `get_agent_automation_status`, `get_agent_budget`, `get_agent_coin_qualification`, `get_agent_decision_context`, `get_agent_explorer`, `get_agent_fund_allocation`, `get_agent_game_history`, `get_agent_open_positions`, `get_agent_performance`, `get_agent_prompt_context_preview`, `get_agent_thought_log`, `get_coin_candles`, `get_coin_market_context`, `get_coin_metadata`, `get_coin_performance_history`, `get_coin_signal_preview`, `get_context_source_full_preview`, `get_context_sources_preview`, `get_decision_order_attribution`, `get_deployment_policy`, `get_entry_decision`, `get_macd_heatmap`, `get_market_context`, `get_market_grid_player_grid`, `get_market_grid_results`, `get_market_grid_session`, `get_mcp_reasoning_journal`, `get_metric_construction_hints`, `get_open_orders`, `get_order_status`, `get_position_audit_history`, `get_public_agent_game_history`, `get_public_agent_realized_trades`, `get_public_agent_signal_log_detail`, `get_public_agent_signal_logs`, `get_public_agent_signal_performance`, `get_public_agent_trade_chart`, `get_public_agent_unrealized_pnl`, `get_radar_deployment`, `get_regime_history`, `get_regime_snapshot`, `get_signal_log`, `get_signal_performance`, `get_strategy`, `get_strategy_column_contract`, `get_strategy_section_template`, `get_strategy_signal_definition`, `get_top_ranked_coins`, `get_trade_chart`, `get_trade_outcome_by_decision`, `get_user_activity_feed`, `get_user_agent_game_history`, `get_user_thought_log`, `list_entry_decisions`, `list_game_presets`, `list_gate_blocks`, `list_pending_approvals`, `list_radar_deployments`, `list_session_agent_positions`, `list_signal_logs`, `list_strategy_signals`, `list_strategy_vocabulary`, `list_trade_outcomes`, `list_user_active_positions`, `preview_deployment_resolution`, `preview_radar_resolution`, `preview_strategy_report`, `simulate_aggregate_score`, `test_generate_deployment_grid`

### write (13 unused)

`accept_entry_decision`, `close_agent_position`, `generate_agent_grid`, `halt_intelligence_agent`, `random_submit_market_grid`, `reset_agent_drawdown_baseline`, `resume_intelligence_agent`, `set_agent_per_trade_push`, `submit_agent_grid`, `submit_market_grid`, `update_market_grid`, `upsert_deployment_policy`, `upsert_radar_deployment`

### destructive (5 unused)

`cancel_entry_decision`, `delete_deployment_policy`, `delete_radar_deployment`, `override_agent_protection`, `update_strategy_signal_rule`
