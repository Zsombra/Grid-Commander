---
id: the-exposure-cap-starves-silently-and-we-say-it-wrong
title: The exposure cap is a sizing base that starves entries silently — our hint calls it a total
type: bug
status: in-progress
priority: p2
created: 2026-08-15
updated: 2026-08-16
change: the-cap-shows-what-is-left
capability: agent-understanding
github: "299"
blocked_by: []
tags: [battlegrid, money-limits, exposure, comprehension, silent-failure]
---

# The exposure cap is a sizing base that starves entries silently — our hint calls it a total

## What

`maxConcurrentExposureUsd` is not a ceiling that trips. It is the **base the
platform sizes every order from**, and it enforces itself by shrinking each
successive order until one falls under the exchange's $10 minimum and dies at
the TOKEN stage — **without ever naming exposure as the reason.** Zero of this
account's 5,521 lifetime gate blocks names it.

Three things are wrong at once on our side:

1. **The hint text asserts the wrong unit.** `money-limits.tsx:119` reads
   *"The total of everything open at the same time."* That describes notional.
   The cap is metered on **margin** (measured, below). The label directly above
   it — *"Most it may have at risk at once"* — is correct, so the component
   contradicts itself in adjacent lines.
2. **Nothing explains the starvation.** An operator whose agent stops entering
   trades sees no block, no warning, and a gauge reading `breached: false`.
   The agent simply stops. Nothing in the product connects "three positions
   open" to "no fourth entry will ever be proposed".
3. **We already fetch the answer and throw it away.** `capitalAtRiskUsd` and
   `headroomUsd` are declared in the domain and mapped by the adapter, then
   read by **no query, no component, no page**. `effectiveNotionalUsd` is not
   mapped at all.

## Why it matters

The product's premise is "the human decides, informed". This is the money
surface — the one screen built to be trusted about consequences — and on it we
tell the operator the wrong unit for a field that governs real position size.

The failure it hides is silent and total: an agent that looks healthy, has
`breached: false` on every gauge, is not halted, is not blocked, and will
nonetheless never open another position. This is not hypothetical. It is
happening on this account right now (see Evidence) and it cost a full
investigation to identify, having been guessed at wrongly twice in this repo's
own record first.

One consolation, verified: `read-risk-reading.query.ts:313` asserts a cap
above the balance "cannot bind" using a bare `cap > balanceUsd` comparison with
no leverage term. That claim is **sound** — but only because the unit is margin.
It shipped on an assumption nobody had checked, and would have been a false
all-clear on the same screen had the unit gone the other way.

## Evidence

**The unit, observed** — `get_agent_budget` for Undertow
(`d0f6829f-96f8-468d-8797-4a04e8dc8e37`), 2026-08-15 ~11:57Z:

```
maxConcurrentExposureUsd: 45   capitalAtRiskUsd: 12.2   headroomUsd: 32.8
gauges.exposure: { fill: 12.2, remaining: 32.8, configured: true, breached: false }
```

`list_user_active_positions` totals at the same moment:
`marginedUsd: 12.176704`, `currentNotionalUsd: 36.54`. The gauge matches margin
and misses notional by 24.36. A third reading — "capital at risk" as stop-loss
risk — computes to $0.27 and is excluded.

**The sizing formula, reconstructed exactly** (three for three, to the cent,
once integer quantity flooring is applied):

```
size_notional = headroom x sizePct x effectiveLeverage
AIXBT  (1st): 45.000000 x 0.10 x 3 = 13.500 -> /0.017684 = 763.40 -> floor 763 -> 13.492892 ✓
MELANIA(2nd): 40.502369 x 0.30       = 12.151 -> /0.07057   = 172.18 -> floor 172 -> 12.138040 ✓
MOODENG(3rd): 36.456356 x 0.30       = 10.937 -> /0.03609   = 302.99 -> floor 302 -> 10.899180 ✓
```

**The starvation, live**: headroom is now 32.823296. A SMALL entry sizes to
`32.823296 x 0.10 x 3 = $9.847`, under the $10 exchange minimum that has
already killed 77 evaluations on this agent
(`EXCHANGE_MIN_NOTIONAL_UNREACHABLE`, TOKEN stage, pre-model). The floor is
`10/(0.10x3) = $33.333`. Undertow is **$0.51 short**, and 8 of 8 ENTER
decisions in visible history are `positionSizePreset: SMALL`. The burst
stopped at exactly three positions because the third was the last that fit.

