# The condition layer is legible

## Why

BattleGrid v5 added `conditions` — a boolean layer that sits **above** signals
and decides direction. Grid-Commander passes them through and cannot see them.

**This is not hypothetical.** Of the 37 strategies on the account, three carry
conditions today: Dunkirk (2), El Alamein (2), and Berlin (6).

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
because its scenario enumerates a list that predates conditions existing.

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
- **The pipeline page, until it is established that an evaluation carries
  condition outcomes at all.** `get_strategy` returning `conditions` is
  observed. `preview_strategy_report` declaring `conditionOutcomes` is declared
  but not yet observed, and whether a signal log or entry decision carries a
  condition outcome is **unknown**. Task 1 settles it by reading, and the
  requirements below are written so that "the platform does not say" is a
  reportable state rather than a gap.

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
