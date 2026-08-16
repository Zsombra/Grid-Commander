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

## Answered 2026-08-16 — yes it can, and the legal set is already in hand

Both halves of "what would settle it" are settled, from a live read and a grep.

### 1. The legal operator set **is** published — and closer than expected

Not (only) in `list_strategy_vocabulary`. It is on **`preview_strategy_report`**,
per column, in a response the product already calls. Observed live at v19.2.0:

```json
{"header":"last",           "conditionOperators":["lt","lte","gte","gt","between"],
                            "conditionVocabulary":[]}
{"header":"closeChg_trend", "conditionOperators":["is","in"],
                            "conditionVocabulary":["rising","falling","flat"],
                            "meaning":"Trajectory direction: rising | falling | flat."}
```

`conditionOperators` is the legal set the refusal message names, per column, and
`conditionVocabulary` is the legal *labels* for the `is`/`in` case. The server
does not merely know both — it publishes both, unprompted, on every preview.

**Nothing in the product reads either.** `grep -rn "conditionOperators\|
conditionVocabulary" src tests` is empty.

There is a second, likelier home too: `get_strategy_column_contract`, which this
product **does** call (`compose-column.query.ts:181`, `check-column.query.ts:32`).
Its mapper keeps four fields per output — `header`, `meaning`, `unit`,
`nullable` — and discards the rest of `outputType`
(`strategy-adapter.ts:1073-1086`). Whether the kind and operator set are in what
it discards is one read away and was not taken.

### 2. **Yes — the product's own surface composes the illegal pairing**

`src/presentation/components/condition-composer.tsx:100` renders the operator
picker from a module constant, for every column, unfiltered:

```ts
export const CLAUSE_OPS = [...COMPARE_OPS, 'between', 'is', 'in'] as const;
//                         lt, lte, gte, gt
```

So an operator picking `regTrend_now` is offered `gt` exactly as the probe
composed it. The refusal arrives at describe time — after the condition has been
named, built, and submitted.

**That confirms the worry in Why it matters.** It is not merely that composing
the pairing is easy; the product offers it.

### 3. So this is step 2, and it is a small fix

Per "what would settle it": *"If it does, the authoring surface should filter the
operator picker by kind and this becomes a small UI fix."* It does. **No new
platform read is needed** — the preview the composer already drives carries the
per-column operator set.

Two notes for whoever builds it:

- **Filter, do not validate.** Offering only the legal operators is better than
  accepting a choice and rejecting it later, and it keeps the product from
  restating a rule the platform owns — the same discipline `stoppages.tsx`
  applies to reason codes.
- **It still needs a delta spec.** The composer's behaviour changes, and a
  picker that offers fewer options than before is a behaviour change even when
  every removed option was refused downstream.

### 4. The probe should assert the refusal

Point 4 of "what would settle it" stands and is now clearly the right call: the
pairing is a **contract**, not a mistake, so `condition-write-probe` should
assert the refusal deliberately rather than compose an illegal pairing and fail.
That turns a red probe into a live check that the platform still enforces what
the product will start filtering on.
