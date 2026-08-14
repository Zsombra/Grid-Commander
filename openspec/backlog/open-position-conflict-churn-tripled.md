---
id: open-position-conflict-churn-tripled
title: "Undertow's OPEN_POSITION_CONFLICT churn: 31/hr, then ~102/hr, then ~3.6/hr"
type: question
status: open
priority: p3
created: 2026-08-11
updated: 2026-08-15
change: ""
capability: agent-understanding
github: "146"
blocked_by: [battlegrid-is-returning-internal-errors]
tags: [battlegrid, gate-blocks, churn, live]
---

# The re-evaluates-what-it-holds churn rose, then fell

The id and the GitHub title still say "tripled". That was the 2026-08-11
reading and it no longer describes the item: the rate rose to about 100 an
hour and has since fallen by roughly 28x. The series is the finding, not any
single figure in it.

## The series

Two different things are dated below and they must not be collapsed: *when the
blocks happened* and *when somebody read them*. Most of what is known about
2026-08-12 was read on 2026-08-13.

| Window the blocks fall in | Rate | Basis | Read on |
|---|---|---|---|
| lifetime to 2026-08-09 | ~31/hr | 278 total | 2026-08-09 |
| lifetime to 2026-08-11 | ~90/hr | recent record, 3,809 total | 2026-08-11 |
| 2026-08-12 03:51-04:41 | ~120/hr | 100 rows in 50 min | 2026-08-12 |
| 2026-08-12 06:32-08:33 | ~50/hr | 100 rows in 2h01m | 2026-08-13, earlier read |
| 2026-08-12 00:36-09:11 | 102/hr | 874 rows in 8.58 h | 2026-08-13 20:30 |
| 2026-08-12 09:11 to 2026-08-13 20:30 | ~3.6/hr average | 125 rows in ~35 h | 2026-08-13 20:30 |

The three 2026-08-12 windows are not independent: the 50/hr and 120/hr windows
both sit inside the 00:36-09:11 span that averages 102/hr. So the within-day
swing is at least 2.4x around that average, and any single narrow window
overstates its own precision. 102/hr is the figure to quote for that day,
because it is the widest window measured.

`total` is a lifetime counter and never decreases. 5,496 is a record of what
has happened, not a statement about what is happening.

## What (2026-08-11, historical)

Measured 2026-08-11 while closing #98: Undertow carried **3,809 gate
blocks in three days of life**, the recent record running ~90/hour, all
`OPEN_POSITION_CONFLICT` at `gateStage: TOKEN`. Breakwater carried 346;
Vanguard 0. The same pattern was measured at ~31/hour on 2026-08-09
(then 278 total). That tripling was real on the day it was measured and has
since reversed -- see the re-check below.

## Why it matters (p3, a question not an alarm)

`gateStage: TOKEN` is before the model call, so this is **not a spend
line** -- the accept-as-tuition ruling's ~1:1 figure is unaffected. What
it is: the agent asking about coins it already holds, thousands of times,
which is noise in every gate-block surface and a standing question about
whether the evaluation cadence or coin selection is worth damping. It may
also be entirely fine -- a cheap no-op the platform performs by design.

## Re-measured 2026-08-12

*Superseded in part on 2026-08-13. The ~120/hour below is one 50-minute
window inside a day that averaged 102/hour; treat it as the within-day peak
that happened to be sampled, not as the day's rate.*

Still growing, still the same signature. Undertow's total is **5,014**
(from 3,809 a day earlier); the most recent 100 blocks span 03:51-04:41
UTC, i.e. **~120/hour**, all but one `OPEN_POSITION_CONFLICT` at
`gateStage: TOKEN`, cycling FARTCOIN and TRUMP -- exactly the coins it
holds positions on -- roughly once a minute each. The trajectory over four
days is ~31/h -> ~90/h -> ~120/h, scaling with open-position count, which
strengthens the cheap-no-op-by-design reading: the sweep re-asks every
deployed coin each minute and the ones it holds answer "conflict".

One block in the sample was **not** the pattern and is worth its own
sentence: `EXCHANGE_MIN_NOTIONAL_UNREACHABLE` on AIXBT with quantified
`reasonDetail` -- `equityUsd: 30.14` below `minEquityUsd: 33.33` (the
floor implied by `smallPct: 10` at `maxLeverage: 3`). The account's
equity has drifted under what the smallest position size needs, so
entries on new coins are now silently impossible for Undertow until
equity recovers or sizing changes. That is not churn; that is the agent
being benched by arithmetic. **That sentence became load-bearing on
2026-08-13** -- it is one of the three causes below.

## First step (2026-08-11, overtaken)

The operator's read, not a build: does the churn bother anything? If the
gate-block surfaces feel drowned by it, the product-side option is a
fold-or-collapse of repeated same-reason blocks on the stoppages surface;
the account-side options are the agent's coin selection or cadence. If
nothing is bothered, close this as accepted-noise with that said.

