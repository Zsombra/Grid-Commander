# Proposal: The Stop That Moved Is Shown As Moved

## Why

`what-it-holds-and-what-it-could-not-place` shipped both halves of the number
and not the sentence between them:

```
/agents/[id]   Stop now         55.954          ← the position's effectiveStopLoss
/pipeline      At the decision  55.67456526     ← the decision's stopLoss
```

Live on 2026-08-06, one HYPE LONG on a $56 instrument. `THE .0` runs
`positionManagement.enabled: true` with trailing on, so the stop has been
walked up 28 cents since the trade opened. Both values are already read and
both already render — **on two different pages, with nothing saying they are
the same stop.**

That is the whole of the gap. An operator can set `BERETTA`, pick a trailing
type, move a break-even trigger — `position-management-editing` shipped all of
it — and no surface in this product has ever shown those settings *act*. The
drift is the only evidence they do.

## What Changes

### The join

`OpenPosition` carries `decisionId`; `AgentsPort.readEntryDecisions` returns
rows carrying `id`, `stopLoss` and `takeProfit`. Matching one to the other is
the whole mechanism. **No new read tool and no new platform field.**

`ReadExposureQuery` gains a third read alongside the two it already makes, and
computes per position what the decision set against what is in force now —
including which way the stop travelled, which is a reading and therefore
belongs in the use case rather than in JSX.

### Which way it moved

A long is protected by a stop that rises and a short by one that falls, so the
same arithmetic means opposite things on the two sides. The product states
*moved to protect more* or *less* rather than showing two numbers and leaving
the operator to work out the sign — this is the surface where getting that
backwards means believing money is protected when it is exposed.

Where BattleGrid reports a side this product cannot read a direction from, both
numbers are shown and no direction is claimed.

### Where the decision could not be found

Stated as unknown. A position whose decision has aged out of the window read,
or whose decision list did not answer at all, is a position whose stop **may
well have moved** — and a silent line there reads as one that has not.

The three reads stay independent, which is this product's oldest rule: an
unreadable decision list costs every position its decided stop and costs none
of them anything else.

## What is deliberately not here

- **No `get_entry_decision` per position.** One list read serves every open
  position; N point reads would spend the operator's rate limit answering the
  same question. The list is asked for at the platform's own maximum of 50 rows
  (`limit` is 1–50, default 10), and where the decision is not in it the answer
  is *unknown*.
- **No direction claimed for a target.** A take-profit that moved is a
  different exit, not more or less protection, and naming it either would be
  this product's reading rather than the platform's.
- **No reconciliation of the two numbers into one.** Both are shown, each
  labelled with the moment it belongs to — the same rule that makes
  `/pipeline`'s "at the decision" load-bearing.

## Capabilities

**Modified**: `agent-understanding` — one MODIFIED requirement,
`What An Agent Is Holding Right Now Is Shown Where The Agent Is Read`.
