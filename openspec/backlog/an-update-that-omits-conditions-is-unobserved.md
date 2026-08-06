---
id: an-update-that-omits-conditions-is-unobserved
title: An UPDATE compile that omits conditions may be clearing them, and nothing here can say
type: risk
status: open
priority: p2
created: 2026-08-06
updated: 2026-08-06
change: ""
capability: strategy-authoring
blocked_by: []
tags: [battlegrid, conditions, apply, observed-vs-declared]
---

# The field the edit page does not send

`a-drafted-condition-can-be-tried` stopped short of a write, and this is the
first of the two facts that stopped it.

## What

`compileUpdateIntent` (`src/domain/strategy/compiled-plan.ts`) composes the
UPDATE request the edit page sends. It carries `operation`, `strategyId`,
`expectedRevision`, `intentSummary`, `assumptions`, `coinSelection`, `tagline`
and `sections`. **It does not carry `conditions`.**

`conditions` is *optional* on the compile request and **required** on the apply
plan, and `toApplyPlan` copies it out of `approvedPlan.postState`:

```ts
const PLAN_FIELDS_FROM_POST_STATE = [ …, 'conditions' ];
…
for (const field of PLAN_FIELDS_FROM_POST_STATE) plan[field] = post[field] ?? null;
```

So what the apply sends is whatever the *compiler* put in `postState.conditions`
for a request that named no conditions. Two possibilities, and nothing in this
repo distinguishes them:

1. The compiler fills `postState` from the stored strategy, the existing
   conditions come back, and the apply preserves them. Everything is fine.
2. The compiler treats an omitted `conditions` as an empty list, `postState`
   comes back with `[]`, and **every apply from the edit page clears every
   condition on the strategy** — silently, on a change to a tagline.

## Why it matters

If it is (2), this is live today and destructive: applying propagates to every
bound agent immediately, and conditions are the layer that decides *direction*.
An operator editing a tagline would lose the rules that decide whether the
strategy goes long or short, with no message saying so.

It is p2 rather than p1 only because it is unknown rather than known-bad, and
because the only capture this repo holds
(`tests/support/strategy-fakes.ts::anApprovedPlan`, shaped from a real compile
response of 2026-07-31) carries `conditions: []` on a strategy that **had no
conditions authored** — which is consistent with both possibilities and
therefore evidence for neither.

## The call that settles it

Read-only. Compiling writes nothing — `compile_strategy_plan` is annotated
`readOnlyHint: true` and its own description says "This performs no write" — so
this can be answered without risking anything.

1. Pick a strategy that **defines conditions** (twelve of thirty-seven on the
   primary account as of 2026-08-04; Berlin has six).
2. `compile_strategy_plan` with an UPDATE request that changes only the tagline
   and omits `conditions` entirely — exactly what `compileUpdateIntent` builds.
3. Read `approvedPlan.postState.conditions` in the response.

Non-empty and matching the strategy's own: possibility (1), and this item closes
as a non-issue with the observation recorded. Empty: possibility (2), and it
becomes a p0 bug — `compileUpdateIntent` must send the strategy's conditions on
every UPDATE, and `payload-conformance.test.ts` must hold it there.

## Evidence

- `src/domain/strategy/compiled-plan.ts` — `compileUpdateIntent`, and
  `PLAN_FIELDS_FROM_POST_STATE` carrying `conditions`
- `docs/battlegrid-mcp-surface.json` — `compile_strategy_plan`, `conditions`
  optional on all three request variants; `apply_strategy_plan`,
  `request.plan<n>.conditions` required on all three
- `openspec/changes/archive/2026-08-01-apply-sends-the-plan-the-platform-requires`
  — the change that added `conditions` to the projection, to fix the sixth dead
  write path. It fixed the projection without asking what the field meant

## Notes

The same question one level up settles a second one: whether sending
`conditions` on an UPDATE **replaces** the list wholesale or merges it. The
answer is visible in the same `postState` on a compile that *does* send them.
Both are needed before any condition write is built.
