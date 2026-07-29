---
id: writes-unproven-against-live
title: No write has ever reached the real BattleGrid platform
type: risk
status: open
priority: p1
created: 2026-07-29
updated: 2026-07-29
change: ""
capability: battlegrid-connection
blocked_by: []
tags: [live-verification, writes]
---

# No write has ever reached the real BattleGrid platform

## What

`unwrap-what-battlegrid-answers` proved the read path against a live account:
three agents, seven strategies, real bindings, correct capacity. Every one of
those is a read.

No `create_intelligence_agent`, `update_intelligence_agent`,
`rebind_intelligence_agent`, `archive_intelligence_agent`,
`compile_strategy_plan`, `apply_strategy_plan` or `fork_strategy` call has ever
been made against the real platform, by anyone, at any point in this project.

## Why it matters

The envelope defect proves the point. Every read returned an empty object for
the entire life of the product, through four production gates and 561 tests,
and only a live key showed it. The write path shares that seam and is fixed by
the same change — but it has the same class of exposure the read path had, and
nothing has retired it:

- **Argument shape.** Four tools take `{ request: payload }` and the rest take
  the payload directly. `ENVELOPED` encodes which; it is unverified against the
  platform, and getting it wrong is a validation error, not a silent one — but
  it has never been observed either way.
- **Response shape.** `forkStrategy` reads `payload['strategy'] ?? payload`,
  `setActive` reads `payload['status'] ?? payload['result']`. Both are
  tolerant guesses about a shape nobody has seen.
- **`REPAIR_REQUIRED`** is a distinct lifecycle outcome the product renders
  specially, inferred from documentation alone.
- **Revision conflicts.** `CONFLICT_MARKERS` matches on message text —
  `expectedrevision`, `revision mismatch`, `revision drift`, `conflict`. No real
  conflict message has ever been seen.

## Why it was not done with the change that found it

Every write in this product reconfigures a real trading agent on the operator's
real account, and two of them are classified destructive. Performing one to
satisfy a verification step is not a decision to take on the operator's behalf,
and the change that surfaced this was explicitly scoped to reads.

## Fix

Needs the operator, not a code change. The cheapest safe probes, in order:

1. **`fork_strategy`** on a SYSTEM strategy — creates a new private copy,
   touches nothing existing, and exercises the enveloped-argument path plus the
   `payload['strategy'] ?? payload` read.
2. **`compile_strategy_plan`** against that fork — writes nothing, and is the
   one tool that returns `planToken` / `approvedPlan` / `reviewContext`.
3. **`archive_strategy`** on the fork — a destructive-classified call on
   something disposable, exercising the confirmation gate end to end.

That sequence proves the write path without touching an agent that trades.
