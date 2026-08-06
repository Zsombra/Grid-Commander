---
id: an-update-that-omits-conditions-is-unobserved
title: An UPDATE compile that omits conditions may be clearing them, and nothing here can say
type: question
status: done
priority: p2
created: 2026-08-06
updated: 2026-08-06
change: ""
capability: strategy-authoring
blocked_by: []
tags: [battlegrid, conditions, apply, observed-vs-declared]
---

# The field the edit page does not send

## Answered 2026-08-06, live: it is reading (1). Nothing is destroyed.

Settled with `compile_strategy_plan` alone — the tool states it performs no
write, and the strategy's revision was re-read afterwards to confirm it.

Subject: `Dunkirk (fork)`, user-owned (a SYSTEM strategy answers `FORBIDDEN`),
revision 4, two conditions. The request sent was byte-for-byte what
`compileUpdateIntent` composes, **with no `conditions` key**:

```
BEFORE  rev=4  conditions=2  [ALL_AGREE_UP, ALL_AGREE_DOWN]
postState.conditions: 2 entries [ALL_AGREE_UP, ALL_AGREE_DOWN]
AFTER   rev=4  conditions=2   (compile wrote nothing)
```

**The compiler fills `postState` from the stored strategy.** An UPDATE that
names no conditions gets the existing ones back, and `toApplyPlan` copying
`postState.conditions` therefore preserves them. The edit page is not clearing
the layer that decides direction.

Two things learned on the way, both worth keeping:

- **A no-op UPDATE is refused**, not compiled: `VALIDATION_ERROR — Strategy
  update contains no effective changes.` The first attempt resent the same
  tagline and got that back. So the compiler will not mint a plan for a request
  that changes nothing, which is a small guarantee in its own right.
- **`compile_strategy_plan` takes a `request` wrapper.** A flat payload is
  refused with `invalid_type … path: ["request"]`. The product composes it
  correctly; a hand-rolled probe does not, which is why this was worth checking
  against the adapter rather than the schema alone.

### What this does not settle

Why every fork on both accounts carries **zero** conditions while every SYSTEM
strategy carries two to ten — three forks on the second account and one of two
on the first. Whether forking drops them, or whether they were never there, is
unobserved. Filed as `a-fork-appears-to-arrive-without-conditions`.

The write path stays out of `a-drafted-condition-can-be-tried` regardless: this
answers the first of the two facts that stopped it, and the second — the record
flattening the condition union — is untouched.


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