**Our code**:
- `src/presentation/components/money-limits.tsx:118-119` — label says "at risk",
  hint says "the total of everything open at the same time"
- `src/application/use-cases/read-risk-reading.query.ts:313` —
  `exceedsBalance: comparable && cap > (balanceUsd as number)`, no leverage term
- `src/infrastructure/battlegrid/agent-mapper.ts:434-435` — maps
  `capitalAtRiskUsd` / `headroomUsd`
- `src/domain/agent/budget.ts:36-37` — declares them
- `grep capitalAtRiskUsd|headroomUsd|effectiveNotionalUsd src/` returns only
  those four lines — nothing reads them

**Prior contradiction in our own record**: `openspec/JOURNAL.md:5396-5399`
states the notional reading; `:5464-5473` records the gate payload implying
margin — written a day apart, neither reconciled against the other.

## The standard half shipped 2026-08-16 — the item stays open, and one claim is withdrawn

`the-cap-shows-what-is-left` landed. The limits surface now shows, for an agent
whose cap is configured: the margin committed against it, the headroom left, the
statement that BattleGrid **sizes each new trade from what is left rather than
stopping at the cap**, what the platform reports that headroom authorizes, and
the consequence — below the exchange minimum, entries stop being placed and the
platform does not say why. A platform-reported block renders with its own reason,
or says plainly that none was given.

**Consequence 3 is discharged.** `capitalAtRiskUsd` and `headroomUsd` were
declared, mapped and read by nothing; they are now read.
`effectiveNotionalUsd`, `blockedReason` and `blockedSince` were not mapped at
all and now are.

**Consequence 2 is discharged in part, deliberately.** An operator can see the
cap filling before the silence arrives. They are **not** shown "the next order
would size to X, floor is Y".

### The claim this item made that does not survive

This item recorded, after the 2026-08-16 measurement, that surfacing the
next-order sizing had become *"a rendering problem over fields already in hand
rather than a derivation"*.

**That is true of headroom and false of the next order's size.** The size preset
is this product's to apply and the platform publishes no per-preset projection,
so the figure is `headroom × sizePct × effectiveLeverage` — the exact formula
`the-approval-can-be-answered` refused as **PE-2** a day earlier, on the
neighbouring money surface, for the same reason. Building it here would have
overturned that decision by accident rather than on purpose.

