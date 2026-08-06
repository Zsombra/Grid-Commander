# Proposal: The v9 Datasets Are Reconciled

## Why

BattleGrid v9.0.0 added several datasets. Reconciling them against what this
product already reads produced **three different answers**, and the middle one
is why this change exists rather than being a one-line addition.

### 1. Already flowing — no code

The perp/spot flow module needs nothing: `includePerpSpotFlow`, the two
`FLOW_DIVERGENCE` signals, and `PERP_SPOT_FLOW` / `PERP_SPOT_STRENGTH` /
`PERP_SPOT_CONFIRMS` / `SPOT_CVD` / `RVOL` / `BB_WIDTH_PCT`. Verified live:
the section editor lists `includePerpSpotFlow` among its templates, the signal
library returns both new signals, and every new metric is reachable under its
category. Vocabulary is read at runtime and `structure.test.ts` forbids writing
it into source, so additions appear and `VOLUME_RATIO` stopped appearing.

### 2. Must **not** be adopted — the trap

v9's bounds registry gained two entries that look exactly like ones this
product already maps:

```
agentMinConfidenceFloor          = 0.3    ← already mapped
agentMinConfidenceFloorPercent   = 30     ← new
agentMinTradeConvictionFloor     = 0.2    ← already mapped
agentMinTradeConvictionFloorPercent = 20  ← new
```

They are the **same limits in another unit**, and the fraction keys are still
published. `BOUND_KEYS` is a hand-maintained table of registry key → config
field, so "add the new dataset" reads as an invitation to append them.

Doing so compares `gridMinConfidence: 0.7` against a floor of `30` and
**refuses every valid configuration** — on the surface where an operator sets
how confident an agent must be before it trades. Demonstrated by injection:
mapping the percent key makes `checkBound(minTradeConviction, 0.35)` return
`ok: false`.

So this dataset is pinned rather than consumed.

### 3. Genuinely unread — added

`previewExecutionLimits` (`maxResultBytes`, `deadlineMs`). New on
`list_strategy_vocabulary`, because `preview_strategy_report` moved its limits
to discovery — its description now says they are "served by discovery, not by
this result".

## What Changes

- `VocabularyTemplatesResult` carries `limits`, mapped off the payload the
  section templates already arrive in. **No extra call**: that call *is*
  discovery.
- The section editor shows them — where a section is *added*, which is when the
  ceiling can change a decision. By the time a preview is refused for being too
  large, the refusal already says so in the platform's own words.
- `null` when the platform does not publish them, never defaulted. An invented
  ceiling would be read as the platform's and composed against.
- A test file recording all three answers, including the units trap, so the
  next person to read "two new bounds" does not add them.

## Capabilities

**Modified**: `strategy-authoring` — one MODIFIED requirement.
