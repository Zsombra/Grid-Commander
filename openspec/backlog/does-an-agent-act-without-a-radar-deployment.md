---
id: does-an-agent-act-without-a-radar-deployment
title: The app authors agents end to end and has no deployment surface
type: question
status: done
priority: p2
created: 2026-07-31
updated: 2026-07-31
change: ""
capability: ""
blocked_by: []
tags: [battlegrid, radar, product-model]
---

# The app authors agents end to end and has no deployment surface

## What

The operator (2026-07-31, `docs/BATTLEGRID_PRODUCT_MODEL.md`): the Radar is
how strategies are deployed — an agent is set up in the radar to scan its
assigned strategy against one specific token, per token, one agent at a time.
Grid-Commander models none of it: a user can create an agent, bind it, set its
limits — and the step that points it at a market lives only on
battlegrid.trade.

## The question

Does a bound, active agent act at all without a radar deployment? If not,
Grid-Commander's create flow ends one step short of "it is now doing
something", and nothing on our surfaces says so — a user could configure an
agent here and wait forever. If agents do act without radar (some default
scanning), the radar is an optimization surface instead, and the urgency
drops.

## How to answer

Cheap and read-only: `list_radar_deployments` against the live account (the
operator's agents are active and trading), and compare which agents appear.
An active, position-holding agent absent from radar answers "yes, they act
without it"; every trading agent present answers "radar is the go button".

## If radar is the go button

A deployment surface becomes the top product gap: offer
`upsert_radar_deployment` (write) / `delete_radar_deployment` (destructive —
confirmation naming the token and agent) behind the usual guard sequence, and
say on the agent page whether it is deployed anywhere.

## Related

- `docs/BATTLEGRID_PRODUCT_MODEL.md` — the operator's four-module model
- `market-grid-is-an-unmodelled-module` — the other whole module

## Answered 2026-07-31, same day, read-only

`list_radar_deployments` against the live account: three per-coin policies
(FARTCOIN, HYPE, PURR), each with exactly one slot — the operator's
"per token, one agent at a time", verbatim. CONFLUENCE, VELOCITY and
CONTRARIAN fill them, all `scanning`. The two lifecycle-ACTIVE agents *not*
on radar — Fade Master and Fade Master II — hold **zero open positions**, and
the radar summary counts `agentsActive: 3`, not 5: the platform itself treats
"active" as deployed-and-on-duty, distinct from the agent's ACTIVE status.

**Radar is the go button.** An agent Grid-Commander creates is configured,
not acting, until deployed — and nothing on our surfaces says so. Follow-on
filed: `the-app-authors-agents-it-cannot-deploy` (P2 feature).
