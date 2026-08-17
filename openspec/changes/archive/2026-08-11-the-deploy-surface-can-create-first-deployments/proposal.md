# Proposal: The Deploy Surface Can Create First Deployments

## Why

Deployment is the step that takes a configured agent from idle to scanning a
market. Until v14, the platform required `expectedRevision > 0` for
`upsert_radar_deployment`, so a coin with no existing policy could not receive
its first deployment through MCP — the product correctly refused before
agreement. v14 introduced `expectedRevision: null` as the documented
first-deploy signal (`anyOf: [integer > 0, null]`), proven live 2026-08-08
with four first deployments created (XRP, AVAX, xyz_jpy, xyz_gold; radar
filled to 20/20).

The product still refuses, directing users to battlegrid.trade. The refusal is
pinned by the spec, unit tests, a live probe sentinel, and the type chain —
all of which say `expectedRevision: number`, with no null.

## What

Widen the deploy ceremony to offer first deployments alongside replacements.

When the operator names a coin with no existing deployment, the describe query
SHALL propose a first deployment with `expectedRevision: null` and a
consequence that says "starts scanning X" without naming a replacement. When
the coin already carries a deployment, the existing replacement flow is
unchanged.

The confirmation ceremony is identical in structure — describe→confirm→perform
— with a different consequence sentence and a null revision binding.

## Capabilities Touched

- **agent-deployment** (MODIFIED) — Requirement B gains a first-deploy path
  where it currently refuses

## Out of Scope

- **Coin picker / discovery surface.** The deploy form takes free-text coin
  input today. A discoverable coin list (via `get_coin_metadata`, 78 coins)
  would help operators find valid coin ids, but it is a separate surface
  concern. The backlog notes that TradFi synthetics use `coins.id`
  (`xyz_jpy`), not ticker (`JPY` → "Coin not found") — this matters for
  both first deploys and replacements equally and is not new.
- **Radar capacity checking.** The account is at 20/20. Whether to pre-check
  capacity before describing is a nicety — the platform refuses cleanly when
  at cap, and the refusal already reaches the operator through the existing
  ceremony.
- **The `radar-says-why-it-is-blocked` item.** v17's `blockedReason` /
  `blockedSince` fields on radar deployments are a separate read concern.

## Backlog Item

Closes `the-deploy-surface-cannot-create-first-deployments` (GitHub #109).
