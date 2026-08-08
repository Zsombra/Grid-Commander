# BattleGrid MCP — read/write surface map

Probed live with `tools/probe_mcp_surface.py` against **`battlegrid v14.0.0`**
on 2026-08-08 — the second probe that day; v13 lasted about five hours.
Regenerate after any BattleGrid deployment: the server says its own list goes
stale, and this file inherits that.

**114 tools** · 87 read ·
17 write · 10 destructive

**Grid-Commander calls 56 of them** — 44 read, 5 write, 7 destructive. The
other 58 are unconsumed capability.

(Corrected 2026-08-08: `get_agent_coin_qualification` has been consumed since
the qualification feature landed, but sat in the unused list — it shipped
after this file's last regeneration and the hand-maintained count missed it.)

Classification is the server's own annotation, never inferred from a name — the
product reads it at runtime and treats anything unannotated as destructive.
There are currently no unannotated tools.

## The count is not the check

This file was written against **`battlegrid v3.0.0`**. BattleGrid has deployed
four times since — v5.0.0, v5.1.0 hours later, and then **straight to v9.0.0**,
skipping four majors — and the tool count was **110 every single time**, while
enums, required arguments and one module's semantics moved underneath it.

| deployment | tools | what actually moved |
|---|---|---|
| → v5.0.0 | 110 | `conditionVerdicts` dropped from a closed plan schema; `entryStrategy` replaced two booleans on policy slots; `priceAction` became omissible |
| → v5.1.0 | 110 | four crowd metrics added — `CROWD_PICK_LIVE`, `CROWD_UPBIAS_LIVE`, `CROWD_ACC_LIVE`, `CROWD_CAPT_LIVE`. Purely additive |
| → v9.0.0 | 110 | a whole **perp/spot flow** module; **`VOLUME_RATIO` removed** from every metric enum; `preview_strategy_report` stopped returning `estimatedTokenCount` **and nested its rendered section bodies one level down** |
| → v11.0.0 | 110 | **`arenaChallengeEnabled` dropped** from create and update — and from the agent payloads themselves; `feasibilityAdvisory` added to create's declared output; a strategy-vocabulary metric enum shifted. Hidden for two days because only the record was re-probed, not the reference — see `two-agent-owned-fields-no-tool-can-write` |
| → v13.0.0 | 110 | the quietest yet: declared schemas, constants and annotations byte-identical across all 110 tools; `get_market_context` grew 23 → 25 selectable modules (`marketBreadth`, `referencePairs`) |
| → v14.0.0 | **114** | the count finally moved: four reads added (`get_agents_hub`, `get_agent_conviction_calibration`, `get_radar_activity`, `list_deployment_policies`) — and the agent writes changed underneath the product: `tradingConfig` dropped `atrTimeframe` + `atrMatchesStrategyTimeframe` (20 → 18 fields) and a CUSTOM brain now **requires** `behavior: {risk, outlook, conviction}`. The app's create path is refused wholesale — `agent-create-composes-fields-v14-refuses` (p1) |

**v9 arrived as an outage.** The platform 502'd for most of a day, came back on
a version four majors along, and kept flapping afterwards — individual tools
answering `HTTP 200` with `isError: true` and `INTERNAL_ERROR` inside while
their neighbours were fine. Read the envelope, not the status.

### What v9.0.0 brought

**Added — a perp/spot flow module, whole:**

| where | what |
|---|---|
| context source | `includePerpSpotFlow` |
| market-context module | `perpSpotFlow` (22 modules → 23) |
| signal module | `FLOW_DIVERGENCE` |
| signals | `flow_perp_spot_bull_divergence`, `flow_perp_spot_bear_divergence` |
| metrics | `PERP_SPOT_FLOW`, `PERP_SPOT_STRENGTH`, `PERP_SPOT_CONFIRMS`, `SPOT_CVD` |

Also `BB_WIDTH_PCT` and `RVOL` as metrics, and two catalog bounds —
`agentMinConfidenceFloorPercent`, `agentMinTradeConvictionFloorPercent`.

**Removed — and this is the one that could have hurt:**

- **`VOLUME_RATIO`** is gone from every metric enum: column inputs, column
  metrics, construction hints, compile, apply, preview, rule derivation. A
  product that had written it into source would now compose columns the platform
  refuses. Nothing here names it — vocabulary is read at runtime and
  `tests/strategy/structure.test.ts` forbids writing it into source, which is
  that rule paying for itself against a breaking removal.
- **`estimatedTokenCount`** is gone from `preview_strategy_report`. Not deleted
  — *moved*, into `budgetUsage` as `estimatedTokens` used-against-cap, which the
  tool's own description now says. Grid-Commander kept reading the old key and
  got `null` on every preview, so the preview page reported "Token estimate
  unavailable" directly above `estimatedTokens: 1767 of 16000`. Fixed by
  `the-token-estimate-moved-into-the-budget`.
- `preview_strategy_report`'s execution limits (result byte cap, deadline) moved
  to discovery: `list_strategy_vocabulary` gained `previewExecutionLimits`.

**Unchanged:** no tool added, removed, or reclassified. 5 prompts, 3 resources,
0 resource templates, protocol `2025-06-18`. 23 tools' schemas moved; 2
descriptions and the server instructions were reworded.

`docs/battlegrid-mcp-surface.json` now records the server version it was taken
from, `tests/live/surface-freshness.test.ts` fails when that disagrees with the
live server, and `./scripts/ci.sh` runs it as a named gate. The v5.1.0
deployment was found by that gate, on its first real run.

Do not read an unchanged 110 as evidence of anything.

## How much of this is actually verified

- **61 tools were called live** and their responses recorded — up from 43, and
  with **no failures at all**. Across all of them the declared `outputSchema`
  matched the observed response **exactly**: zero keys declared-but-absent, zero
  returned-but-undeclared.
- That is why the remaining tools can be checked against their declared schema
  without being called, which matters because 27 of them change things.
- Every observed response carried **both** encodings — `structuredContent` and a
  JSON text block — and they were byte-identical.

### What the probe had been unable to ask (fixed 2026-08-06)

Fifteen reads had never once been observed, and the reason was the probe's, not
the account's. Two blind spots:

**Enum arguments were treated as ids to harvest.** `interval`, `metric`,
`gameType`, `strategyTimeframe`, `sourceKey` and `category` are not ids — they
are enums the artifact **already held**, so the probe reported "no interval
available on this account" for a value sitting in its own file. It now fills a
required argument from the tool's own declared constants.

That cascaded. `get_top_ranked_coins` was itself blocked on `interval` and
`metric`; unblocking it produced the coin list, which is the only source of
`ticker` — and four coin-scoped tools were waiting on that.

**An either/or cannot be expressed in `required`.** `get_market_context` needs
"sessionId **or** primaryTimeframe", so the schema marks neither required, the
probe sent neither, and the call failed for the life of this file. The platform
says which it wanted; the probe now reads the refusal and retries **once** with
values the tool's own schema declares. Four tools were recovered this way, and
the map's one standing failure is gone.

**Composite arguments are built, where they can be honestly built.**
`coinSelection`, `sections`, `gate`, `signals` and `regimeAutoDerive` are
assembled from the schema's own declared constants and from payloads the probe
already holds — a real strategy's sections, the vocabulary's transforms. That is
what finally made `preview_strategy_report` callable.

Two are deliberately *not* built, and the attempts are recorded in the source:

- **`column`** — the schema was satisfiable from the tool's own
  `input_required_paths`, and the platform then refused on **grammar**: *"spread
  operand 'OPEN' is not a legal relational operand for base 'OPEN'"*. A legal
  column needs the report-table grammar, which this product models deliberately
  and a probe should not reimplement to fill an argument.
- **`request`** — its shape differs per tool, so one builder would have to guess
  which.

Declining leaves a skip that says *"not asked"*. Guessing left a failure that
reads as a broken tool. Only one of those is true.

The 49 still unobserved are honest: mostly account state (no Market Grid
sessions, no open orders, no entry decisions to fetch by id) plus those two.

### Why the unreachable ones are the dangerous ones

`preview_strategy_report` is one of them — it needs a composite `coinSelection`,
so it has **no observed shape**, so no conformance guard has anything to compare
against. v9 renamed nothing at the top level and instead moved each rendered
section's body one level down:

```
v5:  {sectionKey, title, text}
v9:  {sectionKey, section: {title, text}}
```

The adapter read `s['text']` and turned the now-absent field into `''`. The
preview page rendered five sections headed by their raw section key with no body
at all — the whole point of that surface — and every gate stayed green, because
the fixture still carried the v5 shape.

**A tool the probe cannot call is a tool whose shape can change in silence.**
That is the argument for teaching it to construct composite arguments, which is
what the remaining 52 are mostly waiting on.

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
| `get_agent_coin_qualification` | read | `agentId`, `coinTickers` | `verdicts` |
| `get_agent_explorer` | read | — | `aggregations`, `currentUser`, `entries`, `filter`, `generatedAt`, `stats` |
| `get_agent_journal` | read | `agentId` | `recentActivity`, `recentGames`, `recentThoughts`, `username` |
| `get_agent_thought_log` | read | `agentId` | `entries`, `limit`, `page`, `total` |
| `get_coin_signal_preview` | read | `interval`, `ticker` | `coinTicker`, `coinName`, `coinImageUrl`, `currentPrice`, `priceChangePercent`, `dominantBias`, `aggregateScorePercent`, `hasConflictingSignals`, `allEvaluatedSignals`, `isAgentWeighted`, `comparison` |
| `get_intelligence_agent` | read | `agentId` | `agent` |
| `get_leaderboard` | read | `metric`, `timeframe` | `currentUser`, `filter`, `generatedAt`, `leaderboard` |
| `get_market_grid_results` | read | `sessionId` | `avgNetChangeCapture`, `captureEfficiency`, `coinBoard`, `coinCaptainBadges`, `dominantBiasDirection`, `dominantBiasPercent`, `gameDuration`, `gameName`, `gameType`, `itmCount`, `itmPercent`, `leaderboard`, `playerGrids`, `players`, `resolutions`, `session`, `sessionAccuracy`, `settledMarketData`, `totalCorrectCount`, `totalDownCount`, `totalPlayers`, `totalPredictionCount`, `totalUpCount` |
| `get_market_grid_session` | read | `sessionId` | `chartIntervalMs`, `coinCaptainBadges`, `coinCount`, `coinPool`, `createdAt`, `displayName`, `entryFee`, `feeConfig`, `finalScoringSource`, `gamePresetId`, `gameType`, `gridCols`, `gridRows`, `gridSize`, `hostUserId`, `id`, `jackpotPayoutHighlights`, `lockAt`, `payoutBandSummary`, `payoutMultiplier`, `payoutStructure`, `perfectGameJackpot`, `playerCount`, `presetBadgeImageUrl`, `prizePool`, `settleAt`, `status`, `timeRangeKey`, `timeframe`, `totalPurse`, `warBondContribution`, `warBondCycleId`, `warBondDeployed`, `warBondPoolId` |
| `get_metric_construction_hints` | read | `metric` | `metric` |
| `get_position_audit_history` | read | `agentId`, `positionId` | `positionId`, `events` |
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
| `get_trade_chart` | read | `agentId`, `logId` | `result` |
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

### read (39 unused)

`get_agent_activity_feed`, `get_agent_automation_status`, `get_agent_decision_context`, `get_agent_fund_allocation`, `get_agent_game_history`, `get_agent_open_positions`, `get_agent_performance`, `get_agent_prompt_context_preview`, `get_coin_candles`, `get_coin_market_context`, `get_coin_metadata`, `get_coin_performance_history`, `get_context_source_full_preview`, `get_context_sources_preview`, `get_decision_order_attribution`, `get_deployment_policy`, `get_entry_decision`, `get_macd_heatmap`, `get_market_context`, `get_market_grid_player_grid`, `get_mcp_reasoning_journal`, `get_open_orders`, `get_order_status`, `get_public_agent_game_history`, `get_public_agent_trade_chart`, `get_radar_deployment`, `get_regime_history`, `get_regime_snapshot`, `get_strategy_section_template`, `get_top_ranked_coins`, `get_trade_outcome_by_decision`, `get_user_activity_feed`, `get_user_agent_game_history`, `list_game_presets`, `list_pending_approvals`, `list_session_agent_positions`, `preview_deployment_resolution`, `preview_radar_resolution`, `test_generate_deployment_grid`

### write (12 unused)

`accept_entry_decision`, `close_agent_position`, `generate_agent_grid`, `halt_intelligence_agent`, `random_submit_market_grid`, `reset_agent_drawdown_baseline`, `resume_intelligence_agent`, `set_agent_per_trade_push`, `submit_agent_grid`, `submit_market_grid`, `update_market_grid`, `upsert_deployment_policy`

### destructive (3 unused)

`cancel_entry_decision`, `delete_deployment_policy`, `override_agent_protection`
