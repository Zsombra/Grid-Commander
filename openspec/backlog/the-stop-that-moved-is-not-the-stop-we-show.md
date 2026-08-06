---
id: the-stop-that-moved-is-not-the-stop-we-show
title: Position management moves the stop and the product still shows the one the agent decided
type: feature
status: open
priority: p2
created: 2026-08-06
updated: 2026-08-06
change: ""
capability: agent-understanding
blocked_by: []
tags: [battlegrid, positions, position-management, money, live]
---

# The stop moved, and every surface shows the old one

Live on the second account, 2026-08-06, one open HYPE position:

| | |
|---|---|
| the decision's `stopLoss` | **55.67456526** |
| the position's `effectiveStopLoss` | **55.954** |

`THE .0` runs `positionManagement.enabled: true` with trailing on, so the stop
has been walked up 28 cents on a $56 instrument. That is the feature working.

**Every place this product renders a stop renders the decided one.**
`/agents/[id]/pipeline` shows `d.stopLoss` from the entry decision, which is
the value at the moment of deciding and has not been current since the trailing
logic first moved it.

## Why it matters more than 28 cents

`position-management-editing` shipped the *configuration* — an operator can set
`BERETTA`, trailing type, break-even trigger — and the product shows the drift
between the preset and the agent's own values. What it never shows is **the
effect**: whether any of that has actually moved a stop on a live position.

So an operator can tune trailing settings all day and has no way to see them
act. And the number they *can* see is the one that is wrong: understating how
much protection is in place, on the surface where they decide whether to
intervene.

## What the platform gives

`list_user_active_positions` carries both `effectiveStopLoss` and
`effectiveTakeProfit` per position, beside `markPrice`, `entryFillPrice` and
the `decisionId` that links to what was originally decided. So both halves are
in hand from one read — no derivation and no reconciliation needed.

## First step when taken

Part of `an-open-position-is-invisible` (p1), which models the position read.
When that lands, show the effective stop as the stop, and **where it differs
from the decision, show both and say which is which**. A single number labelled
"stop" that silently switched meaning between two surfaces would be worse than
the current gap.

On closed trades this does not arise — `list_trade_outcomes` reports fills, not
intentions — so this is strictly about open positions.
