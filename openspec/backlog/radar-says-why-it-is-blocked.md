---
id: radar-says-why-it-is-blocked
title: v17 radar deployments carry blockedReason/blockedSince and a BLOCKED state — refusal telemetry, unread
type: feature
status: open
priority: p3
created: 2026-08-11
updated: 2026-08-11
change: ""
capability: agent-deployment
github: "135"
blocked_by: []
tags: [battlegrid, v17, radar, deployment]
---

# Radar says why it is blocked

## What

BattleGrid v17.2.0 grew the radar deployment reads (`get_radar_deployment`,
`list_radar_deployments`, `get_radar_activity`, `preview_radar_resolution`)
by `blockedReason` and `blockedSince`, and the resolution `section` enum
gained a `BLOCKED` state alongside `SCANNING`/`IDLE`. A radar deployment
that is not doing anything can now say why, and since when.

In the same deployment, `override_agent_protection`'s declared output
gained `observedLiveStopLoss` — the venue's actual stop at override time.
That tool is wager-scoped and this product offers no path to it; the field
is recorded here so the fact is filed somewhere rather than nowhere.

## Why it matters

The deployment surface holds the house rule that a state the product
cannot explain is rendered as unexplained rather than guessed. The
platform now explains one more state itself — `BLOCKED`, with reason and
age — which is precisely the kind of sentence the radar surface should
pass through instead of leaving a deployment looking idle for no reason.

## Evidence

- Declared-schema diff v16.0.0 → v17.2.0 in
  `docs/battlegrid-mcp-capabilities.json` (regenerated 2026-08-11):
  `get_radar_deployment` +28 leaves; section enum `SCANNING/IDLE` →
  `…/BLOCKED/…`.
- No blocked radar deployment has been observed live; `blockedReason`'s
  vocabulary is unestablished.

## Notes

The product does not read `resolvesNow` at all today (`grep resolvesNow
src/` is empty), so nothing renders or mis-renders the new state —
modelling starts from nothing, which is cleaner than a narrowing to
retrofit. Observe a blocked deployment first, then model; the house rule
stands that an unrecognised state renders as unrecognised, never
invented.
