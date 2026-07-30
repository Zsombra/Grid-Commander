---
id: writes-unproven-against-live
title: No write has ever reached the real BattleGrid platform
type: risk
status: done
priority: p1
created: 2026-07-29
updated: 2026-07-29
change: "map-the-mcp-surface"
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

## Resolution

Closed 2026-07-29 by running it.

`tests/live/write-probe.test.ts` forks a SYSTEM strategy with nothing bound to
it, compiles a plan against the fork, and archives the fork — through the
product's own adapters, not raw HTTP, so what it proves is Grid-Commander's
write path rather than BattleGrid's.

Result against the live account:

```
source:  London (SYSTEM, r2, 0 bound)
forked:  London (fork) 8ecb1363… r1 scope=PRIVATE
compile: compiled
archive: changed
audit:   fork_strategy=succeeded compile_strategy_plan=succeeded archive_strategy=succeeded
```

**`archive_strategy` is the one that matters.** It could not have succeeded
before the `expectedRevision` fix earlier the same day — it was sending
`{ strategyId }` alone and would have been refused. It is now proven live.

What this retires from the list above:

- **Argument shape** — the `ENVELOPED` split is right: `compile_strategy_plan`
  was accepted wrapped as `{ request }`, and `fork_strategy` / `archive_strategy`
  were accepted flat.
- **Response shape** — `forkStrategy`'s `payload['strategy'] ?? payload` read a
  real fork correctly; `compilePlan` got a real `planToken` and `approvedPlan`.
- **The confirmation gate** — `archive_strategy` is destructive, and the call
  went through `beginGuardedCall` with a real confirmation token.
- **The audit path** — three mutating calls, three records, all `succeeded`.

What it does **not** retire:

- **`apply_strategy_plan`** was not called. Compiling is effect-free by design;
  applying reconfigures every agent bound to the strategy, and there was nothing
  disposable to apply to.
- **Every agent mutation** — create, update, rebind, archive, activate. Their
  shapes are verified against declared schemas and the schema has now earned
  trust on 21/21 reads plus 3/3 writes, but none has executed.
- **Revision conflicts.** `CONFLICT_MARKERS` still matches on message text and
  no real conflict message has been seen.
- **`REPAIR_REQUIRED`** — see `repair-required-cannot-be-detected`.

The probe is committed and guarded on `BATTLEGRID_API_KEY`, so `npm test` skips
it and CI can never reach it. Re-run it whenever the write path changes.
