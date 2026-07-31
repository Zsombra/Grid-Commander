---
id: the-app-authors-agents-it-cannot-deploy
title: An agent created here is configured, not acting — the deployment surface is missing
type: feature
status: open
priority: p2
created: 2026-07-31
updated: 2026-07-31
change: an-agent-says-whether-it-is-acting
capability: ""
blocked_by: []
tags: [battlegrid, radar, deployment]
---

# An agent created here is configured, not acting — the deployment surface is missing

## What

Established 2026-07-31 (`does-an-agent-act-without-a-radar-deployment`,
answered live): an agent acts only where a radar deployment points it at a
coin — per token, one agent per slot. Grid-Commander's create flow ends at
"bound, limited, ACTIVE", one step short of "doing something", and no surface
says whether an agent is deployed anywhere. A user can author an agent here
and wait forever.

## Shape of the feature

1. **Say it first (read-only, cheap)**: the agent page and roster show where
   an agent is deployed — coin, timeframe, scanning/in-position state — from
   `list_radar_deployments` / `get_radar_deployment`. Fixing the silence is
   most of the user value and needs no write.
2. **Then the writes, behind the full guard sequence**:
   `upsert_radar_deployment` (write) to deploy/repoint,
   `delete_radar_deployment` (destructive — confirmation naming the agent,
   the coin, and what stops happening). Slot exclusivity (one agent per coin
   slot) must be shown before submission, not discovered as a refusal.

## Evidence

Live account 2026-07-31: 3 policies (FARTCOIN/HYPE/PURR, 15m, one slot each)
filled by the 3 agents the platform counts as active; the 2 undeployed
lifecycle-ACTIVE agents hold zero positions. `docs/BATTLEGRID_PRODUCT_MODEL.md`
carries the operator's module model this confirms.

## Step 1 done 2026-07-31 — what is left

The read-only half shipped (`an-agent-says-whether-it-is-acting`): the agent
detail page states each deployment's market, timeframe and standing (holding
the position / on duty / in the rotation), says plainly when an agent is
configured but scanning nothing (naming battlegrid.trade's Radar as where
deployment happens today), and renders an unreadable radar as unknown — never
as idle. Live-proven same day: VELOCITY → deployed/on-duty/HYPE/15m,
Fade Master → not-deployed.

The roster indicator shipped too (`the-roster-says-who-is-acting`,
2026-07-31). Left on this item: step 2 — the guarded deploy/undeploy writes
(`upsert_radar_deployment` / `delete_radar_deployment` with a confirmation
naming the agent, the coin, and what starts or stops happening).
