---
id: repair-required-cannot-be-detected
title: The REPAIR_REQUIRED branch reads keys neither tool returns
type: bug
status: open
priority: p2
created: 2026-07-29
updated: 2026-07-29
change: ""
capability: strategy-authoring
blocked_by: []
tags: [mcp-conformance, dead-branch]
---

# The REPAIR_REQUIRED branch reads keys neither tool returns

## What

`McpStrategyAdapter.setActive` detects a restore that needs repair with:

```ts
const status = payload['status'] ?? payload['result'];
if (status === 'REPAIR_REQUIRED') return { kind: 'repair-required', reason: 'REPAIR_REQUIRED' };
```

`restore_strategy` and `archive_strategy` both declare an `outputSchema` whose
only property is `strategy`. Neither `status` nor `result` exists on either.

The branch cannot fire.

## Why it matters

`repair-required` is a first-class lifecycle outcome: the product has a
`LifecycleResult` case for it, `REPAIR_REQUIRED_GUIDANCE` copy explaining that
the strategy stays inactive and the way forward is the RESTORE arm of the
compile pipeline, and a surface that renders it. All of it is unreachable.

A user whose restore needs repair currently gets whatever the *other* branch
does — `mapStrategy(payload['strategy'] ?? payload)` — which will either return
a strategy that was not actually restored, or throw a `StrategyPayloadError`.
Neither is the explanation that was written for them.

## Evidence

Found 2026-07-29 by `tools/probe_mcp_surface.py` against the live server, and
recorded in `tests/architecture/mcp-conformance.test.ts` — which asserts the
absence rather than silently correcting for it.

`docs/battlegrid-mcp-surface.json`: `restore_strategy.declared_output` and
`archive_strategy.declared_output` are both `["strategy"]`.

## Why it was not fixed with the change that found it

Where `REPAIR_REQUIRED` actually surfaces is unknown, and guessing would replace
one wrong branch with another. Two plausible routes:

1. **As a tool refusal.** The envelope carries `isError: true` with a message.
   Since `unwrap-what-battlegrid-answers`, that already throws
   `ToolRefusedError` rather than being silently swallowed — so the outcome
   would reach the user as a failure with BattleGrid's own text, which is
   honest but not the guidance that was written.
2. **Inside the returned `strategy`.** A field such as `isActive: false` plus
   something on the strategy object itself.

Both are testable, and neither is currently true or false on evidence.

## Fix

Needs one observation. `restore_strategy` on a strategy that genuinely needs
repair, with the raw envelope captured. That is a write, so it belongs with
`writes-unproven-against-live` — and the safe probe sequence filed there (fork,
compile, archive the fork) does not produce a repair-required state, so this one
may need a strategy deliberately left in that condition.

Until then the branch stays, documented, rather than being deleted: it is
unreachable, not wrong.
