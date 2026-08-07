---
id: the-prose-references-conditions-and-nothing-knows
title: A strategy's market-read prose can name a condition, so removing one is refused for a reason the describe does not mention
type: risk
status: open
priority: p3
created: 2026-08-06
updated: 2026-08-06
change: ""
capability: strategy-authoring
blocked_by: []
tags: [battlegrid, conditions, marketReadText, describe]
---

# The fourth place a condition is referenced from

`a-drafted-condition-can-be-saved` describes what removing a condition would
break, using `unresolvedReferences` — the conditions that reference the one
being dropped. That set is real and it is **not the whole set**.

A strategy's `marketReadText` — its prose — can reference a condition by
`{KEY}` marker. Removing the condition invalidates the prose, and BattleGrid
refuses the compile:

```
VALIDATION_ERROR
[market-read] strategy f34788df-…: marker '{ALL_AGREE_UP}' names neither a
column this strategy's report renders nor one of its conditions — markers may
only reference the strategy's own report headers and condition keys.
Nearest canonical key: 'ALL_AGREE_DOWN'.

details.authoringCode  MARKET_READ_MARKER_UNKNOWN
details.path           ["marketReadText", 184]
details.context        {token: "ALL_AGREE_UP", lookupKind: "reportHeader",
                        nearestKey: "ALL_AGREE_DOWN"}
```

Observed live 2026-08-06 against `Dunkirk (fork)` r4, by the read-only half of
that change's own probe, on the *first* removal it attempted.

## The refusal is dynamic, which is the useful part

`details.allowedDomain` is an enum of every legal marker, and it is **computed
from the conditions the request submitted**, not from what is stored. Removing
one condition:

```
[…, "ADX_trend", "ALL_AGREE_DOWN", "ATR_now", …]     ← the survivor is legal
```

Removing both:

```
[…, "ADX_trend", "ATR_now", …]                        ← neither is
```

So the platform will name, per compile, exactly which markers are still valid.
That is a better answer than anything this product could compute, and it means
the describe does not need to parse prose to be correct — it needs to **ask**.

## Why it is p2

Nothing breaks. The compile refuses, the refusal is carried to the operator as
the platform's own words, and the strategy is untouched — the change's refusal
handling is doing its job.

The cost is that the describe is **incomplete at the moment it matters**. An
operator is shown what conditions would dangle, agrees, and then discovers the
strategy's own prose named the condition too. The describe exists precisely so
that what is being agreed to is fully stated before the agreement, and here it
understates.

It is not p1 because the failure mode is a wasted round trip, not a bad write.

## What fixing it probably looks like

Two candidates, and the second is likely right:

- **Parse `marketReadText` for `{KEY}` markers** and fold the ones naming the
  condition under removal into the describe's dangling set. Cheap, offline, and
  it is this product guessing at a grammar the platform owns — the marker
  syntax is undocumented beyond this error message, and `lookupKind:
  "reportHeader"` hints markers also name report columns, which this product
  would then have to distinguish.
- **Compile before describing, and describe from the refusal.** The compile is
  read-only and already the pipeline's first step. A refusal carrying
  `MARKET_READ_MARKER_UNKNOWN` is a complete, authoritative answer including
  the nearest valid key. The describe would then say what the platform says,
  which is the rule this product follows everywhere else.

The second costs one extra round trip on the describe and asserts nothing this
product invented.

## A second question this leaves open

**`conditions: []` is still unobserved.** The probe's empty-list case was
refused for *this* reason — the prose still named `ALL_AGREE_UP` — not because
the platform rejected an empty list. So whether `[]` means "define none" or
"unspecified" remains unanswered, and removing the *last* condition is still
untested. Recorded on `a-drafted-condition-can-be-saved` as DL-8; settling it
needs a subject strategy whose prose names no condition.

## Evidence

- `tests/live/condition-write-probe.test.ts` — the read-only case that found
  it; run with a key, it prints both refusals in full
- `src/domain/strategy/condition.ts` — `unresolvedReferences`, the set that is
  correct and incomplete
- `openspec/changes/archive/…/a-drafted-condition-can-be-saved/plan/decision-log.md`

---

# Re-graded P3, 2026-08-06 — the describe already compiles first

Read the code before building the fix, and the second candidate — *compile
before describing, and describe from the refusal* — **is already the
architecture**. `DescribeConditionWriteQuery` compiles as its first act
(`describe-condition-write.query.ts:180`): a compile refusal returns
`{kind: 'refused', reason: <the platform's words>}` before any confirmation is
minted, and the save page renders it (`?problem=`, `role="alert"`), with the
operator's edit preserved.

So the failure mode this item graded P2 — *"an operator is shown what
conditions would dangle, agrees, and then discovers…"* — cannot happen. The
marker refusal lands on the **describe**, not after the agreement; there is no
window in which an incomplete dangling set is agreed to. The wasted round trip
is one describe answering with the platform's own explanation, which is this
product's normal behaviour for a refusal.

What remains, and why it stays open at P3: the describe *could* fold the
marker into its dangling list proactively — one sentence beside
`unresolvedReferences` — instead of the operator meeting it as a refusal. That
is a nicety, and both candidate implementations still have the costs the item
records (parsing a grammar the platform owns, or describing from a refusal the
product already renders). Take it only if the condition surface grows a reason
to.
