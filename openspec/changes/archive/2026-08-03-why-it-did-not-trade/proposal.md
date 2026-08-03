# Proposal: Why It Did Not Trade

## Why

Phase 2, change 2. The trading record answers "what did it do". The
question underneath it — asked far more often, and never answerable in
this product — is **why it did not**. An agent can be deployed, funded and
silent for days, and nothing in Grid-Commander says which stage swallowed
each candidate.

BattleGrid keeps that record at three stages, all read-only, all observed
live 2026-08-03:

- **`list_gate_blocks(agentId)`** — candidates that never reached signal
  evaluation, with the stage (`ACCOUNT`, …), a reason code, and a
  **quantified** detail. The first row read on this account:
  `INSUFFICIENT_EQUITY`, `{equityUsd: 2.18, thresholdUsd: 10}`. That single
  row explains a silent agent better than any surface the product has.
- **`list_signal_logs(agentId)`** — evaluations that did run: aggregate
  score against the threshold in force, dominant bias, whether signals
  conflicted, how many triggered, the gate status, and the terminal status
  (`SKIPPED`, …). Envelope `{entries, total}`.
- **`list_entry_decisions(agentId)`** — what the agent decided and, in its
  own words, **why**: `decision` (ENTER/SKIP), direction, conviction,
  candidate levels, risk/reward, status, and a `reasoning` paragraph the
  model wrote.

Together they are a pipeline: blocked before evaluation → evaluated and
skipped → decided against. This change makes that pipeline readable.

## What Changes

- **Port reads** for the three stages, each mapped whole, each keeping the
  platform's own reason codes and quantified details rather than
  paraphrasing them.
- **`ReadPipelineQuery`** — the three stages for one agent, read in
  parallel, each independently able to be empty or unreadable without
  taking the others down.
- **`/agents/[id]/pipeline`** ("Why it did or didn't trade"), linked from
  the agent page: gate blocks with their quantified reasons, evaluations
  with score-against-threshold, and decisions with the agent's own
  reasoning. Empty stages say which stage is empty and what that means.

## Out of Scope

- **`accept_entry_decision` / `cancel_entry_decision`** — both require
  `mcp:wager`, one is destructive-flagged, and both commit real money.
  They get the full ceremony in their own change.
- **`list_pending_approvals`** — answers `{approvals: []}` on this account
  and the row shape has never been observed. Modelling it from the
  declaration alone is the mistake this project does not repeat; filed for
  when an APPROVAL_REQUIRED agent produces one.
- `get_signal_log` detail (the full scorecard), `simulate_aggregate_score`,
  and `get_signal_performance` — each its own surface.

## Capabilities

**Modified**: `agent-understanding` — one ADDED requirement.
