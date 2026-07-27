# BattleGrid MCP — Architecture Review & Build Surface

Exploration output. Not a spec, not a change — the map we build from.
Machine-readable tool inventory: `docs/reference/battlegrid-mcp-tools.json`.

---

## 1. What BattleGrid is

`battlegrid.trade` is a **real-money crypto prediction and autonomous-trading
platform**. Two things live behind one login:

- **Market Grid** — a prediction game. Each session posts a pool of coins; you
  predict UP or DOWN per coin, nominate one "Captain" (2× multiplier), pay a
  USDC entry fee, and are scored against the settled market.
- **Intelligence Agents** — configurable LLM-driven trading agents that author
  strategies, evaluate signals, and open **real leveraged positions** on a
  connected exchange (Hyperliquid perps, from the bundle).

Both are fully driven by an MCP server. The website is a Next.js SPA over the
same API; **the MCP surface is the platform's public control plane.**

---

## 2. The connection

| | |
|---|---|
| Endpoint | `https://mcp.battlegrid.trade/mcp` |
| Transport | Streamable HTTP (JSON-RPC 2.0), protocol `2025-06-18` |
| Auth | `Authorization: Bearer <BG_API_KEY>` |
| Discovery | `GET /.well-known/oauth-protected-resource` |
| Server | `battlegrid v3.0.0` |
| Surface | **110 tools · 5 prompts · 3 resources** |
| Health | `GET https://mcp.battlegrid.trade/health` (unauthenticated) |

### Two scopes — this is the load-bearing distinction

| Scope | Grants | Tools |
|---|---|---|
| `mcp:read` | Everything observational — market data, regimes, agent config, performance, signal logs, previews, simulations, public discovery | 94 |
| `mcp:wager` | Everything that **commits money or standing authority** — submit a grid, accept a trade, deploy an autonomous policy, close a position, override a stop-loss | 16 |

**The 16 `mcp:wager` tools are the entire risk surface.** Everything else is
safe to call freely. Our architecture must treat that boundary as a hard
internal seam, not a footnote — see §6.

### The account this key controls (live, read at survey time)

```
user: Fibonacci   ·   balance: $78.83 USDC   ·   mcpWagerEnabled: true
trading wallet: provisioned   ·   agent slots: 2 of 3 used
15 games played · 20% win rate · $150 total wagered
platform limits: 10 signed wagers/day, $500/day volume
```

This is not a sandbox. The key moves real money, capped by the daily limits above.

---

## 3. The 110 tools, by domain

Full descriptions in the JSON inventory. `‡` = `mcp:wager`. `☠` = destructive.

### Data source — the foundation (20 tools, all read)

The layer everything else builds on. Start here.

**Market data & context (8)** — `get_market_context` (21 selectable modules,
the *same context the agents themselves consume*), `get_coin_market_context`,
`get_coin_candles`, `get_coin_metadata`, `get_coin_performance_history`,
`get_top_ranked_coins`, `get_macd_heatmap`, `get_coin_signal_preview`.

**Regime detection (2)** — `get_regime_snapshot` (current regime + conviction +
run-length + trend/volatility/momentum/structural-bias/price-position),
`get_regime_history` (the regime time-series). This is a *first-class platform
primitive*, not something we compute — directly answers "identify different
regimes."

**Market Grid sessions (10)** — `list_market_grid_sessions`,
`get_market_grid_session`, `get_market_grid_results`, `list_game_presets`, and
the submission tools (some `‡`).

### Strategy layer (17 tools, mostly read)

A complete **strategy authoring system** exposed as tools: `list_strategies`
(system catalog + your private forks), `get_strategy`, `fork_strategy`,
`compile_strategy_plan` (validates a CREATE/UPDATE/RESTORE into a normalized
plan + a 5-minute credential-bound token — *no write*), `apply_strategy_plan`
(atomically applies that plan), plus a full report/column/signal vocabulary
(`list_strategy_categories`, `list_strategy_signals`,
`get_strategy_signal_definition`, `preview_strategy_report`, …).

The compile-then-apply, token-bound, revision-checked shape means **we do not
have to invent strategy validation — the platform enforces it.** A strategy
maker is largely an orchestration and UX problem, not an engine problem.

### Intelligence agents (12 tools)

`create_intelligence_agent`, `update_intelligence_agent`,
`rebind_intelligence_agent` (☠), `archive`/`activate`, `list_approved_models`
(OpenRouter / OpenAI / Anthropic / Gemini), `get_agent_journal`,
`generate_agent_grid` (LLM proposal, billed, read-scope), `submit_agent_grid`
(`‡`), `get_agent_automation_status`.

