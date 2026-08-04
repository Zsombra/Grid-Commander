---
id: v5-surface-additions-unconsumed
title: The smaller BattleGrid v5 additions — a price metric family, two column controls, and a module that became omissible
type: feature
status: open
priority: p3
created: 2026-08-04
updated: 2026-08-04
capability: strategy-authoring
blocked_by: []
tags: [battlegrid, v5, mapping, vocabulary]
---

# The smaller v5 additions, recorded so they are not rediscovered

From the 2026-08-04 re-probe (`battlegrid v3.0.0` → `v5.0.0`). `conditions` is
filed separately as `conditions-are-an-unmodelled-authoring-layer`; these are
the rest.

Nothing here is broken. Vocabulary is read at runtime and
`tests/strategy/structure.test.ts` forbids writing it into source, so the
additions simply appear and the removals simply stop appearing. The point of
filing them is that each is a capability the product could offer and does not.

## A new `price` metric family

`list_strategy_vocabulary` gained the category `price`:
`OPEN`, `HIGH`, `LOW`, `CLOSE`, `LAST`, `MARK`, `ORACLE`, `BAR_FORMING`.

Also: `ATR_PCT` arrived; `CHANGE_RANK`, `VOLUME_RANK` and the `crossSectional`
category left. The column grammar surfaces already list whatever the platform
returns, so these are visible today without any change.

## Two new column controls

`get_strategy_column_contract` gained:

- `bars` — `closed | all`
- `ordering` — `hi | lo | far | near`

`chainedTransformId` is already carried (`src/ports/strategies.ts`). These two
are not, so a column the operator builds here cannot express them.

## `priceAction` became omissible — the one with a trap

Module 1 (Price Action) changed from **"always included"** to **"selectable like
any other module — included by default, omitted when your list leaves it out"**.
Modules went 21 → 22 and the default became
`["priceAction", "rsi", "relativeStrength"]`.

Anyone constructing a `modules` list without `priceAction` now silently loses
price action. **This product is safe only because it never sends `modules` at
all** — which is luck, not design, and worth knowing before any surface starts
composing that argument.

## `entryStrategy` on deployment policy slots

`upsert_deployment_policy`, `preview_deployment_resolution` and
`test_generate_deployment_grid` replaced `earlyEntryEnabled` +
`reassessmentEnabled` with a required `entryStrategy: STANDARD | TWO_LOOK`.

This product calls no policy tool, so nothing broke. Radar slots — which it does
send — are unchanged: `agentId, minConviction, priority, isDefault, conditions`.

Recorded here because it is the clearest example of why the freshness guard
exists: had the product modelled policies, every deployment write would have
been rejected from the moment BattleGrid deployed, with every conformance guard
still green.

## `get_open_orders` recovered

It failed `INTERNAL_ERROR` on the v3 probe and answers on v5. Noted so the
surface map's failure list is not read as permanent.
