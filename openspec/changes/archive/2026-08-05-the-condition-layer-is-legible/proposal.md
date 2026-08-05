# The condition layer is legible

## Why

`conditions` are a boolean layer that sits **above** signals and decides
direction. Grid-Commander passes them through and cannot see them.

**They are not new, and that is the uncomfortable part.** Checked against the
artifacts rather than assumed:

| date | server | strategy `conditions` |
|---|---|---|
| 2026-07-27 | v3.0.0 | **absent** — the only `conditions` in that reference are deployment-slot time windows, a different feature |
| 2026-07-31 | (unrecorded) | **present**, with `conditionVerdicts` alongside |
| 2026-08-04 | v5.0.0 | present; `conditionVerdicts` **removed** |

The layer arrived between 2026-07-27 and 2026-07-31. What v5 removed was
`conditionVerdicts`, and that removal is what broke `apply_strategy_plan` and
pulled the whole area into view.

So `docs/battlegrid-mcp-surface.json` has recorded this layer for five days,
and `src/domain/strategy/compiled-plan.ts` already names `conditions` in the
projection list — a previous session added it to fix the sixth dead write path
and never asked what it was. It has been carried, correctly, by a product that
has never once looked inside it.

**This is not hypothetical, and it is spreading.** When this change was first
written, three of the 37 strategies on the account carried conditions — Dunkirk
(2), El Alamein (2), Berlin (6). Re-read hours later, across two accounts:

| account | strategies | carrying conditions |
|---|---|---|
| primary | 37 | **12** |
| second | 15 | **11** |

The eight that changed are platform strategies — Leningrad, London, Tobruk,
Midway, Bastogne, Kursk, Normandy, Iwo Jima — and they went from zero
conditions to between two and nine each across the **v5.0.0 → v5.1.0**
deployment the freshness gate caught. This is not a feature sitting unused in a
corner. The platform is rolling it out under us while the product cannot see it.

Berlin uses the whole grammar:

```
REGIME_DOWN     regTrend_now  is "trending down"     verdict: null
WINDOW_OPEN     ATR_trend     is "rising"            verdict: null
FLOW_UP         CVD_trend     is "rising"            verdict: null

FULL_SEND_DOWN  →  N_OF 3 of:
    ref REGIME_DOWN
    ref WINDOW_OPEN
    NOT( ref FLOW_UP )
    MAalign_htf  is "bearish"
    oiRegime     is "new shorts"
    CVD_trend    is "falling"
  verdict: DOWN
```

`/strategies/[id]` renders that strategy's sections and its 82 signal rules and
**none of its six conditions**. An operator can retune Berlin from that page
while blind to the negated flow filter deciding when it goes short.

`A Strategy Can Be Read In Full` already forbids exactly this: presenting a
summary as though it were the whole. The requirement is currently satisfied only
because its scenario enumerates a list that does not mention them.

Today the word `conditions` appears in **one place** in the entire product —
the pass-through projection list in `src/domain/strategy/compiled-plan.ts`. We
just paid for that blindness: `conditionVerdicts` rode the same projection until
v5 rejected it, and every apply this product composed was refused.

## The distinction that decides whether this is honest

**`verdict: null` means "named building block", not "no opinion".**

Four of Berlin's six conditions exist only to be referenced by the two that
carry verdicts. A page listing all six as equals would tell an operator Berlin
has six ways to decide direction. It has **two**, assembled from four parts.

That is the same class of distinction as `unreadable` versus `empty`, or the two
skip counters that must not be summed — and getting it wrong misrepresents the
strategy rather than merely under-describing it.

## What changes

1. **Conditions are read and rendered on `/strategies/[id]`**, with the grammar
   shown as structure rather than as JSON: clause operators in words, `N_OF`
   stating its threshold, `NOT` visibly negating, and `conditionRef` resolvable
   to the condition it names.
2. **Building blocks are distinguished from verdicts** wherever conditions are
   listed.
3. **The resolved outcome is shown where the platform resolves it.**
   `preview_strategy_report` now returns `conditionOutcomes`; nothing reads it.
4. **The condition layer crosses the MCP boundary for free** — `read_strategy`
   calls the same use-case the page calls, so a model asking *why did Berlin
   call this one down* gets the layer that decided it.

## What is explicitly out of scope

- **Authoring.** No creating, editing or deleting a condition. Reading the layer
  correctly is the whole job; an editor for a recursive boolean grammar is a
  separate change with its own confirmation questions.
- **Evaluating conditions locally.** Where the platform resolves them, the
  platform's answer is shown. This product does not re-derive a verdict.
- **The pipeline page. Settled by reading, and now permanent.** Task 1 asked
  whether an evaluation carries condition outcomes. It does not — see below.

## What task 1 established (2026-08-04, live, both accounts)

**`list_strategies` does not carry conditions** (1.4). Seventeen roster keys,
none of them conditions. A count per row would cost a read per row, so the
roster keeps its summary and conditions are read per strategy.

**Every form in the declared grammar appears in real data** (1.1) — all four
clause operators (`lt/lte/gt/gte`, `between`, `is`, `in`), `conditionRef`, and
all four group operators (`ALL`, `ANY`, `NOT`, `N_OF`). Nothing here is
theoretical surface.

**Building blocks are roughly half of all conditions.** Across the second
account's 55: `null` 27, `UP` 12, `DOWN` 12, `NEITHER` 4. The distinction this
change turns on is not an edge case, and `NEITHER` occurs in real data rather
than merely being declared.

**`preview_strategy_report` does return `conditionOutcomes`** (1.2) — and
carries considerably more than the name suggests. Per **ticker**, per condition:

```json
{ "conditionKey": "ALL_AGREE_UP", "name": "Regime, HTF and ADX agree — up",
  "outcome": "FALSE", "provisional": true, "counts": null,
  "evidence": [
    { "kind": "clause", "sectionKey": "includeRegimeContext",
      "header": "regTrend_now", "op": "is",
      "operand": "ranging", "literal": "trending up", "outcome": "FALSE" } ] }
```

Three things nothing anticipated, each of which changes what an honest
rendering owes:

1. **`evidence` gives the clause-level reason** — the value actually observed
   (`operand`) against what was required (`literal`). This answers *why* a
   condition failed, not just that it did.
2. **`provisional: true`** — the bar is not closed, so the outcome can still
   change. A provisional `FALSE` is not a settled `FALSE`, and showing them
   identically would be this product's characteristic mistake.
3. **`counts` on a threshold group**: `{trueCount: 4, total: 4,
   unresolvedCount: 0}`. `unresolvedCount` is a **third state** — a member that
   is neither true nor false — which the declared schema does not hint at.

**An evaluation carries nothing about conditions** (1.3). A signal log has 31
keys; none names a condition, and `conditionKey` appears nowhere in the payload
even nested. Checked with the control that matters: an agent **bound to a
strategy that does define conditions**. So the pipeline-page exclusion above is
permanent, not provisional.

## Capabilities

- `strategy-authoring` — one MODIFIED (reading a strategy in full now includes
  its conditions) and two ADDED.

No `mcp-control` delta. `The Product Is Reachable As An MCP Server` already
requires each tool to call the same use-case the web surface calls, so a
use-case that returns conditions reaches a model without a new promise being
made. Adding one here would restate an existing requirement.

## Track

`standard`. Read-only throughout: no write reaches BattleGrid, no scope is
requested, no schema changes, nothing to migrate, and the whole change is
revertible by removing a render. It touches one capability and has one intent.

Not `full`: no contract, no money, no autonomous authority, nothing hard to
reverse.
