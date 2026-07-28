---
id: extend-coercion-guard-to-mappers
title: The coercion guard misses identifiers defaulted inside mappers
type: debt
status: open
priority: p2
created: 2026-07-27
updated: 2026-07-27
change: ""
capability: strategy-authoring
blocked_by: []
tags: [testing, guard]
---

# The coercion guard misses identifiers defaulted inside mappers

## What

`tests/agent/concurrency.test.ts::no identifier is coerced into existence` scans
for two patterns: `Number(form.get(…))` and `<identifier> ?? <value>`. It was
added in `wire-the-app` after the same defect appeared three times, precisely so
a fourth would fail the build.

A fourth appeared — `String(s['id'] ?? '')` and `revision : 0` in the strategy
mapper (PG-301) — and the build stayed green. It matches neither pattern.

## Why it matters

The guard exists to stop this class of defect from needing a human scan, and it
did not. PG-301 was caught by reading, which is what the guard was supposed to
replace. A guard that misses the next instance is worse than none, because it
creates a belief that the class is covered.

Worth noting what the defect would have done: the strategy id becomes
`strategyId` on a destructive apply and the revision becomes `expectedRevision`
on a compile — an operation that reconfigures every bound agent.

## Fix

Extend the scan to cover:

- `String(x['<identifier>'] ?? …)` where the key is `id`, `strategyId`,
  `agentId`, `revision`, `expectedRevision`
- ternaries defaulting a numeric identifier: `typeof x === 'number' ? x : <n>`
  for the same key set
- any mapper file assigning `id:` or `revision:` from an expression containing a
  literal fallback

The cleanest version is probably an allowlist: within `**/\*-mapper.ts` and
`**/\*-adapter.ts`, an `id` or `revision` assignment must be preceded by a
`throw` guard, as `mapAgent` and `mapStrategy` now both are.
