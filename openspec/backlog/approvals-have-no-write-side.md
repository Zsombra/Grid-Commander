---
id: approvals-have-no-write-side
title: The human-in-the-loop can be read but not answered — accept/cancel are unbuilt
type: feature
status: open
priority: p3
created: 2026-08-03
updated: 2026-08-15
capability: agent-understanding
github: "101"
blocked_by: []
tags: [battlegrid, approvals, human-in-the-loop, wager]
---

# The human-in-the-loop can be read but not answered

## Update 2026-08-06: re-checked, and it is blocked twice over

Picked up as the next build and put back down, with the reasons recorded so
nobody spends the afternoon again:

- **Our own spec forbids the write.** `accept_entry_decision` and
  `cancel_entry_decision` both say *"Requires mcp:wager scope"*, and
  `Read Scope Is Requested And Wager Scope Is Not` says Grid-Commander MUST NOT
  request authority to commit funds. Building it is an operator's decision to
  relax a standing requirement, not a commit.
- **The read side still has no observed shape.** `list_pending_approvals`
  answers `{approvals: []}` — no agent on either account runs
  `APPROVAL_REQUIRED`, so the row has never been seen. Modelling it means
  inventing key names, which is what produced three of the dead paths in
  `HANDOFF.md`.

`why-it-would-not-take-this-coin` was built instead, for the opposite reason:
its rows are populated on this account today.

`why-it-did-not-trade` (archived 2026-08-03) built the read half:
`/agents/[id]/pipeline` shows the three stages a candidate can end at, and
an entry decision arrives with the agent's own reasoning. What an operator
cannot do is answer one.

Unbuilt: `accept_entry_decision`, `cancel_entry_decision`,
`list_pending_approvals`.

## Why it matters

The product's premise is "the human decides, informed". The pipeline surface
delivers *informed* and stops one click short of *decides*. An operator who
reads "ENTER BTC long, 0.78 conviction, entry 94,200 / stop 91,000" has
everything needed to judge it and no way to say yes.

## What discovery settled (2026-08-03)

- **The mode is settable over MCP.** `tradingConfig.tradingMode` accepts
  `OFF | APPROVAL_REQUIRED | FULL_EXECUTION` on both
  `create_intelligence_agent` and `update_intelligence_agent`. This is not
  a battlegrid.trade-only switch.
- **This product already offers it.** `MoneyLimits` renders *"Approval
  required — proposes trades, waits for you"* on the create and edit
  surfaces. An operator can select it today and then has nowhere to answer.
  `the-decision-shows-its-work` adds a line saying so at the point of
  choosing; it does not make the option answerable.
- **No agent on this account has ever used it.** All 15 agents, active and
  archived, are `OFF` (9) or `FULL_EXECUTION` (6). `list_pending_approvals`
  answers `{approvals: []}` and takes no arguments — it returns the whole
  queue, unpaginated.
- **`accept_entry_decision` and `cancel_entry_decision` take one argument**,
  `decisionId` (uuid). Ownership is enforced from the stored decision, so
  no agent id is passed. Accept is `destructiveHint: false`; cancel is
  `destructiveHint: true`.
- **`get_entry_decision` is redundant** — it returns the same 35 keys
  `list_entry_decisions` already sends per row. Do not add a detail fetch.

So the queue is empty because nothing on this account produces approvals,
not because the tool is broken.

## Why it is not built yet

Both writes are `mcp:wager` and one is destructive — this is the ceremony's
whole purpose, not a place to shortcut it. It is its own change, full track:

- The confirmation target must bind the **decision id, its revision, and the
  price levels** (entry, stop, target). Accepting a decision whose stop moved
  between read and click is a different act from the one agreed to — the same
  reasoning as `confirmation-is-not-bound-to-values`.
- Consequence wording names money: accepting opens a position at real size.

## The trap to avoid when taken

`list_pending_approvals` answers `{approvals: []}` on this account, so **its
row shape has never been observed**. Do not model it from the declaration.
Every one of the seven dead paths in HANDOFF.md came from trusting a schema
over a call — including two where the declared write shape and the accepted
write shape simply differed. Get a real pending approval on the account
first (an agent with equity above the $10 floor and an ENTER decision), read
it, then model it.

