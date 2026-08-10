---
id: the-deploy-surface-cannot-create-first-deployments
title: The platform now creates first radar deployments (null revision) and the deploy surface still assumes replacement-only
type: feature
status: open
priority: p3
created: 2026-08-08
updated: 2026-08-08
change: ""
capability: agent-deployment
github: "109"
blocked_by: []
tags: [battlegrid, radar, v14, capability-appeared]
---

# First deployments are creatable now, and the product cannot offer one

## What

`upsert_radar_deployment` accepts `expectedRevision: null` as the documented
first-deploy signal (`anyOf: [integer > 0, null]`; "pass null only for a
first deploy"). Proven live 2026-08-08: four first deployments created
(XRP, AVAX, xyz_jpy, xyz_gold), radar filled to its 20/20 cap. The
product's deploy flow (`DescribeDeployQuery` → `PerformDeployCommand` →
`McpRadarAdapter.upsertDeployment`) types `expectedRevision: number` and
describes only replacements of an occupied coin, so the act that just
happened over raw MCP cannot happen through the product.

## Why it matters

Deployment is the step that takes an authored agent from configured to
watching a market, and the one act the product told users to do on
battlegrid.trade is now in-scope. The describe→confirm→perform ceremony
should carry it: a first deploy has a different consequence sentence
("starts scanning X, replacing nobody") and a null revision binding.

## Evidence

`setup_log/firstdeploy_*.json` from the 2026-08-08 session (four CREATED
responses); the tool description and schema in
`docs/battlegrid-mcp-capabilities.json` at v14.0.0.

## Notes

The coin id vocabulary matters: TradFi synthetics deploy by `coins.id`
(`xyz_jpy`), not ticker (`JPY` answers "Coin not found"). `get_coin_metadata`
(now argumentless at v14) is the discovery read — 78 coins, 20-coin radar cap.
