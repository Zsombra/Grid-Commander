---
id: conditions-are-an-unmodelled-authoring-layer
title: BattleGrid v5 added conditions — a boolean layer above signals the product cannot author or read
type: feature
status: open
priority: p2
created: 2026-08-04
updated: 2026-08-04
capability: strategy-authoring
blocked_by: []
tags: [battlegrid, v5, strategy, authoring, mapping]
---

# `conditions` are an unmodelled authoring layer

Found by re-probing the surface on 2026-08-04, after
`the-map-knows-when-it-is-stale` established the record still said v3.0.0.

BattleGrid v5.0.0 added a boolean layer **above** signals:

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

## Related

- `the-map-knows-when-it-is-stale` — the change that found it
- `the-payload-carries-more-than-is-read` — the same failure mode, one level down