## First step when taken — and it needs the operator

Producing one pending approval means putting a real agent into
`APPROVAL_REQUIRED`. That changes how an account that trades real money
behaves, and it is the operator's call, not this client's:

1. Operator decides which agent goes to `APPROVAL_REQUIRED` (or funds a
   throwaway past the $10 equity floor — the account sat at $2.18 on
   2026-08-03, which is why candidates were gate-blocked).
2. Wait a cycle for an ENTER decision to reach the queue.
3. Read `list_pending_approvals` **with a row in it** and model from that.
4. `/propose` the full-track change, with `cancel` built and proven before
   `accept` — cancelling costs nothing, accepting opens a position.

## Step 1 taken, 2026-08-14 — Vanguard is in APPROVAL_REQUIRED

The operator named the agent ("the one with basically no traits" — Vanguard,
0 games, 0 trades, empty curve) and the write was made this session over MCP:

```
update_intelligence_agent(Vanguard c8f20b9e…, expectedRevision: 10)
  tradingConfig sent complete and verbatim except:
    tradingMode           FULL_EXECUTION → APPROVAL_REQUIRED
    signalTimeoutMinutes  5 → 15   (longest window the platform allows —
                                    a 5-minute window on an unwatched
                                    account expires before anyone reads it)
  read-back: revision 11, both values landed, every other field identical;
  strategyTimeframe / regime fields (not in the write schema) preserved.
```

Conditions at the time of the write, all read in the same minutes:

- Account balance **$38.63** — above Vanguard's own `balanceThresholdUsd: 35`
  (it was $2.18 when this item was first blocked).
- Vanguard is on duty on **five Radar coins** (BTC, ETH, SOL, XRP, AVAX),
  default slot on each, conviction bar 0.6.
- **The whole Radar fleet is `PLATFORM_PAUSED`** — all 20 policies,
  `summary.radarPaused: true`, nothing fired since 2026-08-13 evening. Until
  the platform unpauses, no candidate reaches any agent and no approval can
  arrive; this is the platform's pause, not a setting on this account that
  was found writable.
- `list_pending_approvals` → `{approvals: []}` — the baseline, taken after
  the flip.

**Checked 2026-08-15** (tripwire sweep): the whole fleet is still
`PLATFORM_PAUSED` — all 20 policies, `summary.radarPaused: true`, nothing
fired since 2026-08-13 evening. No candidate can reach Vanguard, so no
approval can exist and `list_pending_approvals` was deliberately not read.
A second sweep the same local day (2026-08-14T21:51Z / 04:51 local) read
identically: 20/20 `platformPaused`, `radarPaused: true`, latest
`lastFireAt` still 2026-08-13T18:01:18Z (MOODENG); approvals read again
deliberately untaken.

**What to watch**: when Radar shows fired rows again, read
`list_pending_approvals` within a candidate's 15-minute window. The first
Vanguard candidate that clears its gates lands in the queue instead of
auto-executing — that is the row this item needs observed before anything
is modelled. Steps 2–4 above unchanged.

## Step 2 in motion, 2026-08-15 — Radar unpaused; Undertow flipped too (TEMPORARY)

The platform unpaused (~10:52Z first fires; `radarPaused: false`, 0/20 paused).
A 5-minute `list_pending_approvals` watch is running. Vanguard read
`AGGREGATE_BELOW_MIN` on all five coins at the 11:00Z sweep and its historical
fire rate is ~4 fires/6 days, so the operator named a second row source:

```
update_intelligence_agent(Undertow d0f6829f…, expectedRevision: 7)
  tradingConfig sent complete and verbatim except:
    tradingMode           FULL_EXECUTION → APPROVAL_REQUIRED
    signalTimeoutMinutes  5 → 15
  read-back: revision 8, both values landed, every other field identical;
  strategyTimeframe / regimeTimeframe (not in the write schema) preserved.
```