### Autonomous deployment (10 tools)

Standing authority that fires trades without you in the loop.
**Presets:** `upsert_deployment_policy` (`‡`), `preview_deployment_resolution`
(dry-run the scheduler), `test_generate_deployment_grid`.
**Radar:** `upsert_radar_deployment` (`‡` — "standing autonomous authority that
fires real trades on confirmed-regime flips"), `preview_radar_resolution`,
`list_radar_deployments`. Deletes are `‡ ☠`.

### Signals & entry decisions (12 tools)

The agent decision pipeline, fully observable and controllable:
`list_signal_logs` / `get_signal_log` (per-signal scorecards),
`get_signal_performance`, `list_entry_decisions` / `get_entry_decision`,
`accept_entry_decision` / `cancel_entry_decision` (`‡` — approve/deny a pending
trade), `list_gate_blocks` (pre-signal rejections), `simulate_aggregate_score`
(stateless what-if on a signal set — *pure, free, no state*),
`get_agent_coin_qualification`.

### Risk & budget (7 tools)

`get_agent_budget` (concurrency + drawdown ceilings), `get_agent_performance`,
`get_agent_fund_allocation`, `halt`/`resume_intelligence_agent` (`‡` — kill
switch), `reset_agent_drawdown_baseline` (`‡`), `set_agent_per_trade_push` (`‡`).

### Positions & orders (9 tools)

`list_user_active_positions`, `get_agent_open_positions`,
`get_position_audit_history`, `get_open_orders`, `get_order_status`,
`list_pending_approvals`, `close_agent_position` (`‡ ☠`),
`override_agent_protection` (`‡` — manual stop-loss override).

### Performance & history (8 tools)

Per-agent and per-user reasoning journals, activity feeds, game history,
`get_trade_chart` (frozen candle series with entry/exit/SL/TP overlay),
`get_trade_outcome_by_decision`.

### Public discovery (9 tools)

The same performance, signal-log, trade-chart, and P&L views for **any public
agent** — `get_agent_explorer` (ranked by net P&L / win rate), the whole
`get_public_agent_*` family. This is a competitive-intelligence dataset: learn
from what the winning agents actually do.

### Agent introspection (4 tools)

`get_trading_config_catalog`, `get_context_sources_preview`,
`get_context_source_full_preview`, `get_agent_prompt_context_preview` — see the
exact prompt an agent will receive before it runs. Gold for debugging and
optimization.

### Account (2 tools)

`get_account_state`, `get_leaderboard`.

---

## 4. How the platform's own pipeline works

Reconstructed from the tool graph, the `/health` worker list, and the leaked
platform config. This is the machine we are building a cockpit for:

```
                          ┌─────────────────────────┐
                          │   MARKET DATA + REGIME   │  candles, indicators,
                          │   (get_market_context,   │  21 context modules,
                          │    get_regime_snapshot)  │  regime classification
                          └────────────┬────────────┘
                                       │ feeds
                          ┌────────────▼────────────┐
                          │        STRATEGY         │  signal rules + weights
                          │  (compile → apply plan) │  + allocation tiers
                          └────────────┬────────────┘
                                       │ binds to
                          ┌────────────▼────────────┐
                          │   INTELLIGENCE AGENT    │  strategy + LLM brain
                          │  (create/update/rebind) │  + risk budget
                          └────────────┬────────────┘
                        ┌──────────────┴──────────────┐
                        │                              │
             manual / on-demand                autonomous
                        │                              │
          ┌─────────────▼──────────┐      ┌────────────▼─────────────┐
          │  SIGNAL EVALUATION      │      │   DEPLOYMENT (preset /   │
          │  (signal logs, gate     │      │    radar) fires on       │
          │   blocks, aggregate)    │      │    schedule / regime flip│
          └─────────────┬──────────┘      └────────────┬─────────────┘
                        │                              │
                        └──────────────┬───────────────┘
                                       ▼
                          ┌─────────────────────────┐
                          │     ENTRY DECISION      │  PENDING ENTER →
                          │  (accept ‡ / cancel ‡)  │  accept or auto-fire
                          └────────────┬────────────┘
                                       ▼
                          ┌─────────────────────────┐
                          │   LIVE POSITION + ORDERS │  fills, SL/TP,
                          │  (close ‡, override ‡)   │  protection repricing
                          └────────────┬────────────┘
                                       ▼
                          ┌─────────────────────────┐
                          │  OUTCOME + JOURNAL       │  realized P&L, trade
                          │  (performance, charts)   │  charts, thought logs
                          └─────────────────────────┘
                                       │
                                       └──── feeds back into strategy tuning
```

Every box is fully readable. Every `‡` is a point where we (or an autonomous
policy we set up) commit money.

---

## 5. What we can build

Ordered by dependency — each tier is usable alone and feeds the next. Note that
**a lot of the "engine" already lives in the platform**; our value is
orchestration, cross-tool synthesis, memory, and a cockpit over a raw tool API.

### Tier 0 — Read-only foundation (`mcp:read` only, zero money risk)

**MCP client + typed tool layer.** A thin, typed BattleGrid client: connect,
auth, session handling, all 110 tools as typed calls, the scope boundary
encoded in the types. Everything else sits on this. *This is the first change.*

### Tier 1 — Observation & intelligence (read-only, high value, low risk)

1. **Regime Radar** — poll `get_regime_snapshot`/`get_regime_history` across the
   coin universe; surface regime, conviction, run-length, and flips. Directly
   the "identify different regimes" ask. Pure read.
2. **Market & signal dashboard** — `get_market_context`, `get_macd_heatmap`,
   `get_top_ranked_coins`, `get_coin_signal_preview` in one view.
3. **Performance tracker** — realized P&L, win rate, signal performance, trade
   charts, drawdown, aggregated across your agents. All read tools exist.
4. **Competitor intelligence** — mine `get_agent_explorer` + the
   `get_public_agent_*` family: what are the top agents' signals, coins,
   win rates? Learn from live winners.

### Tier 2 — Authoring & simulation (read + preview, still no live money)

5. **Strategy maker** — a UX over `list_strategy_*` → `compile_strategy_plan`
   → review → `apply_strategy_plan`. The platform validates; we make it usable
   and add memory of what worked.
6. **Agent maker** — `create`/`update_intelligence_agent` over the approved
   model list and a chosen strategy, with `get_agent_prompt_context_preview` so
   you see the assembled prompt before committing.
7. **Backtest / what-if engine** — `simulate_aggregate_score` (pure),
   `get_coin_signal_preview` with agent weighting, `preview_deployment_resolution`
   and `preview_radar_resolution` (dry-run the scheduler), plus
   `get_coin_candles`/`get_coin_performance_history` for historical replay.
   A genuine strategy backtester, built entirely from read/preview tools.

### Tier 3 — Optimization (read-heavy, writes gated)

8. **Performance optimizer** — close the loop: read signal performance and trade
   outcomes, propose strategy-rule adjustments (`update_strategy_signal_rule`),
   simulate them, and only then apply. Forward-testing = deploy to one preset,
   watch, compare.

### Tier 4 — Autonomous execution (`mcp:wager` — real money, gated hard)

9. **Deployment cockpit** — manage preset & Radar policies, approve or deny
   pending entry decisions, halt/resume, close positions, override protection.
   Every action here is `‡`. This tier does not ship until Tiers 0–3 are solid
   and the safety envelope in §6 is enforced.

---

## 6. The safety architecture — non-negotiable

This platform can lose real money through our code. The scope split is the
platform's seam; we mirror it as an architectural one.

1. **Two-layer client.** A read client that *cannot* construct a `mcp:wager`
   call (the 16 tools are not on its type), and a separate wager client that is
   only instantiated behind an explicit, logged authorization path. Most of the
   app only ever sees the read client.
2. **Every `‡` call is a spec-level behavior** with its own requirement,
   scenario, and — where the pipeline allows — human confirmation. No wager tool
   is ever called as an incidental side effect. This is exactly what the
   `full` track and the design-contract lane rule exist for.
3. **Respect the platform's own limits as invariants**, not surprises: 10 signed
   wagers/day, $500/day volume, agent slot caps, per-agent drawdown ceilings.
   Read them from `get_account_state` / `get_agent_budget`; never assume.
4. **The API key never enters the repo.** Env var only, `.env` git-ignored, and
   **rotate the development key** — it has been shared in chat.
5. **Kill switch is first-class.** `halt_intelligence_agent` and
   `close_agent_position` must be reachable in one action from anywhere in the
   cockpit.

---

## 7. Recommended first change

**Tier 0: the typed read-only MCP client.** It is the foundation for
everything, carries zero money risk, exercises the `standard` track cleanly, and
lets us build the entire observation and simulation product (Tiers 1–3) before
we ever touch a `‡` tool. The wager client is a deliberate, later, `full`-track
change with the safety envelope above.

Open question for scoping: **which Tier-1 product do we build first on top of
the client** — Regime Radar, performance tracker, or the market/signal
dashboard? All three are pure-read and independently useful.