Overtaken by the re-check. The churn has fallen ~28x, so "does it bother
anything" no longer decides this item. The product-side option survives on its
own footing -- the 5,496 accumulated rows do not decay now that the rate has
fallen -- and the account-side options have nothing left to damp.

## 2026-08-13 -- deferred by the operator until #100 clears

Put to the operator as a close-or-act decision. **Answer: defer.** Neither
accepted-as-noise nor damped -- the figures are three days old and the tool that
produced them has not answered since.

`list_gate_blocks` returns `INTERNAL_ERROR` for every agent
([[battlegrid-is-returning-internal-errors]], #100), and it is the only read
that counts gate blocks. So the churn cannot be re-measured, and closing on the
2026-08-11 figures would be recording a judgement about a number nobody can
check.

*Lifted the same day.* The read-around found in #100 serves rows below the
failing head, so the churn was re-measured after all. #100 still gates one
specific thing -- the newest 125 rows -- and that limit is now this item's
sharpest open fact rather than a blanket block. `blocked_by` stays set for that
reason.

Recorded rather than left implicit because a deferral that is not written down
reads, on the next pass, exactly like an item nobody got to.

---

# Observed 2026-08-13 (evening) -- the churn is measurable, and it is one coin

This item says *observe before modelling*. The observation is now available: the
`list_gate_blocks` read-around (#100) serves rows below its failing head, and the
churn sits squarely in the readable range.

**Rows 151-250 on Undertow -- a 2h01m window, `06:32:05 -> 08:33:05`:**

    100 blocks
    reasonCode   OPEN_POSITION_CONFLICT x100   (nothing else)
    gateStage    TOKEN x100
    coins        HYPE 86 / TRUMP 10 / MELANIA 4

**~50 blocks an hour in this window**, against the ~90/hr this item recorded --
and **86% of them on a single coin**. That the whole window is one reason code
and one gate stage is itself the finding: this is not mixed traffic with a
conflict problem in it, it is a single condition repeating.

What is still not established, and what modelling would need: whether HYPE's
share is a property of the coin, of the position that was open at the time, or of
the deployment. One window on one agent does not separate those.

The tooling exists now -- sampling is `list_gate_blocks` at `page: N, limit: 50`
below the failing head, which #100 documents.

*This window carried no date in the original entry. The 20:30 read places it in
2026-08-12 traffic, not 2026-08-13.*

---

# Re-checked 2026-08-13, ~20:00-20:30 UTC (v18.2.0, account `Fibonacci`, read-only)

## Measured

- `list_gate_blocks(Undertow)` reports `total: 5496`, against 3,809 on
  2026-08-11 and 278 on 2026-08-09.
- Rows are newest-first. At `limit: 25`, page 6 (rows 126-150) spans
  `2026-08-12T08:46:04 -> 09:11:05`; page 7 (rows 151-175) spans
  `08:25:04 -> 08:45:04`; page 40 (rows 976-1000) spans
  `2026-08-12T00:36:25 -> 00:48:24`.
- 874 rows lie between `2026-08-12T00:36:25` and `09:11:05`, a span of 8.58
  hours: **102 blocks/hour**. That corroborates the ~90/hr recorded on
  2026-08-11, over a wider window.
- `total` is 5,496 and row 126 is timestamped `2026-08-12T09:11:05`, so
  **exactly 125 blocks are newer than 2026-08-12T09:11:05**. This is arithmetic
  on the total and a row position, not a rate extrapolated forward. The read was
  taken 2026-08-13T20:30, about 35 hours after that timestamp. 125 blocks in
  ~35 hours is **~3.6/hour on average**, a fall of roughly **28x** from
  102/hour.
- `list_user_active_positions` reports `openPositionCount: 0`,
  `activeAgentCount: 0`, `marginedUsd: 0`.

## The current rate, measured directly

Two reads of `total` sixteen minutes apart settle what the average could not:

    13:30 UTC   total 5496
    13:46 UTC   total 5497

**One block in sixteen minutes is 3.75/hour.** That is the rate *now*, not an
average over an unobserved interval -- and it lands within 4% of the ~3.6/hour
the 125-rows-in-35-hours arithmetic gives. Two independent methods, one from
`total` against row position and one from `total` against the clock, agree.

So the churn did **not** stop. It fell from 102/hour to about 3.7/hour, a
factor of roughly 27, and it is still running at that rate.

The series today also shows accrual across the session: `total` read 5437, then
5483 at the #100 re-bisection, then 5496, then 5497. An agent that had stopped
would have held flat across all four.

## Not measured, and unknown

Those 125 rows sit on pages 1-5, which all refuse (#100). They cannot be read
or timestamped, so **when** the fall happened is not known -- only that it had
happened by the time the readable history ends at 2026-08-12T09:11:05. A step
change and a slow decay are equally consistent with the count.

One weak cross-check exists and is worth exactly what it says. The earlier read
this evening put row 151 at `2026-08-12T08:33:05`; the 20:30 read puts row 151
at `08:45:04`. Newest-first, so a fixed index holding a newer row means the head
grew between the two reads -- by however many rows fill that 11m59s of 08-12
traffic, about 15 at the ~75/hr the 20:30 page 7 shows locally. The earlier read
did not record its clock time, so that is a count of head growth with no
interval to divide it by. It is not a rate, and it does not date the 125.

## What follows -- and this is inference, not observation

The reason code is `OPEN_POSITION_CONFLICT`. The account currently holds no
open position, so there is nothing left for an entry to conflict with. That is
a coherent cause for the fall, and it points the same way as the 2026-08-12
reading that the churn scales with open-position count -- this is the
opposite-direction data point that reading never had.

It remains an inference. Nobody watched the churn stop. And at least two other
causes are equally consistent with the same three zeros:

1. **The positions closed.** The sweep still runs, still re-asks every deployed
   coin, and nothing answers "conflict" any more.
2. **The agent stopped evaluating.** A halted, archived, or undeployed agent
   produces zero conflicts for a reason that has nothing to do with positions.
   `list_user_active_positions` counts positions; a zero there does not
   distinguish "holding nothing" from "doing nothing".
3. **The agent cannot enter.** The 2026-08-12 sample already caught
   `EXCHANGE_MIN_NOTIONAL_UNREACHABLE` with `equityUsd: 30.14` under
   `minEquityUsd: 33.33`. An agent benched by arithmetic opens no positions, so
   it accrues no conflicts either.

A positionless agent, a stopped agent, and a benched agent all read as zero on
the tools used here. Nothing in the 20:30 read separates them.

**The 13:46 read separates one of them.** `total` moved 5496 -> 5497 in sixteen
minutes, so blocks are still being written. Cause 2 is out: a halted, archived
or undeployed agent produces no blocks at all, not 3.75 an hour. The agent is
still evaluating and still being stopped.

What it does not settle is **which** reason is stopping it now. Those new rows
land at the head, and the head is exactly what `list_gate_blocks` refuses
(#100), so their `reasonCode` cannot be read. `OPEN_POSITION_CONFLICT` at
3.7/hour against zero open positions and
`EXCHANGE_MIN_NOTIONAL_UNREACHABLE` on a benched agent are both consistent with
what is readable, and the rows that would tell them apart are the unreadable
ones. That is the second time on this item that the answer sits behind #100.

## Judgement: the question is replaced, not answered -- the item stays open

The original question was *why did the churn triple*. Today's figures do not
answer it. They corroborate its leading hypothesis without confirming it, and
they add a confound that hypothesis did not have. The number going down is not
an answer, and closing on it would record a judgement about a mechanism nobody
observed.

**The question this item now carries:**

> Did the `OPEN_POSITION_CONFLICT` count track Undertow's open positions, or did
> Undertow stop evaluating? Those have the same footprint on every read taken so
> far, and only the first makes this a churn question at all.

If it is the first, the item's original subject is real, dormant, and returns
with the next position -- and the fold-or-collapse of repeated same-reason
blocks is worth doing, because a lifetime counter sitting at 5,496 does not
decay when the condition clears. If it is the second, this was never a churn
finding; it was a symptom of an agent going quiet, and it belongs with the
min-notional observation above.

## Next read

Not `list_gate_blocks` -- it has said what it can. The separating read is one
that reports evaluation activity independently of position state. Candidates, in
the order they should be tried: `get_agent_automation_status(Undertow)`, then
`get_agent_activity_feed` or `list_entry_decisions` over the window from
2026-08-12 09:11 onward. If Undertow is running and has simply been flat since
09:11, cause 1 stands. If it is halted or benched, the item is retyped.

Record the wall-clock time of every read filed against this item. The 20:30
figures are usable only because the read time was written down; the earlier read
the same evening is worth less for the want of that one line.

## 2026-08-15 (read ~2026-08-14T22:00Z) — the first candidate read is the wrong tool, and cause 2 weakens

Two facts from this session's reads:

1. **`get_agent_automation_status` does not report evaluation activity.** It
   answers game-preset assignments — for Undertow: `assignments: []` plus the
   two assignable Market Grid presets. The "next read" list above inferred its
   purpose from its name; strike it. The separating read is
   `get_agent_activity_feed` / `list_entry_decisions` over the window from
   2026-08-12T09:11Z onward, still untaken.
2. **Undertow was still being evaluated well after the fall.** The same
   session's `list_radar_deployments` read (taken for #101) shows Undertow's
   coins with `lastFireAt` / `lastFlipAt` values through **2026-08-13T18:01Z**
   (WIF 16:00, FARTCOIN 16:46, MOODENG 18:01). A radar that flips and fires
   for an agent's coins on 08-13 is dispatching candidates to it — so cause 2
   ("the agent stopped evaluating") is weakened for the 08-12→08-13 window,
   though it is radar-side evidence, not a gate-block read. Since
   2026-08-13T18:01Z the whole fleet is `PLATFORM_PAUSED`, which confounds
   any current-rate measurement — zero blocks while paused separates nothing.