**Standing obligation: this flip is temporary.** Undertow is the account's
active trader (fired at both 10:52Z and 11:00Z sweeps, 3 open positions —
their protections are platform-managed and unaffected). While flipped it does
not auto-trade; its fires become approvals that expire unanswered. **Flip it
back to `FULL_EXECUTION` (restoring `signalTimeoutMinutes: 5`) immediately
after the first row is captured** — or immediately, if the capture attempt is
abandoned. If you are reading this after a session died: check
`get_intelligence_agent(d0f6829f…)` and restore revision-8 values yourself.

## Why the queue stayed empty after the flip — measured, 2026-08-15 ~11:57Z

A seven-agent read-only sweep (4 angles → synthesis → 2 adversarial lenses)
answered a question that had been guessed at twice in this repo, both times
wrongly. **Nothing was written; every finding below is from a live read.**

**`maxConcurrentExposureUsd` is metered on MARGIN, not notional.** Both
adversarial lenses tried to refute this and both conceded. `get_agent_budget`
publishes it outright:

```
maxConcurrentExposureUsd: 45     capitalAtRiskUsd: 12.2   headroomUsd: 32.8
gauges.exposure: { fill: 12.2, remaining: 32.8, configured: true, breached: false }
```

against `list_user_active_positions` totals `marginedUsd: 12.176704` /
`currentNotionalUsd: 36.54` at the same moment. The gauge matches margin and
misses notional by 24.36. A third candidate reading — "capital at risk" as
stop-loss risk — computes to $0.27 across the three positions and is excluded.

**But exposure is not a gate that trips; it is the SIZING BASE.** This is why
zero of 5,521 lifetime gate blocks names exposure. It enforces itself by
starving order size geometrically. The platform's own formula, reconstructed
EXACTLY (three for three, to the cent, once integer quantity flooring is
applied):

```
size_notional = headroom x sizePct x effectiveLeverage
AIXBT  (1st): 45.000000 x 0.10 x 3 = 13.500 -> /0.017684 = 763.40 -> floor 763 -> 13.492892 ✓
MELANIA(2nd): 40.502369 x 0.30       = 12.151 -> /0.07057   = 172.18 -> floor 172 -> 12.138040 ✓
MOODENG(3rd): 36.456356 x 0.30       = 10.937 -> /0.03609   = 302.99 -> floor 302 -> 10.899180 ✓
```
A NOTIONAL basis predicts MELANIA at 9.386 (−29%); a wallet-balance basis
predicts AIXBT at 11.557. Both refuted on observed integers.

**Consequence — the row cannot arrive at current headroom.** A SMALL entry
now sizes to `32.823296 x 0.10 x 3 = $9.847`, under the **$10 exchange
minimum** that has already killed 77 of this agent's evaluations
(`EXCHANGE_MIN_NOTIONAL_UNREACHABLE`, TOKEN stage, pre-model). The headroom
floor is `10/(0.10x3) = $33.333`. **Undertow is $0.51 short.** The burst
stopped at exactly three positions because the third was the last that fit.
All 8 of 8 ENTER decisions in visible history are `positionSizePreset: SMALL`,
so the MEDIUM (11.82) and LARGE (14.77) escape hatches are empirically unlikely.

**It self-clears on the first close.** Any one position closing frees ≥3.633
margin → headroom ≥36.456 → next size ≥10.94, above the floor.

**CORRECTION, 12:19Z — `timeHorizon: "1h"` is NOT a time-based exit.** This was
assumed on first writing and is wrong. All three positions read `status: OPEN`
at `ageMs` 4,388,061–4,643,641 — **73 to 77 minutes**, well past their nominal
"1h" horizon. `timeHorizon` is a strategy label, not a clock. With
`timeDecayEnabled: false` on this agent there is no time-based tightening
either, so the only exits are stop-loss, take-profit, or the trailing stop.

And all three are close to flat — combined `unrealizedPnlUsd` +$0.055,
`roePct` 0.45%, each sitting mid-range between its stop and its target:

```
MOODENG SHORT  mark 0.03606  entry 0.03609  TP 0.035298 (-2.1%)  SL 0.03633528
MELANIA SHORT  mark 0.07056  entry 0.07057  TP 0.06872735 (-2.6%) SL 0.07103755
AIXBT   LONG   mark 0.017742 entry 0.017684 TP 0.01810948 (+2.1%) SL 0.01755
```
`breakEvenStatus: ACTIVE` but `armed: false` on all three (closest is AIXBT at
`distanceToArmPct` 0.559%). **So "wait for a close" is open-ended — hours or
days, not minutes.** Raising `maxConcurrentExposureUsd` is the only
deterministic unblock: the cap must reach ≥45.51 for a SMALL entry to clear the
$10 floor (headroom = cap − 12.176704, and headroom × 0.10 × 3 ≥ 10).

