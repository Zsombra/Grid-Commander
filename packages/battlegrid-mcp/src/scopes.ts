/**
 * The capability boundary — the single source of safety truth for Grid Commander.
 *
 * Every BattleGrid tool is classified into one of three tiers:
 *   - observe: pure reads, no side effects
 *   - manage:  writes that change the account but move no money
 *              (create/rebind agents, author/apply strategies, billed LLM previews)
 *   - wager:   the 16 tools that commit real money or standing trading authority
 *
 * BattleGrid's own `mcp:read` / `mcp:wager` scope split is about trading
 * authority, not read-vs-write, so several `mcp:read` tools are "manage" here.
 *
 * An UNKNOWN tool (surface drift) classifies as `wager` — the most restricted
 * tier — so it is never callable by a non-wager client by default. Fail safe.
 *
 * Baseline generated from docs/reference/battlegrid-mcp-tools.json; refresh with
 * `pnpm gen:tools`. The MANAGE_TOOLS list is a curated safety judgment (which
 * read-scoped tools mutate the account) and is reviewed on every change.
 */

// GENERATED baseline — see scripts/gen-tools.ts. Safety-critical; edits reviewed.
export const WAGER_TOOLS = [
  "accept_entry_decision",
  "cancel_entry_decision",
  "close_agent_position",
  "delete_deployment_policy",
  "delete_radar_deployment",
  "halt_intelligence_agent",
  "override_agent_protection",
  "random_submit_market_grid",
  "reset_agent_drawdown_baseline",
  "resume_intelligence_agent",
  "set_agent_per_trade_push",
  "submit_agent_grid",
  "submit_market_grid",
  "update_market_grid",
  "upsert_deployment_policy",
  "upsert_radar_deployment",
] as const;

export const MANAGE_TOOLS = [
  "activate_intelligence_agent",
  "apply_strategy_plan",
  "archive_intelligence_agent",
  "archive_strategy",
  "create_intelligence_agent",
  "fork_strategy",
  "generate_agent_grid",
  "rebind_intelligence_agent",
  "restore_strategy",
  "test_generate_deployment_grid",
  "update_intelligence_agent",
  "update_strategy_signal_rule",
] as const;

export const OBSERVE_TOOLS = [
  "check_market_grid_submission",
  "compile_strategy_plan",
  "derive_strategy_rule_view",
  "get_account_state",
  "get_agent_activity_feed",
  "get_agent_automation_status",
  "get_agent_budget",
  "get_agent_coin_qualification",
  "get_agent_decision_context",
  "get_agent_explorer",
  "get_agent_fund_allocation",
  "get_agent_game_history",
  "get_agent_journal",
  "get_agent_open_positions",
  "get_agent_performance",
  "get_agent_prompt_context_preview",
  "get_agent_thought_log",
  "get_coin_candles",
  "get_coin_market_context",
  "get_coin_metadata",
  "get_coin_performance_history",
  "get_coin_signal_preview",
  "get_context_source_full_preview",
  "get_context_sources_preview",
  "get_decision_order_attribution",
  "get_deployment_policy",
  "get_entry_decision",
  "get_intelligence_agent",
  "get_leaderboard",
  "get_macd_heatmap",
  "get_market_context",
  "get_market_grid_player_grid",
  "get_market_grid_results",
  "get_market_grid_session",
  "get_mcp_reasoning_journal",
  "get_metric_construction_hints",
  "get_open_orders",
  "get_order_status",
  "get_position_audit_history",
  "get_public_agent_game_history",
  "get_public_agent_realized_trades",
  "get_public_agent_signal_log_detail",
  "get_public_agent_signal_logs",
  "get_public_agent_signal_performance",
  "get_public_agent_trade_chart",
  "get_public_agent_unrealized_pnl",
  "get_radar_deployment",
  "get_regime_history",
  "get_regime_snapshot",
  "get_signal_log",
  "get_signal_performance",
  "get_strategy",
  "get_strategy_column_contract",
  "get_strategy_section_template",
  "get_strategy_signal_definition",
  "get_top_ranked_coins",
  "get_trade_chart",
  "get_trade_outcome_by_decision",
  "get_trading_config_catalog",
  "get_user_activity_feed",
  "get_user_agent_game_history",
  "get_user_thought_log",
  "list_approved_models",
  "list_entry_decisions",
  "list_game_presets",
  "list_gate_blocks",
  "list_intelligence_agents",
  "list_market_grid_sessions",
  "list_pending_approvals",
  "list_radar_deployments",
  "list_session_agent_positions",
  "list_signal_logs",
  "list_strategies",
  "list_strategy_categories",
  "list_strategy_signals",
  "list_strategy_vocabulary",
  "list_trade_outcomes",
  "list_user_active_positions",
  "preview_deployment_resolution",
  "preview_radar_resolution",
  "preview_strategy_report",
  "simulate_aggregate_score",
] as const;

export type Tier = "observe" | "manage" | "wager";

/** observe < manage < wager. A client may call tools at or below its grant. */
export const TIER_RANK: Record<Tier, number> = { observe: 0, manage: 1, wager: 2 };

const WAGER = new Set<string>(WAGER_TOOLS);
const MANAGE = new Set<string>(MANAGE_TOOLS);
const OBSERVE = new Set<string>(OBSERVE_TOOLS);

/** Every tool name the client knows about (all three tiers). */
export const KNOWN_TOOLS: ReadonlySet<string> = new Set<string>([
  ...WAGER_TOOLS,
  ...MANAGE_TOOLS,
  ...OBSERVE_TOOLS,
]);

export function isKnownTool(name: string): boolean {
  return KNOWN_TOOLS.has(name);
}

/**
 * Classify a tool into its tier. An unknown tool is treated as `wager` so it
 * can never be dispatched by an observe/manage client — the fail-safe default.
 */
export function classify(name: string): Tier {
  if (WAGER.has(name)) return "wager";
  if (MANAGE.has(name)) return "manage";
  if (OBSERVE.has(name)) return "observe";
  return "wager";
}

export type ObserveTool = (typeof OBSERVE_TOOLS)[number];
export type ManageTool = (typeof MANAGE_TOOLS)[number];
export type WagerTool = (typeof WAGER_TOOLS)[number];