The question is now filed once, on
[[a-confirmation-that-cannot-name-the-amount]] (#305), which already held it for
the approvals confirmation and now governs both surfaces. A guard —
`tests/agent/sizing-base.test.ts` — fails if either file starts computing it.

### A second claim, corrected by the live read

`effectiveNotionalUsd` was assumed to differ from `headroomUsd` by the leverage
term. **It does not, on any reading yet taken**: 36.45/36.45 in this item's own
measurement, and 36.72/36.72 on Undertow at 4x leverage on 2026-08-16. Both are
carried, neither is derived, and nothing asserts a relationship between them.

### What keeps this item open

- The `EXCHANGE_MIN_NOTIONAL_UNREACHABLE` / `minEquityUsd: 33.333333` test is
  still **NOT DETERMINED**. No such row has been produced.
- `accountEquityUsd` still reads **0** on a funded account — re-observed
  2026-08-16. Recorded, not concluded, here and on #107.

## Notes

- **Free falsifiable test, no write needed**: at the next evaluation a fresh
  `EXCHANGE_MIN_NOTIONAL_UNREACHABLE` row's `reasonDetail` publishes
  `equityUsd`. If it reads ≈32.8 the floor test uses live headroom and the
  starvation is confirmed end to end; if it reads 45 it uses the static cap.
  The string `minEquityUsd: 33.333333` settles it. **NOT DETERMINED** today.
- Fixing the copy is a `lite` change. Surfacing headroom and the "next order
  would size to X, floor is Y" explanation is `standard` and needs a delta spec
  — it adds behavior to the limits surface.
- Do not fix the copy by simply swapping "total" for "margin". The operator's
  actual question is *"why did my agent stop?"*, and the honest answer names
  the sizing base and the exchange floor together.
- Found while unblocking [[approvals-have-no-write-side]] (#101); the full
  measurement and the three consequences for that change are recorded there.
- Corrects the live reading in [[open-position-conflict-churn-tripled]]:
  `OPEN_POSITION_CONFLICT` is 96% of blocks but its `latestAt` is
  2026-08-12T09:29Z — three days stale, and zero today despite three held
  tickers. It is the dominant historical code, not an active one.

## Measured 2026-08-16 — the unit is settled, and the expensive half is cheaper

Read live at v19.1.0 over the authenticated MCP connector. Read-only, no writes.

**The cap is metered on margin. That is no longer an inference.** Undertow, at
one instant:

```
maxConcurrentExposureUsd   45
currentNotionalUsd         29.478109      <- notional across its 2 positions
capitalAtRiskUsd            8.55          <- margin
gauges.exposure.fill        8.55          <- what the cap actually counts
```

Were the cap metered on notional, the exposure gauge would read 29.48 against
45. It reads 8.55, and `marginedUsd` from `list_user_active_positions` agrees at
8.511903. Breakwater reproduces it: notional 12.9118, `capitalAtRiskUsd` 4.5,
`gauges.exposure.fill` 4.5.

So `money-limits.tsx:119` — *"The total of everything open at the same time."* —
is **measurably** wrong rather than arguably wrong, and the label above it
remains correct. Consequence 1 of this item is now settled evidence.

### The `standard` half is smaller than it was filed as

The explanation this item asks for is largely **already published on a response
the product already fetches**. `get_agent_budget` returns, per agent:

```
headroomUsd               36.45   <- the sizing base
effectiveNotionalUsd      36.45   <- what that headroom authorizes
budgetOverSubscribed      false
stopBelowSingleTradeLoss  false
stopEffectivelyUnbounded  false
blockedReason             null
blockedSince              null
gauges.exposure  { fill 8.55, remaining 36.45, configured true, breached false }
```

The tool's own description names `headroomUsd` "the sizing base", calls
`effectiveNotionalUsd` "the effective notional the current headroom authorizes",
warns that `configured: false` means no limit rather than a limit of zero, and
says of the gauges: **"render them, never re-derive."**

That turns "surface headroom and the next-order sizing" from a derivation
problem into a rendering problem over fields already in hand. The delta spec is
still required — it adds behaviour to the limits surface — but the arithmetic
the item worried about belongs to the platform, not to us.

### Still open after this read

- The `EXCHANGE_MIN_NOTIONAL_UNREACHABLE` / `minEquityUsd: 33.333333` test in
  the Notes is **still NOT DETERMINED**. No such row was produced today.
- **New, recorded not concluded**: `accountEquityUsd` reads 0 on both trading
  agents while `get_account_state` reports `balance.usdc 38.573919`. Carried
  identically on [[performance-and-allocation-are-unmodelled]] (#107); it is not
  folded into any verdict here.

## The copy half shipped 2026-08-16 — the item stays open

`the-cap-says-what-it-meters` landed and is archived. The hint now reads:

> Margin, not position size. BattleGrid sizes each new trade from what is left
> — and once that falls under 10, the next trade is refused without saying why.

That discharges **consequence 1** — the wrong unit — and nothing else. The
`agent-authoring` requirement *An Agent's Spending Limits Are Stated Before It
Exists* gained a clause obliging a limit to be described by what the platform
meters and how it enforces it.

**`change:` is cleared and `status:` returns to `open` deliberately.** The item
was filed for two halves and only the `lite` one is done. What remains is the
`standard` half, and the 2026-08-16 measurement made it cheaper than filed:
`get_agent_budget` already publishes `headroomUsd`, `effectiveNotionalUsd`,
`budgetOverSubscribed`, `stopBelowSingleTradeLoss`, `blockedReason` and four
resolved gauges on a call the product already makes. Surfacing "the next order
would size to X, floor is Y" is now a rendering problem over fields in hand
rather than a derivation, but it adds behaviour to the limits surface and still
needs a delta spec.

Also still open from the Notes: the `EXCHANGE_MIN_NOTIONAL_UNREACHABLE` /
`minEquityUsd: 33.333333` test is **NOT DETERMINED**, and the
`accountEquityUsd: 0` anomaly is recorded, not concluded.