### The unblock write, 12:24Z — operator-authorized by name (TEMPORARY)

```
update_intelligence_agent(Undertow d0f6829f…, expectedRevision: 8)
  tradingConfig sent complete and verbatim except:
    maxConcurrentExposureUsd   45 → 50
  read-back: revision 9, value landed, every other field identical;
  strategyTimeframe / regimeTimeframe (not in the write schema) preserved.
```

**The starvation model was confirmed by this write.** `get_agent_budget`
immediately after: `maxConcurrentExposureUsd: 50`, `capitalAtRiskUsd: 12.2`,
`headroomUsd: 37.8`, `gauges.exposure {fill 12.2, remaining 37.8}`. Headroom
moved exactly +5.0 with the cap while capital-at-risk held at 12.2 — an
independent re-confirmation that the ledger is margin (under a notional reading
headroom would have gone 13.47, not 37.8). Next SMALL entry now sizes to
`37.8 × 0.10 × 3 = $11.34`, clearing the $10 exchange floor with $1.34 of slack.

**Second standing obligation: restore `maxConcurrentExposureUsd` to 45** at the
same time the `tradingMode` flip is reverted. Undertow's max capital at risk is
$5 higher than the operator set it until then.

### What the gate-block feed showed at 12:25Z — three corrections

`list_gate_blocks` is the sharpest detector on this surface and was underused.
Five fresh rows in five minutes corrected three separate beliefs:

1. **The pipeline sweeps roughly every 60 seconds, not hourly.** Rows at
   12:20:58, 12:21:57, 12:22:57, 12:23:57, 12:24:56. Every "wait for the hourly
   candle" statement earlier in this item's history was wrong; evaluations run
   continuously and the hourly candle only governs the *strategy* timeframe.
2. **`OPEN_POSITION_CONFLICT` is live, not stale.** The adversarial verifier
   read it as "three days stale, zero today" at ~11:57Z — true then, false
   twenty minutes later. Total moved 5,282 → 5,287, `latestAt` now
   2026-08-15T12:24:56Z. A staleness finding has a half-life; this one's was
   under half an hour.
3. **THE STARVATION PREDICTION WAS NEVER TESTED — and the cap raise may have
   been unnecessary.** `EXCHANGE_MIN_NOTIONAL_UNREACHABLE` still reads
   `latestAt: 2026-08-12T06:00:20Z`, count unchanged at 77. No row has carried
   `minEquityUsd: 33.333333`. Nothing reached the sizing stage, so the $10-floor
   theory is neither confirmed nor refuted by the pipeline itself. (It *is*
   independently corroborated by the cap write: headroom tracked the cap +5.0
   while `capitalAtRiskUsd` held at 12.2.)

**The actual live blocker is narrower than either theory.** Every one of the
five new rows is **AIXBT** — the one coin Undertow both holds and has a live
edge on, so it self-blocks at the TOKEN stage every minute. The four coins it
does *not* hold (WIF, TRUMP, FARTCOIN, HYPE) produce **no rows at all**, and a
gate block is only written when a candidate reaches a gate. So they are not
being blocked — they are not producing candidates. `qualified: true` on the
radar means the coin cleared its deployment gates, not that the agent reached a
directional verdict.

**So the pending condition is: an edge on a coin Undertow does not already
hold.** Watch `list_gate_blocks` alongside the approvals queue — at ~60s
granularity it will show the moment a free coin reaches a gate, and if the
starvation theory is right the row that appears will be
`EXCHANGE_MIN_NOTIONAL_UNREACHABLE` carrying the `minEquityUsd` figure that
settles it.

## THE ROW HAPPENED — 13:18:03Z on HYPE — and the watch missed it

