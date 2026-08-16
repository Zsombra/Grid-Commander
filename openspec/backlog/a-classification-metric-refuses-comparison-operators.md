---
id: a-classification-metric-refuses-comparison-operators
title: A classification-kind metric refuses comparison operators, and nothing checks the pairing before the write
type: bug
status: open
priority: p3
created: 2026-08-16
updated: 2026-08-16
change: ""
capability: strategy-authoring
github: "327"
blocked_by: []
tags: [battlegrid, v19, conditions, authoring, live-probe]
---

# A classification metric refuses comparison operators

## What

The first live write run against v19.2.0 (#306) refused one probe outright:

```
VALIDATION_ERROR  [condition] condition 'GC_PROBE_DRAFT':
  operator 'gt' is not legal for 'regTrend_now' (output kind 'classification')
  - legal operators are is, in
```

The platform classifies each metric by **output kind**, and a `classification`
kind admits only `is` and `in`. Comparison operators — `gt`, `lt`, `gte`, `lte`
— are legal for numeric kinds and refused here. The refusal arrives at
**describe** time, before any apply.

## Why it matters

The probe composed that pairing, which means composing it is easy. **The open
question is whether the product's own condition authoring surface can compose
it too.** If the operator picker offers `gt` for a classification-kind metric,
every such condition is authored, previewed, and only refused at the write —
after the operator has done the work.

This is p3 rather than p2 because nothing is silently wrong: the platform
refuses loudly and names both the offending operator and the legal set. The
cost is wasted authoring, not a bad condition that lands.

## Evidence

`tests/live/condition-write-probe.test.ts:423`, run 2026-08-16 against
v19.2.0 with `BATTLEGRID_LIVE_WRITES=1`. The fork it operated on
(`a0635d5b-ed67-42ad-9d79-eef2c5ca9ea7`, "Kursk (fork)") was archived by the
probe's own `finally` despite the failure, so no residue was left active.

## What would settle it

1. Read whether the vocabulary publishes the output kind and its legal operator
   set per metric — `list_strategy_vocabulary` is the likely home, and the
   refusal message proves the server knows both.
2. If it does, the authoring surface should filter the operator picker by kind
   and this becomes a small UI fix.
3. If it does not, the pairing cannot be validated client-side and the honest
   answer is to surface the platform's refusal well.
4. Either way the probe itself should stop composing an illegal pairing, or
   assert the refusal deliberately as the contract it now is.

Related: [[the-write-paths-are-unverified-at-v19]] (#306) — the run that found
it. [[two-read-tools-do-not-answer]] (#114) — the same shape of gap, where a
constraint the server enforces is not expressible in the schema it publishes.
