---
id: conditions-are-an-unmodelled-authoring-layer
title: Conditions — a boolean layer above signals, recorded since 2026-07-31 and never read
type: feature
status: done
priority: p2
created: 2026-08-04
updated: 2026-08-06
change: a-drafted-condition-can-be-tried
capability: strategy-authoring
blocked_by: []
tags: [battlegrid, v5, strategy, authoring, mapping]
---

# `conditions` are an unmodelled authoring layer

Found by re-probing the surface on 2026-08-04, after
`the-map-knows-when-it-is-stale` established the record still said v3.0.0.

**Corrected 2026-08-04.** This item first said v5.0.0 added the layer. It did
not. Checked against the artifacts:

| date | server | strategy `conditions` |
|---|---|---|
| 2026-07-27 | v3.0.0 | **absent** — the only `conditions` in that reference are deployment-slot time windows, a different feature |
| 2026-07-31 | (unrecorded) | **present**, with `conditionVerdicts` alongside |
| 2026-08-04 | v5.0.0 | present; `conditionVerdicts` **removed** |

So the layer arrived between 2026-07-27 and 2026-07-31, and what v5 did was
*remove* `conditionVerdicts`. That is the version the map missed, and it is why
the finding surfaced now — but the layer itself has been in
`docs/battlegrid-mcp-surface.json` for five days, recorded and unread.
`compiled-plan.ts` even names `conditions` as part of the sixth dead write path.
It was projected through without ever being looked at.

The shape:

```
conditions[].conditionKey   string
conditions[].name           string
conditions[].definition     ALL | ANY | NOT | N_OF  (with `n`, and `members`)
conditions[].verdict        UP | DOWN | NEITHER | null
```

It appears on `compile_strategy_plan`, `apply_strategy_plan` and
`preview_strategy_report` — which now also returns a matching
`conditionOutcomes`.

## Where the product stands

**It passes them through and cannot see them.** `conditions` is projected from
the compile response into the apply payload (`PLAN_FIELDS_FROM_POST_STATE`), so
an apply carrying conditions is not rejected. Nothing reads them, renders them,
or lets an operator author one.

This is the same shape as `the-payload-carries-more-than-is-read`, except the
unread thing is a grammar rather than a field: an operator whose strategy has
conditions sees a scorecard that does not mention the layer deciding whether the
scorecard is consulted at all.

## Why P2 rather than P3

`/agents/[id]/pipeline/[logId]` exists to answer *why did it decide that*. If a
condition gated the evaluation, the current answer is incomplete in a way the
page gives no hint about — and this product's whole claim is that it does not
leave that kind of gap unnamed.

## First step when taken

Read-only, on a real strategy that has conditions: `get_strategy` and
`preview_strategy_report`, recording the shape of `conditions` and
`conditionOutcomes` here. Only then decide whether the pipeline page renders the
verdict, or whether authoring follows.

`N_OF` carries an `n` and `members`, and `members` is `array<?>` in the declared
schema — whether members are condition keys, signal ids, or nested definitions
is not answerable from the schema and must be observed.

## What has been taken, and what is left

Three changes, in the order the layer became legible.

- `the-condition-layer-is-legible` (2026-08-05) — reading the definitions on
  `/strategies/[id]`. It also **answered the open question above**: `members`
  are nested definitions, not condition keys or signal ids, observed live in
  Berlin's `N_OF 3 of: ref, ref, NOT(ref), clause, clause, clause` and confirmed
  in the declared schema, where `members.items` is a `$ref` back to `definition`.
- `the-condition-outcomes-are-legible` (2026-08-06) — the outcomes half, per
  ticker, on the preview surface.
- `a-drafted-condition-can-be-tried` (2026-08-06) — the authoring half this item
  asks for, **as far as it can honestly go**: an operator composes a condition
  and BattleGrid resolves it live, and nothing can be saved. Why saving is not
  offered, and what it will need, is `a-drafted-condition-cannot-be-saved`.

This item stays open until a condition can be written. Two facts block that and
are filed with the calls that settle them:
`an-update-that-omits-conditions-is-unobserved` and
`the-record-flattens-the-condition-union`.

## Related

- `the-map-knows-when-it-is-stale` — the change that found it
- `the-payload-carries-more-than-is-read` — the same failure mode, one level down