**The precondition is met.** Undertow reached an ENTER verdict on HYPE, a coin
it does not hold, at **2026-08-15T13:18:03.199Z**. Because it is in
`APPROVAL_REQUIRED`, that decision went to the approval queue instead of
executing. It sat for its full 15-minute window and **expired unanswered** at
13:33:10.729Z. Recovered from `list_entry_decisions(status: EXPIRED)` — the
shape is observed, from a decision that actually travelled the approval path.

**Why it was missed, and the lesson.** The `/loop` cron (`ed90a0ff`, 5-minute)
was armed and correct — but cron jobs only fire **while the REPL is idle**, and
a 6-agent Workflow was occupying the session across exactly that window. The
watch prompts queued and all ~30 discharged in a burst *after* the workflow
returned, by which time the row had expired. **Never run a long Workflow while
a cron watch is the thing you are relying on.** The workflow also returned
nothing — all four agents died on a subagent session limit — so it cost the
observation and bought nothing.

**How the approval-expiry row is distinguished from an ordinary expiry.** Both
carry `status: EXPIRED`. The discriminator is `executedOrderId`:

```
HYPE 2026-08-15 (expired AWAITING APPROVAL)   executedOrderId: null
WIF  2026-08-12 (resting entry order unfilled) executedOrderId: "515054038166"
```
The HYPE decision never reached the exchange at all; the WIF one did and the
order simply did not fill. `llmDurationMs: 45972` on HYPE confirms the model ran.

### The observed row, verbatim (approval-path decision, HYPE)

```json
{"id":"c82fcde2-9b87-4e8f-8112-b2606c3c6869",
 "signalLogId":"fa3fd10f-2b7c-4ff5-bc44-7930a0a2a284",
 "agentId":"d0f6829f-96f8-468d-8797-4a04e8dc8e37",
 "userId":"0eccbf37-d90b-4933-88f2-d120627b23f7",
 "coinTicker":"HYPE","decision":"ENTER","direction":"SHORT",
 "conviction":0.55,"convictionPercent":55,
 "entryPrice":56.377,"stopLoss":56.72250463,"takeProfit":55.302,
 "positionSizePct":10,"positionSizePreset":"SMALL",
 "reasoning":"Dominant bearish bias at 79% with no conflicting signals. …",
 "signalChecklist":[{"signalId":"cvd_bearish","label":"CVD Bearish",
    "verdict":"CONFIRM","interpretation":"…"}, … 4 entries …],
 "signalModulesUsed":["CVD","SUPPORT_RESISTANCE","BOLLINGER",
    "FLOW_DIVERGENCE","OPEN_INTEREST"],
 "timeHorizon":"1h","riskRewardRatio":3.111,
 "status":"EXPIRED",
 "executedOrderId":null,"stopLossOrderId":null,"takeProfitOrderId":null,
 "llmDurationMs":45972,"usageEventId":"f77255cb-…",
 "createdAt":"2026-08-15T13:18:03.199Z",
 "expiresAt":"2026-08-15T13:33:03.199Z",
 "executedAt":"2026-08-15T13:18:03.199Z",
 "entryFillPrice":null,"entryFillQuantity":null,"entryFee":null,
 "closedAt":"2026-08-15T13:33:10.729Z",
 "atrPct":0.6128,"tradeStatus":"EXPIRED","challenge":null}
```

### What this settles for the change

- **The price levels ARE on the row**: `entryPrice`, `stopLoss`, `takeProfit`.
  The agreed confirmation binding is buildable.
- **THERE IS NO REVISION FIELD.** No `revision`, `version`, `updatedAt`, or
  ETag anywhere on the decision. The operator's requirement — bind decision id,
  **revision**, and price levels — **cannot be met as stated**. The available
  substitutes are (a) the three price levels themselves as the change-detector,
  and (b) `expiresAt`, which is fixed at creation. This needs an explicit
  decision in the proposal; it is a contract gap, not an oversight.
- **Size is a percent, never a number**: `positionSizePct: 10`,
  `positionSizePreset: "SMALL"`, with `entryFillPrice`/`entryFillQuantity`/
  `entryFee` all null. Confirms sizing happens at accept time; the confirmation
  cannot show a dollar amount.
