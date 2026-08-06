# BattleGrid — the operator's model of the product

**Source**: described by the operator (a daily user of battlegrid.trade in the
browser), 2026-07-31. This is the *user's* mental model of the platform — the
thing the tool names were reverse-engineered from, stated forward for once.
Hand-maintained; the generated surface map (`BATTLEGRID_SURFACE_MAP.md`) lists
tools, this file says what they are *for*.

## The four modules

### 1. Agents — "this is gonna do the entire thing"

An agent is three assignments in one object: **risk management** (the trading
limits), **strategy assignment** (the binding), and **language-model
assignment** (the brain). Creating an agent is configuring all three.

*Grid-Commander coverage: full — this is the `agent-authoring` /
`agent-understanding` capability pair.*

### 2. Strategies — the other half of the pair

Where the user creates strategies: composing **signal tables / data tables**
(the sections, metrics and signal rules) and reading **market data** to build
them. Agents and Strategies work as a pair by design: one module creates the
strategy, the other controls the risk/reward of that strategy and assigns the
LLM that manages it.

*Grid-Commander coverage: partial — fork, tagline + section composition,
compile→review→apply, archive/restore. Not yet: the signal/metric table
editor (`strategy-metric-editor`, P3) and the report preview
(`strategy-draft-preview`, P3); the market-data read tools
(`get_coin_*`, `get_regime_*`, `get_top_ranked_coins`, …) are unconsumed.*

### 3. Radar — how strategies are deployed

Deployment, per token: an agent is set up in the radar to **scan its assigned
strategy against one specific token** — the radar works per token, one agent
at a time. This is the step that takes an authored agent from "configured" to
"watching a market".

*Grid-Commander coverage: none. Tool cluster:*
`list_radar_deployments` · `get_radar_deployment` · `upsert_radar_deployment`
(write) · `delete_radar_deployment` (destructive) · `preview_radar_resolution`.
*Probably adjacent (module membership unconfirmed): the deployment-policy
trio (`get/upsert/delete_deployment_policy`) and
`preview_deployment_resolution` / `test_generate_deployment_grid`.*

### 4. Market Grid — the prediction game

A separate, game-shaped module: each session assigns **nine coins**, and the
user deploys an **already-configured agent** to play the prediction market —
the agent itself chooses the coins. Distinct from radar; the two "work
separate".

*Grid-Commander coverage: the read half (2026-08-06). `/arena` lists every
session with its schedule, coin pool, entry fee and player counts, states the
game's own rules from the presets, and opens one session at `/arena/[id]` with
its results as a state. Playing is not offered: entering stakes a real fee,
observed at 10 per session. Tool cluster:*
`list_market_grid_sessions` ✓ · `get_market_grid_session` ✓ ·
`check_market_grid_submission` ✓ · `get_market_grid_results` ✓ ·
`list_game_presets` ✓ · `get_market_grid_player_grid` (answers a 500 for "not
played", never called) · `submit_market_grid` / `update_market_grid` /
`random_submit_market_grid` / `submit_agent_grid` / `generate_agent_grid`
(writes, unbuilt) · `get_leaderboard` (read by the explorer, not game-scoped).

## What this changes about the coverage picture

The "87 unused tools" are not a monolith: two of them were **entire modules
Grid-Commander did not model** (Radar, Market Grid), and the sharpest open
question fell out of module 3: Grid-Commander can author an agent end to end
and had no deployment surface — and a bound agent does **not** act without
a radar deployment (answered live the same day; see Confidence notes). The
missing surface was `the-app-authors-agents-it-cannot-deploy` (P2).

Both have since been modelled on their read side, and both stop at the same
line: deploy and undeploy went through the confirmation ceremony
(`deploy-and-undeploy-are-offered`, 2026-07-31), and Market Grid did not —
entering a session stakes money, so the arena watches and does not play
(`the-game-is-legible-before-it-is-played`, 2026-08-06).

## Confidence notes

- The four-module structure and their purposes: operator-stated, high
  confidence.
- Which cluster the deployment-policy tools belong to: inferred, unconfirmed.
- Whether radar deployment is *required* for an agent to trade: **answered
  2026-07-31, live** — it is. Three deployed agents scanning, two undeployed
  lifecycle-ACTIVE agents with zero positions, and the radar summary counts
  only the deployed three as active. See
  `the-app-authors-agents-it-cannot-deploy` (P2).
