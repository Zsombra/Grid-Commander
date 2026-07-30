---
id: trading-config-read-shape-is-not-write-shape
title: Three tradingConfig fields come back on read and are rejected on write
type: question
status: done
priority: p2
created: 2026-07-28
updated: 2026-07-29
change: the-edit-path-cannot-succeed-either
capability: agent-authoring
blocked_by: []
tags: [battlegrid, mapper, agent-edit-form]
---

# Three tradingConfig fields come back on read and are rejected on write

## What

Established against the live server. `get_intelligence_agent` returns a
`tradingConfig` of 23 keys. `create_intelligence_agent` declares a
`tradingConfig` whose schema accepts 20 of them. The three it does not accept:

- `strategyTimeframe`
- `regimeAutoDerive`
- `regimeTimeframe`

No field required by create is missing from the read response, so the mismatch
runs in one direction only: reading gives you more than writing will take.

## Why it matters

**`agent-edit-form` is specified as a read-modify-write**, because BattleGrid's
`tradingConfig` is all-or-nothing — a partial send resets the fields it omits.
The obvious implementation reads the current config, merges the user's change,
and sends the result back. That implementation fails: it will carry three keys
the write schema rejects.

This is the same shape as `approvedPlan is not the plan` in the strategy
pipeline, where apply takes a projection of the compile result rather than the
result itself, and the obvious implementation fails every time. Two independent
BattleGrid surfaces now behave this way, which suggests it is a house style
rather than an accident — worth assuming for the next one rather than
rediscovering.

## Evidence

Computed by pruning a live agent's `tradingConfig` against the create tool's
declared schema:

```
keys in the GET response that create does NOT accept:
  ['strategyTimeframe', 'regimeAutoDerive', 'regimeTimeframe']
required-by-create keys the GET response does not supply:
  (none)
```

Note this was established from `create_intelligence_agent`. Whether
`update_intelligence_agent` accepts the same 20 keys, more, or fewer is **not**
established — its `tradingConfig` says "when provided, every nested field is
required", which is a different sentence from create's, and the difference may
or may not be meaningful.

## Fix

Before building `agent-edit-form`, prune the read result against the *update*
tool's schema rather than assuming it matches create's. Do it in the mapper, as
a named projection with the dropped keys listed and explained, not as an
incidental filter — the strategy pipeline's `toApplyPlan` is the precedent, and
it throws on anything unexpected rather than silently dropping.

Do not hardcode the three names. Derive the accepted set from the discovered
schema at runtime, for the same reason the tool list is never hardcoded: this is
exactly the kind of thing that changes under a deployment.

## Resolved — 2026-07-29

Closed by `the-edit-path-cannot-succeed-either`.

This item read as a warning about `agent-edit-form`, a surface nobody had built.
It was not. **The product already contained the implementation being warned
about**: `applyEdit` was `{ ...current.fields, ...changes }` and
`update-agent.command.ts` sent the result straight to
`update_intelligence_agent`. So every trading-config edit was rejected outright,
for the life of the product — not a future risk, a present defect.

Confirmed against the live schema: `update_intelligence_agent.tradingConfig`
declares `additionalProperties: false` and accepts none of the three.

`applyEdit` now projects onto `TRADING_CONFIG_FIELDS`, reports what it dropped,
and reports required fields missing after the merge. The fixture that hid it —
a four-field config the platform cannot produce — was replaced with
`liveTradingConfig()`, all 23 keys as the server actually returns them.

The general form of the check is `conformance-sweep-for-required-and-accepted-params`.