- **`status` is derived, and the actionable value is `PENDING`** — per
  `list_entry_decisions`' own filter description, *"PENDING (proposed or
  submitting — the actionable set for accept/cancel)"*. So `list_entry_decisions
  (status: PENDING)` is a **second, pollable path to a live approval row**,
  independent of `list_pending_approvals`.
- **`executedAt` is set at creation, not at fill** (13:18:03.199Z, identical to
  `createdAt`, on a decision that never executed). Do not render it as "when the
  trade opened" — that would be a false statement on an unexecuted decision.
- **Still unobserved**: the enrichment `list_pending_approvals` adds over this
  row ("enriched with execution and outcome context"), and the literal
  `AWAITING_APPROVAL` status string in a live payload.

### Catching the next one

Undertow produced this at 13:18Z having produced nothing at 12:00Z, so the rate
is roughly one unheld-coin ENTER per hour or two. `total: 12` EXPIRED decisions
exist across its history. The next window is ~15 minutes wide. **Poll
`list_pending_approvals` AND `list_entry_decisions(status: PENDING)`, keep the
session idle so the cron can actually fire, and do not start any long-running
job while waiting.**

**Free falsifiable test, no write required.** At the next evaluation either
(a) a fresh `EXCHANGE_MIN_NOTIONAL_UNREACHABLE` row appears at TOKEN stage with
`reasonDetail ≈ {equityUsd: 32.8, minEquityUsd: 33.333333, smallPct: 10,
maxLeverage: 3}` — starvation confirmed, queue structurally blocked until a
close; or (b) an approval row appears, and its size should be ≈9.85 if the
model holds. **The string `minEquityUsd: 33.333333` settles it.** Either
reading also re-confirms MARGIN, since under NOTIONAL that field would read
≈8.47. NOT DETERMINED and untestable without a fresh sweep: whether that
TOKEN-stage floor test reads live headroom (32.8, fails) or the static cap
(45, passes).

### Three facts that change how this change must be built

1. **Size does not exist at decision time.** The decision row stores
   `positionSizePct` and `positionSizePreset` and **no notional and no
   quantity**; `entryFillQuantity` is null until `executedAt`. Sizing consults
   the exposure ledger at **ACCEPT time**. So the confirmation cannot bind a
   dollar amount — it does not exist yet — and approving a stale row sizes off
   *then-current* headroom. Binding decision id + revision + price levels (the
   agreed design) remains correct and is now also the *only* thing bindable.
   Two rows approved back-to-back size 10% apart.
2. **The row lives ~15 minutes.** `signalTimeoutMinutes: 15` explains
   `expiresAt = createdAt + 15min` on executed decisions and two EXPIRED rows
   closing exactly 15 minutes after creation. `AGENT_APPROVAL_EXPIRED` is in
   the vocabulary. **Poll at ≤7-minute intervals.**
3. **`OPEN_POSITION_CONFLICT` is historical, not live.** It is 5,282 of 5,521
   blocks but its `latestAt` is 2026-08-12T09:29Z — three days stale, zero
   today despite three held tickers. Do not use it to predict today's
   behaviour (this corrects the read in `open-position-conflict-churn-tripled`).

### Gauges closer to binding than exposure

`drawdown` fill 1.9 / remaining 4.1 of 6; `maxDailyLossUsd` 1.5 with
`dailyRealizedPnlUsd` 0; and `balanceThresholdUsd` 35 against a 38.67 balance —
**$3.67 of room**, with `TRADING_BALANCE_BELOW_THRESHOLD` in the vocabulary and
realized P&L at −0.84. If anything budget-side stops Undertow it is one of
these, not exposure.

### Two unresolved anomalies (do not touch the verdict)

- `effectiveNotionalUsd` reads 32.8 — identical to `headroomUsd`, not
  `headroom x leverage` (131.2 at the configured 4x) — despite a description
  promising "the effective notional the current headroom authorizes".
- `get_agent_activity_feed` is useless as a detector: `total: 1` (AGENT_CREATED)
  against 41 lifetime trades. (`accountEquityUsd: 0` is **resolved, not
  anomalous** — `lifetimeAllocatedUsd` is 0 across 41 trades, so fund-allocation
  is simply not this agent's funding path.)
