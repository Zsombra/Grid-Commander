---
id: the-record-flattens-the-condition-union
title: The probed record describes only one branch of the condition grammar, so the conformance guard cannot see a condition payload
type: debt
status: open
priority: p3
created: 2026-08-06
updated: 2026-08-06
change: ""
capability: platform-mapping
blocked_by: []
tags: [battlegrid, conditions, conformance, tooling]
---

# The one payload `payload-conformance.test.ts` cannot hold

## What

`tools/probe_mcp_surface.py` records, per object path, what the schema accepts
there and whether the object is closed. For the condition grammar it records:

```json
"conditions[].definition": { "closed": true, "accepts": ["kind", "members", "n", "op"] }
```

That is the **group** branch and nothing else. The live schema declares
`definition` as an `anyOf` over six object shapes — four clause forms, a
`conditionRef`, and the group — so a clause's `column`, `value`, `label` and
`labels`, and a reference's `conditionKey`, all read as violations of a closed
set the platform does not close.

Identical on `preview_strategy_report` and `compile_strategy_plan`, checked
2026-08-06 against `docs/battlegrid-mcp-surface.json`.

## Why it happens

`input_accepts`'s walk gathers `object_branches` — the `anyOf` members that have
`properties` — and then recurses through each branch's own `properties` and
`items`. The definition union is *nested*: its outer `anyOf` holds one plain
object (the group) and one **further `anyOf`**, which has neither `properties`
nor `items`. So the walk sees exactly one object branch, records it with
`record_closed`, and never reaches the five shapes inside the inner union.

The probe's own docstring says a merged record "can miss a violation but never
invent one". Here it invents one — which is the more damaging direction, because
a guard that fails against correct code gets disabled rather than fixed.

## Why it matters

`payload-conformance.test.ts` holds every payload this product constructs
against the record. It cannot hold a condition payload, and this product now
constructs two of them: the round trip of a strategy's own conditions into
`preview_strategy_report` (`the-condition-outcomes-are-legible`), and a drafted
condition (`a-drafted-condition-can-be-tried`). Both are exempt from the guard
that caught the sixth dead write path, and the exemption is written into
`src/infrastructure/battlegrid/strategy-adapter.ts` as a comment.

Not p2, because the gap is covered rather than open: `tests/strategy/condition-draft.test.ts`
walks the **declared** schema out of `docs/battlegrid-mcp-capabilities.json`,
`$ref`s and `anyOf` branches intact, and holds every serialised form against it.
That is a better check than the record could give — it just lives in one test
file rather than in the sweep that covers everything else.

## What fixing it looks like

In `_walk`, when a branch is itself a union with no `properties`, recurse into
*its* branches rather than stopping. Then re-probe (the artifacts are generated,
never hand-edited) and add the two conformance cases.

The record would then need per-branch variants at `conditions[].definition`,
keyed by `kind` — except that three of the four clause shapes share
`kind: "clause"` and differ on `op`, which the existing `_discriminator` already
handles (it collects every const-pinned property, and `op` is `const` on the
`between`, `is` and `in` branches). The `lt/lte/gte/gt` branch pins `op` as an
`enum` rather than a `const`, so it would discriminate on `kind` alone and
collide with the other three. That collision is the real work.

## Evidence

- `tools/probe_mcp_surface.py` — `input_accepts`, the `object_branches` walk
- `docs/battlegrid-mcp-surface.json` — `conditions[].definition` on both tools
- `docs/battlegrid-mcp-capabilities.json` — the full union the record flattens
- `tests/strategy/condition-draft.test.ts` — "the probed record still cannot
  express the union this file walks", which fails if a re-probe fixes this
- `src/infrastructure/battlegrid/strategy-adapter.ts` — the comment recording
  why the preview's `conditions` argument has no conformance case

## Notes

The test named above is deliberately written to fail when this is fixed, so the
conformance cases get added rather than the gap quietly closing unnoticed.
