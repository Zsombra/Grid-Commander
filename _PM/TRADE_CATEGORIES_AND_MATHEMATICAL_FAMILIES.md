# Trade Categories × Mathematical Families

A research map of what can actually be built on BattleGrid, what the platform's
own data says about which of it works, and a benchmark to optimise from.

**Probed live against `battlegrid v11.0.0` on 2026-08-06.** Every number in
Part D came from a read-only tool call made during this research; nothing is
inferred from declared schemas alone. Reproduction steps are in the appendix.

> **Surface note.** The recorded surface (`docs/battlegrid-mcp-surface.json`) is
> current — it records `v11.0.0` and the freshness gate passes against the live
> server. But the probe records payload **shapes**, not values, so the authoring
> vocabulary's actual contents — the transform ids, the budget numbers, which
> timeframes are enabled — appear in no committed artifact. Several facts this
> document relies on are therefore unrecorded rather than stale. Listed in §3.5,
> filed as `the-surface-map-is-two-majors-stale`.

---

## 1. Executive summary

Seven findings. The first three change what you build; the last four change how
you build it.

**1. The live agent population performs at the level of random entry.**
Across 715 pooled realised trades from 20 public agents, the win rate is
**29.8%**. An unconditional random-entry baseline on the same universe — 1h
anchor, 1.5% stop, 1.5:1 target, measured over 2,820 joined coin-bars — wins
**30.6%**. The entry signals, in aggregate, are adding approximately nothing.
Whatever edge exists on this platform has not yet been captured by anyone.

**2. The dominant failure is geometry, not signal quality.** The median stop is
**0.623%** from entry. The mean *single-bar* adverse excursion on a 1h anchor is
**0.47%**, and by bar 3 it is **0.85%**. The stops sit inside the noise, so 74%
of all trades exit at STOP_LOSS with a 15.5% win rate and a median life of
1.5 hours. Fixing stop distance is worth more than any new indicator.

**3. Required payoff exceeds available payoff.** Agents demand
`minRiskRewardRatio` 1.5–2.0. The mean favourable-to-adverse excursion ratio of
a random 1h window is **0.97 at 1 bar, 1.04 at 12 bars, 1.13 at 24 bars**. You
are asking the market for 1.5R in states that offer roughly 1.0R. Either select
states with a better ratio (§D.4 names them), lengthen the horizon, or lower the
target — the current configuration is arithmetically unable to clear its own bar.

**4. The regime label predicts *range*, not *direction*.** In this sample
`bull_expansion` had the **worst** 4h forward return (−0.73% at 6 bars, 42.9%
up) and `bear_expansion` the best (+0.44%, 57.1% up). Use regime to choose the
*category of trade* and the *position size*, never to choose the side.
`bull_ranging` is the one regime that is unprofitable at every horizon on both
timeframes — the most robust "sit it out" finding in the study.

**5. `volatile` is a one-bar transition state that resolves into an expansion
100% of the time** (median run length 1 bar; 8/8 transitions at 4h and 8/8 at 1d
went to `bull_expansion` or `bear_expansion`). It is the cleanest regime-gated
setup available, and it is directional-agnostic — a straddle-shaped opportunity,
not a long or short one.

**6. Three restrictive behaviour settings each independently correlate with
survival**, monotonically: `CONSERVATIVE` > `MODERATE` > `AGGRESSIVE`,
`PESSIMIST` > `REALIST` > `OPTIMIST`, `CAUTIOUS` > `MEASURED` > `BOLD`. And the
agent's own stated conviction is **inversely** related to outcome — 0.5
conviction trades won 39.5%, 0.8 conviction trades won 15.5%.

**7. The two richest data modules are used by nobody.** `includeMtfConfluence`
and `includePerpSpotFlow` are enabled on **0 of 23** trading agents. The
perp/spot module ships a classification vocabulary — `perp_led_fragile`,
`spot_led_accumulation` — that names a real institutional distinction and is
sitting entirely unexploited.

**8. A signal that barely fires is worth almost nothing.** Signals emit a
*graded* score, not a binary vote, and the gradient near the threshold is steep:
`rsi_oversold` scores **0.10** at RSI 27 and 0.50 at RSI 15; `trend_adx_trending`
scores **0.20** at ADX 30 and 1.00 at ADX 50. So a high aggregate score means
signals fired *deeply*, not that many fired — and tightening a signal's own
threshold is often a better lever than raising the gate. 39 of 84 signals are
tunable, with declared bounds; that is the real optimisation surface (§3.6).

**What to build first:** §E gives a benchmark specification that follows from
these seven directly. It is deliberately not clever. It fixes the geometry,
sits out the one bad regime, and gives you a measurable baseline to optimise
against.

---

## 2. The constraint frame

Before categorising anything: a BattleGrid strategy is not free-form code. It is
exactly five layers, and every idea in this document has to survive being
expressed in them.

```
┌─ 1. UNIVERSE ──────────────────────────────────────────────────────────┐
│  coinSelection: {mode:'ranked', limit ≤100, category} | {explicit}      │
│  category ∈ ALL CRYPTO L1 MEMES DEFI TRADFI STOCKS INDICES COMMODITIES  │
├─ 2. CLOCK ─────────────────────────────────────────────────────────────┤
│  timeframe (anchor) ∈ 1m 5m 15m 1h 4h 1d          ── 6 enabled, not 13  │
│  per-column: {rel: anchor|lower|higher|regime} | {abs: …}               │
│  ≤ 8 distinct timeframes per strategy                                   │
├─ 3. EVIDENCE — what the LLM sees ──────────────────────────────────────┤
│  sections: ≤32, columns ≤32, lookback ≤32, ~16,000 tokens               │
│  column = metric × transform × timeframe × window(1-64) × offset(0-64)  │
│            [× inputs ≤4] [× chainedTransformId] [× side|ordering|bars]  │
├─ 4. LOGIC — deterministic, no LLM ─────────────────────────────────────┤
│  conditions: ≤16, clauses ≤16                                           │
│    clause: {column, lt|lte|gte|gt, value} | {between low,high}          │
│          | {is label} | {in labels}                                     │
│    group:  {ALL|ANY|NOT|N_OF(n), members ≤64}   ── recursive            │
│    conditionRef: reuse another condition by key                         │
│    each condition emits a verdict: UP | DOWN | NEITHER | null           │
├─ 5. SCORECARD — weighted vote + gates ─────────────────────────────────┤
│  rules: 84 signals × allocation tier 0-3 × required flag × params       │
│  gates: minAggregateScore · minRequiredCount · minAtrPct                │
└────────────────────────────────────────────────────────────────────────┘
        ↓ then the AGENT wraps it in risk, and the RADAR decides when it runs
```

Two consequences worth stating up front, because they constrain the whole
design space:

- **Layer 4 is the only deterministic layer.** Conditions compile to booleans
  over report columns with no model in the loop. Everything expressed in layer 3
  alone is *shown to an LLM and interpreted*. If a rule must hold, it belongs in
  a condition, not in a table you hope the model reads correctly.
- **Layers 3 and 5 are coupled but not identical.** `derive_strategy_rule_view`
  answers, for all 84 signals, whether the draft report can feed them. Weighting
  a signal your tables cannot feed does nothing at all — it is the single
  easiest way to build a strategy that silently ignores half its own scorecard.

### 2.1 The two laws that refuse columns

Both were established live and both bite constantly in practice:

- **Unit commensurability.** `spread` joins only operands declaring a numeric
  output in the base's own unit. `RSI14` spreads against `{ADX, CCI20, MFI14,
  RSI7, STOCH_D, STOCH_K}` and nothing else; `ATR` against `{CVD, MACD}`;
  percent-unit metrics against the percent family. A cross-unit ratio is refused,
  not silently nulled.
- **Timeframe inertia.** A section containing any `timeless` metric —
  `FUNDING_RATE`, `OI`, `CHG_*`, `SPOT_CVD`, every `crowd` and `derived` metric —
  must declare **no** section timeframe. This is why funding and positioning
  tables have to be built as their own untimed section rather than folded into a
  timeframed one.

---

## 3. The data inventory

### 3.1 Metrics — 84 across 10 families

| Family | n | Metrics |
|---|---:|---|
| `price` | 8 | OPEN HIGH LOW CLOSE LAST MARK ORACLE BAR_FORMING |
| `momentum` | 15 | RSI14 RSI7 MACD STOCH_K STOCH_D MFI14 PPO ROC12 CCI20 CLOSE_CHANGE CHG_5M CHG_15M CHG_1H CHG_4H CHG_24H |
| `trend` | 9 | ADX SMA20 SMA50 SMA200 EMA5 EMA13 EMA20 EMA_CROSS MA_ALIGN |
| `volatility` | 6 | ATR ATR_PCT BB_WIDTH BB_WIDTH_PCT HIGH_DEV LOW_DEV |
| `volumeFlow` | 13 | VOLUME VOL_SMA20 TRADES BUY_VOLUME SELL_VOLUME NOTIONAL_VOLUME_1D RVOL OBV CVD SPOT_CVD BUY_PRESSURE BUY_TRADES SELL_TRADES |
| `derivatives` | 7 | FUNDING_RATE FUNDING_ANN FUNDING_LABEL OI OI_CHG OI_VELOCITY OI_PX_REGIME |
| `structure` | 7 | BB_PCT_B SWING_HIGH SWING_LOW VWAP PRICE_ZONE BB_TOUCH STRUCT_ZONES |
| `regime` | 3 | REGIME_TREND REGIME_VOL REGIME_MOM |
| `crowd` | 9 | CROWD_PICK CROWD_UPBIAS CROWD_ACC CROWD_CAPT + 4 `_LIVE` variants, SETTLED_AT |
| `derived` | 7 | FLOW_ALIGN SMART_RETAIL CAPTAIN_CONF CONFIDENCE PERP_SPOT_FLOW PERP_SPOT_STRENGTH PERP_SPOT_CONFIRMS |

**The classification metrics are the most under-appreciated asset here.** Thirteen
metrics return labelled states rather than numbers, and a condition can match
them exactly with `is` / `in`. These vocabularies encode real analytical
distinctions the platform has already computed for you:

| Metric | Vocabulary |
|---|---|
| `OI_PX_REGIME` | `new longs` · `new shorts` · `short covering` · `long liquidation` |
| `PERP_SPOT_FLOW` | `confirmed_bull` · `confirmed_bear` · `perp_led_fragile` · `spot_led_accumulation` · `neutral` |
| `SMART_RETAIL` | `hidden accumulation` · `hidden distribution` · `confirmed` |
| `FLOW_ALIGN` | `aligned bullish` · `aligned bearish` · `divergent` · `neutral` |
| `PRICE_ZONE` | `breakout high` · `breakdown low` · `near high` · `near low` · `mid-range` |
| `REGIME_TREND` | `trending up` · `trending down` · `ranging` |
| `REGIME_VOL` | `expanding` · `contracting` · `normal` |
| `REGIME_MOM` | `bullish` · `bearish` · `neutral` · `diverging` |
| `FUNDING_LABEL` | `low` · `moderate` · `elevated` · `extreme` |
| `OI_VELOCITY` | `accelerating` · `decelerating` · `steady` |
| `MA_ALIGN` | `bullish` · `bearish` · `mixed` |
| `BB_TOUCH` | `upper` · `lower` · `none` |
| `CONFIDENCE` | `high` · `moderate` · `low` |

`OI_PX_REGIME` alone is the classic futures positioning four-quadrant, computed
and labelled. `PERP_SPOT_FLOW` distinguishes leverage-led from spot-led moves —
a distinction desks pay for. Both are one `is`/`in` clause away from being a
hard gate.

### 3.2 Transforms — the 16-operator algebra

This is the mathematical vocabulary. Everything in Part A is built from it.

| Transform | Operator class | What it computes |
|---|---|---|
| `value` | point evaluation | xₜ |
| `trajectory` | lag vector + direction | (xₜ₋₃…xₜ) rendered as 5 headers incl. a direction label |
| `distance` | displacement from price | signed/normalised (P − L) |
| `spread` | difference of commensurable series | xₜ − yₜ, unit-law enforced |
| `aggregate` | windowed moment | mean/sum over window 1–64 |
| `efficiency` | **path-shape** | Kaufman Efficiency Ratio: net displacement ÷ path length ∈ [0,1] |
| `maxShare` | **concentration** | largest single bar's share of the window's total |
| `rank` | cross-sectional percentile | peer rank; `ordering` hi/lo/far/near |
| `classifyZone` | discretisation | numeric → zone label |
| `bandTouch` | boundary hit | band-contact indicator |
| `crossDetect` | event detection | zero/signal-line crossing |
| `count` | point-process count | number of structure zones |
| `nearestZoneType` | nearest-neighbour class | FVG vs order block |
| `nearestZoneRange` | nearest-neighbour extent | the zone's price range |
| `nearestZoneDist` | nearest-neighbour distance | how far price is from it |
| `nearestZoneAge` | **survival** | how long the zone has stood unfilled |

Plus two structural modifiers that matter more than they look:
`offset` (0–64) is a **lag operator** — it is what makes divergence and
autocorrelation constructions expressible at all — and `chainedTransformId`
composes two operators, e.g. `distance → rank ordering:far` ("which coin is
furthest from its VWAP").

> **`efficiency` and `maxShare` are the two non-obvious ones and they are the
> most interesting.** Neither is standard retail TA. `efficiency` is the
> denominator-free trend/chop discriminator behind Kaufman's Adaptive Moving
> Average (1995) — high ER means the move went somewhere, low ER means it
> thrashed. `maxShare` on `VOLUME` measures whether a window's volume arrived in
> one print or was distributed across bars, which separates an impulsive
> liquidation from steady accumulation. The platform's own `Candle Breakdown`
> section pairs them: `CLOSE efficiency w=5` + `VOLUME maxShare w=4` on the
> lower timeframe. That section is the second-best-performing module in the
> empirical study (§D.2).

### 3.3 Signals — 84 across 19 modules

48 LONG · 36 SHORT · 77 `standard` / 4 `synthesis` / 3 `comparison` ·
75 evaluate on CLOSED bars, 9 on LIVE price.

| Module | n | Module | n | Module | n |
|---|---:|---|---:|---|---:|
| MOVING_AVERAGES | 10 | BOLLINGER | 5 | COMPARISON | 3 |
| RSI | 8 | MACD | 4 | FUNDING | 3 |
| TREND_STRENGTH | 6 | STOCHASTIC | 4 | OPEN_INTEREST | 3 |
| MFI | 6 | VOLUME | 4 | VOLATILITY | 2 |
| SUPPORT_RESISTANCE | 4 | RELATIVE_STRENGTH | 4 | FLOW_DIVERGENCE | 2 |
| REGIME | 4 | PRICE_STRUCTURE | 4 | CVD | 4 |
| CONFLUENCE | 4 | | | | |

Three practical notes that are easy to get wrong:

- **The 4 `synthesis` signals are pre-built multi-timeframe confluence** and are
  the highest-value items in the catalogue for anyone building a trend or
  pullback strategy: `mtf_aligned_bull/bear` (lower + primary + higher MA stacks
  agree) and `mtf_pullback_long/short` (HTF trend + LTF counter-extreme). The
  platform has done the hard part.
- **Every signal carries a hard-coded direction**, and several
  direction-neutral concepts are pinned to LONG anyway: `bollinger_squeeze`,
  `regime_trend_shift`, `regime_volatility_shift`, all four `structure_*`, all
  three `comparison_*`. Weighting `bollinger_squeeze` in a short-side strategy
  pushes a **long** vote. This is a real trap in scorecard construction.
- **9 signals evaluate on LIVE price**, including all of `sr_at_support`,
  `sr_at_resistance`, `bollinger_lower/upper_touch`, `ma_sma200_above/below`,
  and three `structure_*`. Those fire intrabar and are the ones exposed to
  whipsaw on a forming candle.

### 3.4 Regimes, risk bounds, and budgets

**Regimes** — 7 declared: `bull_expansion` `bear_expansion` `bull_ranging`
`bear_ranging` `contraction` `volatile` `fallback`. **Only 5 were ever
observed** across 296 bars of BTC 4h and 184 bars of 1d: `contraction` and
`fallback` never occurred. Do not gate a deployment on a regime that never
fires.

**Risk bounds** (`get_trading_config_catalog`, live):

| Parameter | Min | Max | Default |
|---|---:|---:|---:|
| stop-loss % | 0.1 | 25 | 1 – 5 |
| risk:reward | 0.5 | 5 | 1.5 |
| ATR % floor | 0.1 | 10 | 0.5 |
| entry deviation (ATR ×) | 0.5 | 5 | 1.5 |
| leverage | 1 | registry × 20 | 1 |
| slippage (bps) | 1 | 1000 | 300 |
| max daily trades | 1 | 100 | 10 |
| trade conviction floor | 0.2 | — | 0.35 |

Position-management presets, ordered patient → hair-trigger:
**COLT** (ATR×4, break-even at 70% of TP) · **WEBLEY** (3.5, 60%) ·
**BERETTA** (3, 50%) · **LUGER** (2, 30%) · **WALTHER** (1.5, 20%).
Note the platform default is `positionMgmtEnabled: false` — and §D.3 shows why
that default is the right one.

**Budgets:** sections 32 · sectionColumns 32 · columnLookback 32 ·
distinctTimeframes 8 · **strategyConditions 16 · conditionClauses 16** ·
estimatedTokens 16,000. Preview execution: 256 KB, 15 s.

### 3.5 What is unrecorded (and why the freshness gate cannot see it)

`docs/battlegrid-mcp-surface.json` records `v11.0.0` and matches the live
server. The problem is not staleness — it is that `tools/probe_mcp_surface.py`
records response **shapes** rather than values, deliberately, so that account
data never lands in a committed artifact. For `list_strategy_vocabulary` that
loses the contract, because the vocabulary payload *is* values:

| Fact used in this document | Recorded as |
|---|---|
| 16 transform ids, incl. `efficiency`, `maxShare` | nothing — absent from `docs/` entirely |
| `strategyConditions: 16`, `conditionClauses: 16` | `"int"` |
| only **6 of 13** enum timeframes enabled (`1m 5m 15m 1h 4h 1d`) | nothing |
| `rel: regime` resolves to `null` for every anchor | nothing |
| per-metric legal `transformIds` | an untyped list shape |

Three of these can produce silently wrong output rather than a refusal:

1. **`rel: regime` is inert.** Any column written against the regime timeframe
   reference resolves to nothing on every anchor — it renders empty rather than
   failing. Use an absolute timeframe.
2. **The condition budget is 4× tighter than the schema declares** — 16 against
   `maxItems: 64`. `docs/REPORT_TABLE_GRAMMAR.md` lists four budget gauges;
   there are six.
3. **Seven of the enum's timeframes are not enabled.** A strategy authored from
   the schema enum can name one the platform refuses.

The freshness gate compares `serverInfo.version` and nothing else, so a
deployment that changes a budget number, retires a timeframe or adds a transform
while leaving the version alone passes green.

Two smaller inconsistencies, same family: `docs/BATTLEGRID_SURFACE_MAP.md` line
3 still says "against `battlegrid v9.0.0`" beside a JSON file that says 11.0.0,
and `docs/battlegrid-mcp-capabilities.json` carries `serverInfo: 9.0.0` while
its schemas already hold v11-era content. The data was regenerated; the
narrative was not.


### 3.6 The signal parameter surface — swept live, all 84

`get_strategy_signal_definition` was swept across the whole catalogue
(84/84 answered). It carries far more than the list view: tunable parameters
with bounds, timeframe dependencies, worked scoring examples, and the
platform's own guidance per signal.

**39 of 84 signals are tunable. 45 are fixed.** That 39-dimensional continuous
space, with declared bounds, is the actual optimisation surface:

| Parameter | Signals | Example bounds (default) |
|---|---:|---|
| `threshold` | 18 | `rsi_oversold` [1,50] (30) · `trend_adx_trending` [15,50] (25) |
| `multiplier` | 4 | `volume_surge` [1.1,20] (2) · `volatility_atr_expanding` [1.05,5] (1.5) |
| `proximityPct` | 4 | `sr_at_support` [0.001,0.05] (0.005) · `structure_ob_approach` [0.1,10] (1) |
| `thresholdPct` | 3 | `funding_extreme_positive` [0.0001,0.05] (0.0005) · `oi_surge` [0.005,0.5] (0.05) |
| `zoneThreshold` | 2 | `stoch_bull_cross` [5,50] (30) |
| `pctBThreshold` | 2 | `bollinger_lower_touch` [0,0.2] (0.05) |
| `minPeerFraction` | 2 | `comparison_sector_momentum` [0.3,1] (0.6) |
| `bandwidthPct` / `maxCorrelation` / `rangePct` / `alignmentPct` | 1 each | `bollinger_squeeze` [0.005,0.2] (0.04) |

#### A signal that "just fires" is worth almost nothing

**This is the most important thing the sweep found.** Signals do not cast binary
votes — they emit a graded score, and the gradient near the threshold is steep.
From the platform's own worked examples:

| Signal | Marginal trigger | Deep trigger |
|---|---|---|
| `rsi_oversold` (threshold 30) | RSI 27 → **0.10** | RSI 15 → 0.50 |
| `trend_adx_trending` (threshold 25) | ADX 30 → **0.20** | ADX 50 → 1.00 |
| `volume_surge` (threshold 2.0) | ratio 2.4 → **0.20** | ratio 4.0 → 1.00 |
| `funding_extreme_positive` (0.0005) | rate 0.0006 → **0.20** | rate 0.0010 → 1.00 |

A scorecard of six barely-triggered signals aggregates to almost nothing. This
is the mechanism behind §D.5's finding that a higher average aggregate score
correlates with better outcomes: **a high aggregate means signals fired deeply,
not that many signals fired.** It also means `minAggregateScore` is a *depth*
filter, and tightening a signal's own `threshold` is often better than raising
the gate — it moves the same market event further into the scoring range.

#### Nine signals score above 1.0, which the simulator does not declare

`simulate_aggregate_score` declares `score` in `[0,1]`. Nine signals document
examples above it — `bollinger_lower/upper_touch` reach **2.0 (clamped)**,
`ma_sma200_above/below`, `sr_support/resistance_break` and `oi_surge` reach 2.0,
and the two `bollinger_cci_*` reach 1.5. Anyone tuning offline by feeding
`[0,1]` scores into the simulator will **understate** the aggregate for these
nine. Treat the simulator as a lower bound where they are weighted.

#### Dependencies — 22 of 84 signals need a timeframe other than the primary

| Dependency set | n | Signals |
|---|---:|---|
| `PRIMARY` | 57 | the bulk |
| `HIGHER` | 6 | the six `htf_*` |
| `LOWER` | 6 | the six `ltf_*` |
| `HIGHER` + `PRIMARY` | 4 | **all four `structure_*`** |
| `REGIME` | 4 | the four `regime_*` |
| `COMPARISON` (+`PRIMARY`) | 3 | the three `comparison_*` |
| `HIGHER`+`LOWER`+`PRIMARY`+`SYNTHESIS` | 2 | `mtf_aligned_bull/bear` |
| `HIGHER`+`LOWER`+`SYNTHESIS` | 2 | `mtf_pullback_long/short` |

Two of these correct build specs elsewhere in this document:

- **The four `structure_*` signals need a higher-timeframe read, not just the
  anchor.** C5's table alone will not feed them.
- **`mtf_pullback_long/short` depend on HIGHER and LOWER but not PRIMARY** — the
  anchor timeframe is not part of their evaluation at all.

And the four `regime_*` signals declare a `REGIME` dependency while `rel: regime`
resolves to `null` for every anchor (§3.5). Whether the signal path resolves the
regime timeframe by a route the column path does not is **unverified** — worth
establishing before weighting them.

#### The platform documents its own regime caveats

**39 of 84 signals carry explicit regime guidance** in a `watchOut` field, and it
consistently says what Part B says independently:

> `ltf_rsi_oversold` — "LTF oversold is noisy — pair with an HTF trend gate so
> you fade dips only in the trend direction."
> `funding_extreme_positive` — "During strong uptrends funding can stay extreme
> for many funding intervals; don't fade a strong trend on funding alone."
> `bollinger_lower_touch` — "In strong downtrends price can 'walk the band'
> lower for many bars — don't fade strong momentum on touch alone."
> `ltf_trend_adx_ranging` — "A tight LTF range often precedes a fast expansion —
> watch for the ADX turning up."

That last one is C4's thesis in the platform's own words. This field is the
cheapest available source of per-signal regime pairing and should be read before
weighting anything.

---

## Part A — The mathematical families

Sixteen families. These are *estimator classes*, not indicators — each is
defined by what it computes, which primitives express it, and what it is blind
to. A trade category (Part B) is then a **composition of families plus a
regime condition plus a risk geometry**.

### F1 · Level & point estimate
`value` on any numeric metric. xₜ.
**Blind to:** everything temporal. A level alone cannot distinguish arriving
from leaving.
**Cost:** 1 column. **Use:** as the anchor of a condition clause, never alone.

### F2 · Path & discrete derivative
`trajectory` (renders xₜ₋₃…xₜ plus a direction label), and `offset` differencing.
Answers *which way and how fast*, not *where*.
**Blind to:** magnitude relative to history — a rising RSI at 35 and at 75 look
identical to the direction label.
**Cost:** 1 sectionColumns unit but **5 rendered headers** — expensive in tokens.

### F3 · Path-shape statistics ★
`efficiency` (Kaufman ER ∈ [0,1]) and `maxShare` (concentration).
The only family that measures *how* price got somewhere rather than where it
went. ER near 1 = clean directional travel; near 0 = chop covering the same
ground. `maxShare` near 1 = one bar carried it; near 1/n = distributed.
**This is the family that discriminates trend-worthy from revert-worthy
conditions**, which is the single most important classification a multi-strategy
system makes.
**Blind to:** direction (ER is unsigned).

### F4 · Windowed moments & smoothing
`aggregate` over `window` 1–64, plus the pre-smoothed metrics (SMA/EMA/VOL_SMA20).
**Blind to:** anything faster than the window. **Note:** `aggregate` is legal on
far fewer metrics than you'd expect — it is available on `FUNDING_RATE`, `OI`,
`SPOT_CVD` and the structure metrics, not on the oscillators.

### F5 · Normalisation & cross-sectional rank
`rank` with `ordering` ∈ hi/lo/far/near; natively normalised metrics
(`ATR_PCT`, `BB_WIDTH_PCT`, `BB_PCT_B`, `RVOL`, `BUY_PRESSURE`, all `CHG_*`).
Turns an incomparable level into a comparable percentile — the only way to
compare BTC against FARTCOIN against GOLD.
**This family is what makes a multi-asset universe tractable at all.**

### F6 · Displacement to a reference level
`distance` from `VWAP`, `SWING_HIGH/LOW`, any MA — optionally chained into
`rank ordering:far|near`.
The mean-reversion primitive: it measures *stretch*.
**Blind to:** whether the anchor itself is valid. Distance from a VWAP in a
trending market is a trend measure, not a reversion measure.

### F7 · Spread / basis / relative value
`spread` under the commensurability law; plus the natively-computed bases
(`PERP_SPOT_FLOW`, `CVD` vs `SPOT_CVD`, `FUNDING_ANN`).
The relative-value primitive: two series that should co-move, and the gap.
**Constraint:** ≤4 operands, same unit. This is the most-refused transform.

### F8 · Boundary & hitting
`bandTouch`, `BB_TOUCH`, `BB_PCT_B`, `PRICE_ZONE`.
Indicator functions on level-crossing — a hitting-time formulation.
**Blind to:** how the boundary was reached. Pair with F3.

### F9 · Event detection
`crossDetect`, `EMA_CROSS`, and the eight `*_cross` signals.
Sign-change detection on a spread. Sparse, discrete, and **lagging by
construction** — a cross is confirmed only after it has happened.

### F10 · State classification & regime
`classifyZone`, the 13 classification metrics (§3.1), the regime snapshot
(regime + conviction + `regimeRunLengthBars` + trend/vol/momentum
trajectories), and the regime transition matrix.
Discretises a continuum into states you can gate on exactly.
**This is the family that decides which other families are allowed to trade.**

### F11 · Point process & survival on structure
`STRUCT_ZONES` with `count`, `nearestZoneType`, `nearestZoneRange`,
`nearestZoneDist`, `nearestZoneAge`.
Treats FVGs and order blocks as a marked point process on the price axis;
`nearestZoneAge` is a genuine survival statistic (how long has this imbalance
gone unfilled).
**Its own transform vocabulary** — none of the scalar transforms apply, and it
returns a `priceRange` type nothing else produces.

### F12 · Cumulative signed flow
`CVD`, `SPOT_CVD`, `OBV`, `BUY_PRESSURE`, `BUY/SELL_VOLUME`, `BUY/SELL_TRADES`.
Running sums of signed order flow — a random-walk-with-drift estimator where
the drift is aggression imbalance.
**Blind to:** passive absorption. Rising CVD into a wall of resting offers looks
identical to rising CVD into thin air, right up until it doesn't.

### F13 · Divergence
Two `trajectory` columns (price and a second series) read against each other,
plus the 8 native divergence signals across RSI / MACD / MFI / OBV / CVD.
Formally: sign disagreement between the derivatives of two correlated series.
**Requires:** both series in the report, at the same timeframe, with enough
lookback. Cheap to specify, expensive in columns.

### F14 · Hierarchical multi-timeframe confluence
`rel: lower | anchor | higher`; the 12 `htf_*`/`ltf_*` signals; the 4 `mtf_*`
synthesis signals.
Agreement across a scale hierarchy. Resolution is anchor-relative — at a 1h
anchor, `lower` = 15m and `higher` = 4h.
**Budget:** ≤8 distinct timeframes; each `rel` used costs one.

### F15 · Boolean condition algebra
`clause` (lt/lte/gte/gt/between/is/in) → `group` (ALL/ANY/NOT/**N_OF**) →
`conditionRef`, recursive, each emitting UP/DOWN/NEITHER.
**The only deterministic layer.** `N_OF` is the important one: it expresses
"any k of these n" — a count-based classifier — without enumerating combinations.
**Budget: 16 conditions, 16 clauses.** Tighter than the schema's `maxItems: 64`
suggests; plan for it.

### F16 · Weighted linear scoring & thresholding
`rules[]` = signal × allocation tier 0–3 × `required`; aggregate score;
gates `minAggregateScore` / `minRequiredCount` / `minAtrPct`.
A linear ensemble vote with a decision threshold. `simulate_aggregate_score`
evaluates it statelessly, so this layer is **tunable offline at zero cost** —
see §E.2.
**Blind to:** interaction effects. A linear score cannot express "A only matters
when B" — that must be pushed down into F15.

---

## Part B — The trade categories

Thirteen categories plus a meta-layer. Each names its families, its buildable
form, the regime it belongs in, and — separately — how strong the evidence is.

**Evidence tiers used throughout:**
- **T1** — replicated academic finding *and* supportive platform data
- **T2** — strong academic/institutional pedigree, platform data absent or thin
- **T3** — supportive platform data, weak external pedigree
- **T4** — mechanism plausible, evidence absent or contradictory here

---

### C1 · Trend continuation (time-series momentum) — T2

**Thesis.** Assets that have moved continue to move over horizons short enough
that the flow driving them has not finished.

**Families:** F2 path · F3 efficiency · F10 regime · F14 MTF · F16 scoring

**Build.**
- Section (timed, anchor 1h): `MA_ALIGN value`, `ADX classifyZone`,
  `CLOSE efficiency w=10`, `EMA20 distance`, `CLOSE_CHANGE trajectory w=5`
- Section (timed, `rel: higher`): `MA_ALIGN value`, `ADX value`
- Signals: `mtf_aligned_bull/bear` (3), `ma_ema_aligned_bull/bear` (2),
  `trend_adx_trending` (2), `htf_ma_aligned_bull/bear` (2)
- Condition: `ALL[ ADX ≥ 25, CLOSE efficiency ≥ 0.4, MA_ALIGN is bullish ]` → UP
- Regime gate: `bull_expansion` / `bear_expansion`

**Why the efficiency clause matters.** ADX ≥ 25 alone admits a great deal of
chop. ER ≥ 0.4 requires the move to have actually travelled. This pairing is the
cheapest real improvement over a textbook trend filter.

**Evidence.** Time-series momentum is one of the most replicated results in
asset pricing (Moskowitz, Ooi & Pedersen 2012, across 58 instruments and ~25
years); crypto-specific momentum is documented in Liu, Tsyvinski & Wu (2022,
*Journal of Finance*). **Platform caveat:** in this 2,820-bar sample
`bull_expansion` had the *worst* forward payoff geometry at 4h (MFE/MAE 0.71 at
6 bars, decaying to 0.44 by 24 bars). At 1h the ratio is materially better
(1.08 → 1.21). **Trade this at the 1h anchor, not 4h, and expect it to be
regime-fragile.**

**Failure mode.** Expansions terminate in `volatile` 45–60% of the time (§D.4).
You will give back the end of every move unless you exit on the regime flip.

---

### C2 · Pullback within an established trend — T1

**Thesis.** In a trend, a counter-move to an oversold extreme on a faster clock
is an entry, not a reversal.

**Families:** F14 MTF · F6 displacement · F8 boundary · F10 regime

**Build.** This is the category the platform has pre-built for you.
- Signals: **`mtf_pullback_long` / `mtf_pullback_short`** — HTF trend + LTF
  counter-extreme, already synthesised. Allocation 3, `required: true`.
  Note their dependency set is `HIGHER` + `LOWER` + `SYNTHESIS` — **not
  `PRIMARY`** (§3.6). The anchor timeframe plays no part in evaluating them, so
  the higher and lower tables below are the ones that matter.
- Supporting: `htf_ma_aligned_bull` (2), `ltf_rsi_oversold` (2),
  `sr_at_support` (1)
- Section (`rel: higher`): `MA_ALIGN value`, `ADX value`
- Section (`rel: lower`): `RSI14 classifyZone`, `BB_PCT_B value`
- Section (anchor): `VWAP distance`, `EMA20 distance`
- Condition: `ALL[ htf MA_ALIGN is bullish, ltf RSI14 ≤ 35 ]` → UP
- Regime gate: `bull_expansion` (long) / `bear_expansion` (short)

**Evidence.** The trend-plus-short-term-reversal combination is well supported
in the equity literature (short-term reversal: Jegadeesh 1990, Lehmann 1990;
combined with momentum it is a standard multi-factor construction), and it is
the most common discretionary institutional entry pattern. **Highest
recommendation in this document**, because the confluence logic is native,
`required`-flaggable, and needs only 4 columns to feed.

**Failure mode.** Indistinguishable from the start of a reversal until after the
fact. The HTF trend filter is doing all the work — if it is stale, this is a
knife-catching strategy.

---

### C3 · Mean reversion to an anchor — T2

**Thesis.** Price stretched from a reference (VWAP, band, MA) reverts to it,
conditional on the reference being valid — i.e. in a *ranging* regime.

**Families:** F6 displacement · F8 boundary · F5 rank · F10 regime

**Build.**
- Section (anchor): `VWAP distance`, `VWAP distance → rank ordering:far`,
  `BB_PCT_B value`, `BB_TOUCH value`, `RSI14 classifyZone`
- Signals: `bollinger_lower/upper_touch` (3), `rsi_oversold/overbought` (2),
  `stoch_oversold/overbought` (1), `sr_at_support/resistance` (2),
  `bollinger_cci_oversold/overbought` (1)
- Condition: `ALL[ BB_PCT_B ≤ 0.05, ADX ≤ 20, CLOSE efficiency ≤ 0.3 ]` → UP
- Regime gate: `bear_ranging` **only**

**The regime restriction is not optional.** §D.4: `bull_ranging` has the worst
payoff geometry of any regime at every horizon on both timeframes (1h: 0.96 at
1 bar decaying to 0.75 at 12). `bear_ranging` at 1h *improves* with horizon
(0.95 → 1.24 → 1.34). The two ranging regimes are not symmetric and must not be
gated together.

**Evidence.** Short-horizon reversal is a robust cross-asset finding; VWAP is
the institutional execution benchmark, which is precisely why displacement from
it is mean-reverting — desks trade against it by mandate.

**Failure mode.** A range that breaks. The `efficiency ≤ 0.3` clause is the
cheapest available protection: a genuine range is inefficient by construction.

---

### C4 · Volatility compression → expansion (breakout) — T3

**Thesis.** Variance is autocorrelated; compression resolves into expansion, and
the resolution is directional even though the compression is not.

**Families:** F10 regime state machine · F3 efficiency · F8 boundary ·
F4 windowed moments

**Build.**
- Section (anchor): `BB_WIDTH_PCT trajectory w=6`, `BB_WIDTH_PCT rank
  ordering:lo`, `ATR_PCT trajectory`, `PRICE_ZONE value`, `RVOL value`
- Signals: `bollinger_squeeze` (3), `volatility_atr_expanding` (2),
  `sr_resistance_break` / `sr_support_break` (3), `volume_surge` (2)
- Condition: `ALL[ BB_WIDTH_PCT ≤ <p20>, PRICE_ZONE in [breakout high,
  breakdown low], RVOL ≥ 1.5 ]`
- **Regime gate: `volatile`**

**This is the best regime-conditioned setup in the study.** `volatile` is a
one-bar transient (median run length 1, mean 1.1) and **every observed exit from
it went to an expansion** — 8/8 at 4h (75% bull, 25% bear), 8/8 at 1d (100%
bear, in this sample). It also carries the widest absolute favourable excursion
at 4h (mean MFE 3.06% over 6 bars vs 2.54% pooled).

**But note what that does and does not say.** The resolution is reliable; the
*direction* is not (P(up) in `volatile` was 43.8% at 4h, 50.0% at 1h). This is a
volatility-harvest setup, not a directional one. Build it as two agents —
long-side and short-side — both deployed on the `volatile` condition, and let
the price-structure clause pick the side.

**Do not gate on `contraction`.** It never occurred in 480 observed bars.

**Failure mode.** Sample size. n=8 transitions per timeframe is suggestive, not
established. Treat the 100% as "no counterexample yet", not as a probability.

---

### C5 · Liquidity & structure — FVG / order blocks (SMC) — T3

**Thesis.** Unfilled imbalances and origin-of-move zones attract price, and are
the natural place to put a stop *behind* rather than *inside*.

**Families:** F11 point process & survival · F6 displacement · F8 boundary

**Build.**
- Section (anchor): `STRUCT_ZONES count`, `nearestZoneType`, `nearestZoneDist`,
  `nearestZoneRange`, `nearestZoneAge`
- Section (`rel: higher`): `STRUCT_ZONES count`, `nearestZoneDist` —
  **required**: all four `structure_*` signals declare a `HIGHER` + `PRIMARY`
  dependency (§3.6), so an anchor-only table will not feed them
- Signals: `structure_zone_confluence` (3), `structure_ob_approach` (2),
  `structure_fvg_approach` (2), `structure_zone_cluster` (2)
- Tuning: `proximityPct` [0.1,10] default 1 on the two `*_approach` signals;
  `alignmentPct` [0.1,5] default 0.5 on confluence — tighten before raising
  the gate (§3.6)
- Condition: `ALL[ nearestZoneDist ≤ 0.5, STRUCT_ZONES count ≥ 2 ]`
- Regime gate: any except `bull_ranging`

**Evidence — and an honest tension.** This category has the **strongest platform
evidence of any module** (§D.2: agents with `includeStructureZones` won 45.9% vs
28.3%, +0.898/trade edge, and 41% of their trades reached take-profit against
11% for everyone else) and the **weakest academic pedigree** (Smart Money
Concepts is practitioner folklore; there is no peer-reviewed literature
supporting FVG or order-block efficacy). Those two facts have to be held
together.

The most likely honest explanation is not that the zones predict direction, but
that they **supply a stop location**. A stop placed behind a structure zone is
outside the noise band; a stop placed at a fixed 0.6% is inside it (§D.3). If
that is the mechanism, then the benefit is real but transferable — and the
cheaper way to get it is ATR-scaled stops (§E.1).

**Failure mode.** Attribution. 61 of the 61 structure-zone trades came from just
**two agents**, 51 of them from one. This is the thinnest sample carrying the
biggest claim in the study.

---

### C6 · Momentum divergence / exhaustion — T4

**Thesis.** Price making a new extreme while a momentum or flow series does not
signals a failing move.

**Families:** F13 divergence · F2 path · F12 flow

**Build.**
- Section (anchor): `CLOSE trajectory w=8`, `RSI14 trajectory w=8`,
  `MACD trajectory w=8`, `OBV trajectory w=8`
- Signals: all 8 native divergence signals — `rsi_bull/bear_divergence`,
  `macd_bull/bear_divergence`, `mfi_bull/bear_divergence`,
  `volume_obv_bull/bear_divergence`, plus `cvd_bull/bear_divergence`
- Regime gate: ranging, or late expansion

**Evidence.** Popular, mechanically intuitive, and poorly evidenced. There is no
robust academic support for divergence as a standalone entry, and the platform
data is unhelpful — the modules that carry divergence signals (`includeMacd`
−0.187, `includeCvd` −0.577) are among the worst performers in §D.2.

**Recommendation: use divergence as an *exit* or a size-reducer, not an entry.**
It is a good reason to stop pressing a position and a poor reason to open one.

---

### C7 · Order flow & CVD absorption — T2 externally, T4 here

**Thesis.** Signed aggression imbalance predicts short-horizon price movement.

**Families:** F12 cumulative flow · F7 spread · F13 divergence · F3 concentration

**Build.**
- Section (untimed — `SPOT_CVD` is timeless): `SPOT_CVD value`, `SPOT_CVD trajectory`
- Section (timed): `CVD trajectory`, `BUY_PRESSURE value`, `RVOL value`,
  `VOLUME maxShare w=4` @ `rel: lower`
- Signals: `cvd_bullish/bearish` (2), `cvd_bull/bear_divergence` (2)

**Evidence.** Order-flow imbalance is one of the best-established short-horizon
predictors in market microstructure (Cont, Kukanov & Stoikov 2014, and a large
subsequent literature) — **at horizons of seconds to minutes.**

**The platform data contradicts it here, and the reason is probably horizon.**
`includeCvd` was the third-worst module (−0.577/trade). OFI decays fast; a 1h
anchor with a multi-hour hold is far outside the window where flow imbalance
carries information. If you want this category, run it at a 5m or 15m anchor
with a correspondingly short horizon — and note that the platform's own
`priceBasis` design agrees, since the flow signals evaluate on CLOSED bars.

**Where it *does* belong at 1h:** as `VOLUME maxShare` — concentration, not
direction. Distinguishing one-print liquidations from distributed accumulation
survives aggregation in a way that CVD direction does not.

---

### C8 · Perp–spot basis: leverage-led vs spot-led — T2, **unexploited**

**Thesis.** A move led by spot buying is organic and persists; a move led by
perpetual leverage with no spot confirmation is fragile and mean-reverts.

**Families:** F7 spread/basis · F10 classification

**Build.** Almost trivially — the platform computes the whole thesis and hands
it to you as a label:
- Section (untimed): `PERP_SPOT_FLOW value`, `PERP_SPOT_STRENGTH value`,
  `PERP_SPOT_CONFIRMS value`, `SPOT_CVD value`, `FLOW_ALIGN value`
- Signals: `flow_perp_spot_bull_divergence` (3),
  `flow_perp_spot_bear_divergence` (3)
- Conditions:
  - `ALL[ PERP_SPOT_FLOW is spot_led_accumulation, PERP_SPOT_STRENGTH is high ]` → **UP**
  - `ALL[ PERP_SPOT_FLOW is perp_led_fragile ]` → **NEITHER** (a veto, not a short)

**Evidence.** This is standard derivatives-desk analysis and the mechanism is
well understood: perp-led rallies are funded by leverage that must eventually be
paid for or liquidated, whereas spot-led moves reflect balance-sheet demand. The
`confirmed_bull` / `perp_led_fragile` / `spot_led_accumulation` vocabulary maps
onto that distinction exactly.

**Zero agents use `includePerpSpotFlow`.** Combined with a strong prior
mechanism and a native signal pair, this is the largest gap between evidence
quality and exploitation on the platform. **Highest-value unexplored category.**

---

### C9 · Positioning & liquidation cascades — T2 externally, T4 here

**Thesis.** The joint behaviour of price and open interest identifies who is
being forced to act.

**Families:** F10 classification · F2 velocity · F5 rank

**Build.**
- Section (untimed): `OI_PX_REGIME value`, `OI_VELOCITY value`,
  `OI_CHG value`, `OI_CHG rank`, `OI trajectory`
- Signals: `oi_divergence_bull` (2), `oi_divergence_bear` (2), `oi_surge` (1)
- Conditions:
  - `OI_PX_REGIME is 'short covering'` → UP (squeeze in progress)
  - `OI_PX_REGIME is 'long liquidation'` → DOWN (forced supply)

**Evidence.** The price×OI four-quadrant is textbook futures analysis with a long
institutional history. **But `includeOpenInterest` was the single worst-performing
module in the study** (−0.690/trade, 25.6% win rate). Either the classification
is being misread by the models, or the signal is real and the horizon is wrong,
or the module's presence correlates with something else. On current evidence, do
not build a primary strategy here.

**Where it earns its place:** as a *veto*. `long liquidation` is a genuine
reason not to be long, expressed as one clause resolving to NEITHER.

---

### C10 · Funding carry & crowding extremes — T2

**Thesis.** Funding is both a cash flow and a crowding gauge. Extremes mark
positioning that must eventually unwind.

**Families:** F7 basis · F10 classification · F5 rank · F4 aggregate

**Build** (must be its own untimed section — timeframe-inertia law):
- `FUNDING_RATE value`, `FUNDING_RATE aggregate w=8`, `FUNDING_RATE rank`,
  `FUNDING_ANN value`, `FUNDING_LABEL value`
- Signals: `funding_extreme_negative` (3, long), `funding_extreme_positive`
  (3, short), `funding_rate_flipping` (2)
- Condition: `ALL[ FUNDING_LABEL in [elevated, extreme] ]` → contrarian verdict

**Evidence.** Carry is a documented cross-asset return factor (Koijen,
Moskowitz, Pedersen & Vrugt 2018, *JFE*), and the perpetual basis trade is the
most heavily institutionally traded strategy in crypto. Platform data is
mildly supportive: `includeFundingRates` was the third-best module (+0.315).

**Current-state caveat, measured today.** Across 78 symbols the median funding
is **0.68% annualised**, p90 is 1.37%, and the maximum is 10.80%; 22% of the
universe is negative. **There is almost nothing to harvest right now.** Build
this as a *crowding filter* — a reason to fade an extended move — not as a carry
harvest. Revisit if median annualised funding exceeds ~10%.

---

### C11 · Cross-sectional relative value & dispersion — T1 externally

**Thesis.** Rank assets against each other and trade the extremes of the
cross-section; relative strength is more stable than absolute direction.

**Families:** F5 rank ★ · F7 spread · F1 level

**Build.**
- `coinSelection: {mode: 'ranked', limit: 50, category: <sector>}` — the
  universe *is* the strategy here
- Section: every column that supports `rank` — `RSI14 rank`, `ATR_PCT rank`,
  `OI_CHG rank`, `RVOL rank`, `VWAP distance → rank ordering:far`
- Signals: `comparison_sector_momentum` (3),
  `comparison_sector_divergence` (2), `comparison_btc_decorrelation` (2)

**Why this venue is unusually good for it.** The universe is **multi-asset** —
alongside BTC/ETH/SOL it lists AAPL, GOOGL, MSFT, TSLA, MSTR, COIN, MU, AMD,
HIMS, plus GOLD, COPPER, CL, BRENTOIL, NATGAS. The `category` enum
(CRYPTO / L1 / MEMES / DEFI / TRADFI / STOCKS / INDICES / COMMODITIES) is a real
sector taxonomy, and `coinSelection` makes sector-scoped ranking a one-field
change.

**Evidence.** Cross-sectional momentum has the strongest academic pedigree of
anything in this document (Jegadeesh & Titman 1993 and thirty years of
replication; crypto-specific: Liu, Tsyvinski & Wu 2022). **Platform data
disagrees** — `includeRelativeStrength` scored −0.570. But note that module is
the *comparison-basket* read, not the `rank` transform, and no agent in the
sample used `coinSelection` ranking as a strategy device.

**Measured today:** 24h cross-sectional dispersion (p90−p10) is 3.59pp and only
**10% of symbols have all four PPO timeframes aligned** — 41 of 78 are split
2-of-4. Dispersion is present; term-structure agreement is rare, which is itself
a tradeable observation.

---

### C12 · Session & calendar structure — T1 externally, **entirely unexploited**

**Thesis.** Equity and commodity perpetuals trade 24/7 while their underlying
cash markets do not. That mismatch creates structurally predictable behaviour —
overnight drift, session-open volatility, weekend gap risk — that has nothing to
do with any indicator.

**Families:** F10 state · F14 hierarchy · plus the **deployment-time** primitive

**Build.** This one is not a strategy layer at all — it lives in the radar:
```
upsert_radar_deployment(coinId: 'AAPL', slots: [
  { agentId: <cash-session agent>, priority: 1,
    conditions: [{kind:'time_window', fromHour:14, toHour:21, days:[1,2,3,4,5]}] },
  { agentId: <overnight agent>,    priority: 2,
    conditions: [{kind:'time_window', fromHour:0,  toHour:13, days:[1,2,3,4,5]}] },
  { agentId: <flat//idle agent>,   isDefault: true }
])
```
Note the constraint: `fromHour < toHour`, same-day UTC only, no overnight wrap —
so an overnight window must be expressed as two slots or as the pre-open block.

**Evidence.** The overnight/intraday return decomposition is among the most
robust anomalies in equity finance (Lou, Polk & Skouras 2019, *JFE*, "A tug of
war"; a large literature on the overnight premium). It requires no forecasting
skill — only a clock.

**No agent in the population uses deployment-time conditioning at all.** Given
that the venue lists ~15 equity and 5 commodity perps, this is the second-largest
unexploited structural feature after C8.

---

### C13 · Crowd fade, accuracy-weighted — T3, platform-unique

**Thesis.** The Market Grid prediction game generates a genuine crowd forecast
*with realised accuracy attached*. That lets you do what sentiment indicators
normally cannot: separate the crowd that is right from the crowd that is wrong.

**Families:** F7 spread · F5 rank · F10 classification

**Build** (untimed section):
- `CROWD_UPBIAS value`, `CROWD_ACC value`, `CROWD_PICK value`,
  `CROWD_CAPT value`, plus the four `_LIVE` variants for the in-flight session
- `SMART_RETAIL value`, `CAPTAIN_CONF value`, `CONFIDENCE value`,
  `FLOW_ALIGN value`
- Conditions:
  - `ALL[ CROWD_UPBIAS ≥ 75, CROWD_ACC ≤ 45 ]` → **DOWN** (fade the wrong crowd)
  - `ALL[ CROWD_UPBIAS ≥ 75, CROWD_ACC ≥ 60 ]` → **UP** (follow the right crowd)
  - `SMART_RETAIL is 'hidden accumulation'` → UP

**The `CROWD_UPBIAS` × `CROWD_ACC` interaction is the whole category.** Crowd
direction alone is noise; crowd direction conditioned on crowd track record is
the smart-money/dumb-money split done with actual data. `SMART_RETAIL` already
encodes a version of it, and the two-clause condition above expresses the rest.

**Evidence.** No external literature applies — this dataset does not exist
anywhere else. Platform data is mildly negative (`includeCrowdIntelligence`
−0.092, `includeCvdCrowdConvergence` −0.114) but on 46 and 47 trades
respectively across 4–5 agents. **Effectively untested.** Given that it is
unavailable to anyone not on this platform, it is the most defensible source of
a durable edge if it works at all.

---

### C14 · Regime-switching meta-allocation — the composition layer

Not a trade category. The layer where the other thirteen compose.

**Families:** F10 state machine · plus `upsert_radar_deployment` /
`upsert_deployment_policy`

**The measured state machine** (BTC 4h, 296 bars, 46 runs):

```
                    ┌──────────────────────────────────────┐
                    │            volatile                  │
                    │   median run 1 bar — a transient     │
                    └───────┬──────────────────────┬───────┘
                       75%  │                      │  25%
                            ▼                      ▼
              ┌──────────────────┐      ┌──────────────────┐
              │  bull_expansion  │      │  bear_expansion  │
              │  median run 5    │      │  median run 8    │
              └────┬──────┬──────┘      └─────┬──────┬─────┘
                45%│   27%│                60%│   20%│
                   ▼      ▼                   ▼      ▼
              volatile   ┌──────────────────────┐  bear_ranging
                         │    bull_ranging      │
                         │    median run 4      │
                         └──────┬───────────────┘
                            80% │        ▲
                                ▼        │ 73%
                         ┌──────────────────────┐
                         │    bear_ranging      │
                         │    median run 4      │
                         └──────────────────────┘
```

**Three exploitable properties:**

1. **`volatile` is a pure transition hub.** It never persists (median 1 bar) and
   always resolves into an expansion. Deploy the C4 breakout pair here.
2. **The ranging pair oscillates.** `bull_ranging → bear_ranging` 80%,
   `bear_ranging → bull_ranging` 73%. This is itself mean-reverting — and it is
   why C3 must be gated on `bear_ranging` only, since that is the leg with the
   favourable payoff geometry.
3. **Expansions terminate in `volatile`** 45% (bull) and 60% (bear) of the time.
   That is your exit signal for C1/C2, and it is observable one bar early.

**Deployment mapping:**

| Regime | Share of 4h bars | Agent on duty | Category |
|---|---:|---|---|
| `volatile` | 3% | breakout pair (long + short) | C4 |
| `bull_expansion` | 25% | trend / pullback, 1h anchor | C1, C2 |
| `bear_expansion` | 19% | trend / pullback — **best payoff geometry** | C1, C2 |
| `bear_ranging` | 30% | mean reversion | C3 |
| `bull_ranging` | 24% | **flat — sit out** | — |
| `contraction`, `fallback` | 0% | never observed; do not configure | — |

**Caveat that matters.** Median run length is 4–8 bars and the regime flips
roughly every 6.4 bars. On a 4h grid that is ~26 hours of stability. Regime-gated
deployment must tolerate frequent switching, and any strategy whose thesis needs
more than ~a day of regime persistence will be interrupted.

---

## Part C — The category × family matrix

`●` = primary, load-bearing · `○` = supporting · blank = not used

| | F1 lvl | F2 path | F3 shape | F4 mom | F5 rank | F6 disp | F7 spread | F8 bound | F9 event | F10 state | F11 struct | F12 flow | F13 div | F14 mtf | F15 bool | F16 score |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| **C1** Trend continuation | ○ | ● | ● | ○ | | ○ | | | ○ | ● | | | | ● | ○ | ● |
| **C2** Pullback in trend | ○ | ○ | | | | ● | | ● | | ● | | | | ● | ● | ● |
| **C3** Mean reversion | ○ | | ● | ○ | ● | ● | | ● | | ● | | | | | ● | ● |
| **C4** Compression→expansion | | ● | ● | ● | ● | | | ● | ○ | ● | | ○ | | | ● | ● |
| **C5** Structure / SMC | ○ | | | | | ● | | ● | | ○ | ● | | | | ● | ● |
| **C6** Divergence | | ● | | | | | ○ | | | ○ | | ● | ● | | ○ | ● |
| **C7** Order flow / CVD | | ● | ● | | | | ● | | | | | ● | ● | | ○ | ● |
| **C8** Perp–spot basis | ○ | ○ | | | | | ● | | | ● | | ● | ○ | | ● | ● |
| **C9** Positioning / OI | ○ | ● | | | ● | | | | | ● | | ○ | ○ | | ● | ○ |
| **C10** Funding carry | ● | ○ | | ● | ● | | ● | | ○ | ● | | | | | ● | ● |
| **C11** Cross-sectional RV | ● | | | | ● | ○ | ● | | | | | | | | ○ | ● |
| **C12** Session structure | | | | | | | | | | ● | | | | ● | ● | |
| **C13** Crowd fade | ● | | | | ● | | ● | | | ● | | | | | ● | ○ |
| **C14** Regime meta | | ○ | | | | | | | | ● | | | | ● | ● | |

**Reading the matrix.**

- **F10 (state classification) and F16 (scoring) are load-bearing almost
  everywhere.** They are the platform's spine — 13 classification metrics and a
  weighted-vote gate. Any category you build passes through both.
- **F3 (path-shape: `efficiency`, `maxShare`) is primary in four categories and
  supports two more**, yet appears in no committed documentation and in only one
  platform section. It is the highest-leverage under-used operator.
- **F11 (structure point-process) is used by exactly one category** — but that
  category has the strongest platform performance data. It is narrow and deep.
- **F5 (rank) is what makes multi-asset work.** Any category meant to run over
  a 50-coin ranked universe rather than a handful of explicit tickers needs it.
- **C12 uses almost no families at all.** Its edge is structural — a clock, not
  a computation — which is precisely why it is cheap and why nobody has taken it.

---

## Part D — What the platform's own data says

All figures probed live 2026-08-06 against `battlegrid v11.0.0`, read-only.

### D.1 The population baseline

| Measure | Value |
|---|---:|
| Agents in explorer / with closed trades | 38 / 23 |
| Pooled closed trades | 776 (715 with full trade detail) |
| Population win rate | **30.8%** |
| Total net P&L | **−$162.14** |
| Average per trade | **−$0.209** |
| Profitable agents | **6 of 23 (26%)** |
| Realised payoff ratio (avg win ROE ÷ avg loss ROE) | 15.32% ÷ 9.33% = **1.64** |
| Break-even win rate at that payoff | **37.9%** |
| Expectancy | **−1.99% ROE per trade** |

**The unconditional benchmark.** Sampling 2,820 coin-bars across 30 symbols and
measuring whether a random entry reaches its target before its stop:

| Anchor | Stop | Target | Win rate | Needed to break even | Gap |
|---|---:|---:|---:|---:|---:|
| 1h | 1.5% | 1.5R | **30.6%** | 40.0% | −9.4pp |
| 1h | 2.0% | 1.0R | **44.2%** | 50.0% | −5.8pp |
| 1h | 1.0% | 1.5R | 28.9% | 40.0% | −11.1pp |
| 4h | 2.0% | 1.5R | 26.4% | 40.0% | −13.6pp |
| 4h | 1.0% | 1.5R | 19.8% | 40.0% | −20.2pp |

The live population wins 29.8%. Random entry at the population's median
configuration wins 30.6%. **The signals are not adding measurable value**, and
every configuration is below break-even before any skill is applied — which
means the geometry has to be fixed before signal quality can even be measured.

### D.2 Which data modules correlate with survival

Edge = (P&L per trade with the module on) − (P&L per trade with it off).

| Module | On: WR | On: P/T | Off: WR | Off: P/T | **Edge** |
|---|---:|---:|---:|---:|---:|
| `includeStructureZones` | 45.9% | +0.563 | 28.3% | −0.335 | **+0.898** |
| `includeSubTimeframe` | 31.0% | +0.214 | 30.7% | −0.386 | **+0.600** |
| `includeFundingRates` | 34.5% | +0.083 | 30.5% | −0.231 | +0.315 |
| `includeTrendStrength` | 31.5% | −0.075 | 30.3% | −0.301 | +0.226 |
| `includeSupportResistance` | 29.9% | −0.059 | 31.2% | −0.265 | +0.205 |
| `includeMfi` | 25.7% | −0.055 | 32.2% | −0.251 | +0.196 |
| `includeBollingerBands` | 40.6% | −0.080 | 29.9% | −0.220 | +0.140 |
| … | | | | | |
| `includeRegimeContext` | 29.6% | −0.244 | 31.8% | −0.179 | −0.065 |
| `includeMacd` | 29.6% | −0.332 | 31.4% | −0.145 | −0.187 |
| `includeRelativeStrength` | 29.3% | −0.554 | 31.8% | +0.017 | −0.570 |
| `includeCvd` | 29.4% | −0.654 | 31.2% | −0.077 | −0.577 |
| `includeOpenInterest` | 25.6% | −0.649 | 33.7% | +0.041 | **−0.690** |
| `includeMtfConfluence` | — | — | — | — | **never used (0/23)** |
| `includePerpSpotFlow` | — | — | — | — | **never used (0/23)** |

**Attribution warning, stated plainly.** The `includeStructureZones` bucket is
61 trades from **two agents**, 51 of them from one (`Market Predator`, +45.1% WR,
+$0.98/trade). The direction of the finding is consistent and the mechanism is
plausible, but this is one agent carrying the headline. Treat it as a hypothesis
worth testing, not an established result.

### D.3 Exit mechanics — the geometry problem

| Close reason | n | Share | Win rate | Median life |
|---|---:|---:|---:|---:|
| STOP_LOSS | 529 | **74%** | 15.5% | 1.5 h |
| TAKE_PROFIT | 99 | 14% | 89.9% | 3.0 h |
| MARKET_CLOSE | 87 | 12% | 48.3% | 3.2 h |

| | Median |move %| |
|---|---:|
| at STOP_LOSS | **0.623%** |
| at TAKE_PROFIT | 2.637% |

Now compare against the measured noise floor on a 1h anchor:

| Horizon | Mean adverse excursion |
|---|---:|
| 1 bar | **0.47%** |
| 3 bars | 0.85% |
| 6 bars | 1.25% |
| 12 bars | 1.83% |

**A 0.623% stop is 1.3× the average single-bar adverse excursion.** It is inside
the noise by construction, which is the arithmetic cause of the 74% stop-out
rate. This is the most important number in the study.

Configuration effects, all pointing the same way:

| Setting | n | WR | P/T | Median life | TP rate |
|---|---:|---:|---:|---:|---:|
| trailing **off** | 127 | 34.6% | +0.061 | 4.3 h | **31%** |
| trailing **on** | 588 | 28.7% | −0.291 | 1.5 h | 10% |
| time-decay **off** | 305 | 33.4% | −0.148 | 2.1 h | 19% |
| time-decay **on** | 410 | 27.1% | −0.288 | 1.5 h | 10% |
| `maxStopLossPct` = 10 | 97 | 39.2% | **+0.360** | 5.5 h | **35%** |
| `maxStopLossPct` = 5 | 542 | 28.4% | −0.302 | 1.6 h | 10% |

Every positive bucket shares one property: **the trades lived longer and reached
their target more often.** The post-entry management machinery — trailing stops
and time decay — is force-closing positions at ~1.5 h, before the payoff
geometry has had time to become favourable.

**A survivorship check, because the obvious read is wrong.** "Trades that last
longer win" is largely selection: a trade only survives if it hasn't been
stopped. Within stop-outs *only*, longer duration is **worse** (−5.91% ROE at
0–1 h, −8.61% at 12 h+). So do not conclude "hold longer and you will win."
The defensible claim is narrower and rests on the unconditional baseline, not
the agent cross-section: **a stop inside the single-bar noise band converts
ordinary noise into realised losses, and widening it past the 3–6 bar adverse
excursion is mechanically justified.**

### D.4 Regime conditioning

Forward payoff geometry — mean favourable excursion ÷ mean adverse excursion, by
regime and holding horizon. 30 coins, 2,820 joined bars per timeframe.

**1h anchor** (ratio improves with horizon):

| Regime | h=1 | h=3 | h=6 | h=12 | h=24 |
|---|---:|---:|---:|---:|---:|
| `bear_expansion` | 1.02 | 1.11 | 1.21 | 1.23 | **1.53** |
| `bear_ranging` | 0.95 | 0.99 | 1.08 | 1.24 | 1.34 |
| `bull_expansion` | 1.00 | 1.08 | 1.08 | 1.14 | 1.21 |
| `volatile` | 0.86 | 0.93 | 1.04 | 1.07 | 1.16 |
| `bull_ranging` | 0.96 | 0.87 | 0.82 | **0.75** | 0.83 |
| *pooled* | 0.97 | 1.00 | 1.02 | 1.04 | 1.13 |

**4h anchor** (ratio *decays* with horizon, except bear_expansion):

| Regime | h=1 | h=3 | h=6 | h=12 | h=24 |
|---|---:|---:|---:|---:|---:|
| `bear_expansion` | 1.03 | 1.08 | 1.12 | 1.15 | **1.29** |
| `volatile` | 1.11 | 0.86 | 0.89 | 1.21 | 1.04 |
| `bear_ranging` | 0.97 | 0.89 | 0.81 | 0.76 | 0.70 |
| `bull_ranging` | 0.90 | 0.86 | 0.79 | 0.74 | 0.49 |
| `bull_expansion` | 0.91 | 0.79 | 0.71 | 0.63 | **0.44** |
| *pooled* | 0.97 | 0.91 | 0.87 | 0.84 | 0.73 |

**Four conclusions:**

1. **Trade the 1h anchor, not 4h.** Pooled payoff geometry at h=12 is 1.04 vs
   0.84. The default `strategyTimeframe` of 1h is correct and every agent in the
   sample already uses it.
2. **`bull_ranging` is bad everywhere.** Worst or near-worst at every horizon on
   both timeframes. Sit it out — that is 24% of bars you should not be trading.
3. **`bear_expansion` is the best state on both timeframes.** In a falling
   market that is partly a directional artefact, but the ratio is
   excursion-based and improves with horizon on both clocks, which is harder to
   explain away.
4. **Your required R:R must be below the state's available ratio.** Demanding
   1.5R in a state offering 1.04R is not conservative — it is a guarantee of a
   sub-break-even hit rate. Either select states above 1.2 (bear_expansion,
   bear_ranging at long horizons) or drop the target to ~1.0R.

### D.5 Behaviour and conviction

| Axis | Best | Middle | Worst |
|---|---|---|---|
| `risk` | CONSERVATIVE **+0.158** | MODERATE −0.264 | AGGRESSIVE −0.345 |
| `outlook` | PESSIMIST **+0.263** | REALIST −0.123 | OPTIMIST −0.344 |
| `conviction` | CAUTIOUS **+0.206** | MEASURED −0.191 | BOLD −0.336 |

All three monotone, all three favouring the restrictive setting.

**Stated conviction is inversely predictive:**

| Trade conviction | n | Win rate | Avg P&L |
|---:|---:|---:|---:|
| 0.4 | 31 | 32.3% | **+0.190** |
| 0.5 | 124 | **39.5%** | +0.136 |
| 0.6 | 345 | 27.5% | −0.354 |
| 0.7 | 147 | 31.3% | −0.216 |
| 0.8 | 58 | **15.5%** | **−0.608** |

The model's own confidence is anti-correlated with being right. This argues
against raising `minTradeConviction` as a quality filter — it is not measuring
quality. (Confounded across agents with different conviction scales; directionally
consistent enough to act on cautiously.)

**Aggregate score, by contrast, *is* mildly predictive** — 65%+ average
aggregate scored 35.4% WR / −0.043 P/T against 28.0% / −0.338 for the 55–60%
bucket. Raise `minAggregateScore`; do not raise `minTradeConviction`.

### D.6 Current market state (2026-08-06 snapshot)

| Measure | Value |
|---|---|
| Universe breadth (4h PPO) | 25.6% bullish / 74.4% bearish |
| BTC 4h regime | `bull_ranging`, medium conviction, 16 bars held |
| Median funding, annualised | 0.68% (p90 1.37%, max 10.80%) |
| Negative-funding symbols | 22% |
| Median OI ÷ 24h volume | 2.62 |
| 24h cross-sectional dispersion | 3.59pp (p90−p10) |
| PPO term-structure fully aligned | **10%** of symbols (41/78 split 2-of-4) |

Two implications: carry (C10) has little to harvest right now, and multi-
timeframe momentum agreement (C1) is currently rare — which makes the `mtf_*`
synthesis signals a genuinely selective filter rather than a permissive one.

---

## Part E — The benchmark

### E.1 Benchmark v0 — "fix the geometry first"

This is deliberately unclever. It changes no signals from the platform norm; it
changes only what §D says is broken. Its purpose is to be the baseline every
later idea must beat.

```yaml
# Strategy
timeframe:            1h                # D.4: pooled payoff 1.04 vs 0.84 at 4h
regimeAutoDerive:     true
regimeTimeframe:      4h
coinSelection:        {mode: ranked, limit: 25, category: CRYPTO}

sections:
  - includePriceAction                  # mandatory
  - includeSubTimeframe                 # D.2 edge +0.600 (efficiency + maxShare)
  - includeStructureZones               # D.2 edge +0.898 — the hypothesis under test
  - includeTrendStrength                # D.2 edge +0.226
  - includeVolatility                   # for the ATR read
  - includeHigherTimeframe              # feeds the htf_* signals
  # deliberately excluded: OpenInterest (−0.690), Cvd (−0.577),
  # RelativeStrength (−0.570), Macd (−0.187), Stochastic (−0.122)

conditions:
  - key: NOT_BULL_RANGING               # D.4: worst regime at every horizon
    definition: {NOT: [REGIME_TREND is 'ranging' AND REGIME_MOM is 'bullish']}
    verdict: NEITHER

rules:                                  # keep the scorecard small and legible
  mtf_pullback_long:    {allocation: 3, required: false}
  mtf_pullback_short:   {allocation: 3, required: false}
  mtf_aligned_bull:     {allocation: 2}
  mtf_aligned_bear:     {allocation: 2}
  trend_adx_trending:   {allocation: 2}
  structure_zone_confluence: {allocation: 2}
  volume_surge:         {allocation: 1}

minAggregateScore:    0.65              # D.5: the 65%+ bucket outperformed
minRequiredCount:     0
minAtrPct:            0.5

# Agent
behavior:             {risk: CONSERVATIVE, outlook: PESSIMIST, conviction: CAUTIOUS}
                                        # D.5: all three axes monotone
minRiskRewardRatio:   1.0               # D.4: states offer ~1.04R at h=12.
                                        # Do not demand 1.5R from a 1.04R market.
minStopLossPct:       1.5               # D.3: > the 6-bar adverse excursion (1.25%)
maxStopLossPct:       3.0               # D.3: 0.62% stops caused the 74% stop-out rate
maxLeverage:          3
maxDailyTrades:       4                 # D.1: over-trading is the population failure
positionManagement:   {enabled: false}  # D.3: trailing on → 1.5h life, 10% TP rate
                                        #      trailing off → 4.3h life, 31% TP rate
sizingStrategy:       VOLATILITY_AUTO
tradingMode:          APPROVAL_REQUIRED # start supervised, always
```

**The five changes that matter**, each traceable to a measurement:

| Change | From (population median) | To | Evidence |
|---|---|---|---|
| Stop floor | ~0.62% realised | **1.5%** | D.3 — 6-bar MAE is 1.25% |
| Target | 1.5R | **1.0R** | D.4 — states offer 1.04R at h=12 |
| Position management | on (trailing + decay) | **off** | D.3 — 1.5h vs 4.3h life, 10% vs 31% TP |
| Regime gate | none | **exclude `bull_ranging`** | D.4 — worst at every horizon |
| Daily trades | 10 | **4** | D.1 — expectancy is negative; trade less |

**What success looks like.** Beating the random-entry baseline for its
configuration. At a 1.5% stop and 1.0R target on a 1h anchor, random entry wins
**42.6%**. Break-even is 50%. So benchmark v0 needs a **>50% win rate** to be
profitable and **>42.6%** merely to prove the signals do anything at all. State
that target before you start, and measure against it.

### E.2 How to measure without a backtest API

There is no backtest tool. The read surface is thin on history — `get_coin_candles`
caps at 100 closed candles, `get_coin_performance_history` at 100 points,
`get_regime_history` at 500 bars. That rules out a conventional backtest and
makes the measurement design part of the work.

Four tools do most of it, and two of them are free:

| Tool | What it gives | Cost |
|---|---|---|
| **`get_agent_coin_qualification`** | Runs *your agent's own gates* against live coins — candidate levels, aggregate score, required-signal count, ATR% floor, and **which gate failed first** — with **no LLM call** | free |
| **`simulate_aggregate_score`** | Stateless scorecard what-if: weights × scores → aggregate, attribution, `wouldRoute` | free |
| `get_coin_signal_preview` | Every evaluated signal for a coin with its `triggered` flag, dominant bias, aggregate %, conflict flag; `agentId` overlays your weighting | free, per coin |
| `preview_strategy_report` | The literal report text an agent will receive, with live values | free, 15s deadline |

**`get_agent_coin_qualification` is the objective function.** It lets you sweep
gate settings against the live universe at zero marginal cost and see exactly
which constraint is binding. Any optimiser you build should call it first and
the LLM last.

**The protocol, since history is unavailable:**

1. **Forward-record.** On a schedule, snapshot `get_coin_signal_preview` for the
   universe plus `get_coin_candles`. Persist both. After ~2 weeks you own the
   joined dataset the API will not give you retroactively.
2. **Score offline.** Replay recorded signal states through
   `simulate_aggregate_score` to tune allocations without touching a live agent.
   Two caveats from §3.6: the simulator declares `score ∈ [0,1]` but nine signals
   document examples up to **2.0**, so it is a *lower bound* wherever those are
   weighted; and because scoring is graded, sweep each signal's own `threshold`
   (39 are tunable, with bounds) alongside `minAggregateScore` — they are
   substitutes, and the threshold is usually the sharper instrument.
3. **Qualify.** Sweep `minAggregateScore` / `minRequiredCount` / `minAtrPct`
   through `get_agent_coin_qualification` and record the first-failing gate
   distribution — that tells you which knob is actually binding.
4. **Mine the population.** `get_agent_explorer` +
   `get_public_agent_realized_trades` + `get_public_agent_signal_performance`
   is a live cross-sectional dataset of other people's configurations and
   outcomes. It is how every number in §D was produced, and it refreshes for
   free.
5. **Then** run APPROVAL_REQUIRED for a fixed trade count before enabling
   FULL_EXECUTION.

**Sample-size discipline.** At an expected win rate near 45% you need roughly
150–200 trades before a 5pp difference is distinguishable from noise. The
best-performing agent in the entire population has 51 trades. **Nothing in
Part D — including the structure-zone finding — is statistically established.**
Size your confidence accordingly.

---

## Part F — Gaps, caveats, and what could not be verified

**Statistical power is the binding constraint on everything in Part D.**
23 agents, 776 trades, 30 coins, ~2 weeks of joined bars, one market regime
(a downtrend: pooled 6-bar forward return −0.26% at 4h). Every cross-sectional
finding is a hypothesis. The directional consistency across independent cuts —
behaviour axes, exit mechanics, regime geometry — is what makes them worth
acting on, not the individual p-values, which do not exist.

**Specific limitations:**

- **Market-condition confound.** The whole sample sits in a falling market with
  74% bearish breadth. `bear_expansion` looking best and `bull_expansion` worst
  may be period-specific. The excursion-ratio framing is more robust than the
  raw forward return, but not immune.
- **Attribution.** The headline module finding (structure zones) is 2 agents,
  and 84% of its trades are one agent.
- **No condition-layer evidence.** No agent in the sample uses `conditions` at
  all, so the deterministic layer — arguably the most powerful part of the
  platform — is entirely untested. Everything in Part B that leans on F15 is
  reasoned, not measured.
- ~~`get_strategy_signal_definition` was not swept.~~ **Closed** — swept
  2026-08-06, 84/84 answered. See §3.6. It found three things that changed
  advice elsewhere in this document: signal scores are graded with a steep
  gradient near the threshold, nine signals exceed the simulator's declared
  `[0,1]` range, and the four `structure_*` signals need a higher-timeframe
  table that C5's original spec omitted.
- **One thing the sweep raised and did not settle.** The four `regime_*` signals
  declare a `REGIME` dependency, while `rel: regime` resolves to `null` on every
  anchor for *columns*. Whether the signal path resolves the regime timeframe by
  a route the column path does not is unverified — establish it before weighting
  those four.
- **Candle history caps at 100 bars.** Any claim needing more than ~4 days at 1h
  or ~16 days at 4h cannot currently be checked.
- **`rel: regime` is inert.** It resolves to `null` for every anchor, so
  regime-timeframe columns silently produce nothing. Use absolute timeframes.
- **The authoring vocabulary is not recorded anywhere.** The surface artifact is
  current (v11.0.0, freshness gate green) but records payload *shapes*, so the
  transform ids, budget numbers and enabled-timeframe list this document relies
  on exist in no committed file — they were read live and cannot be re-checked
  from `docs/`. Filed as `the-surface-map-is-two-majors-stale` (kept under its
  original id; the item's own headline was corrected).

**What I would test next, in order:**

1. **C8 (perp–spot basis)** — strongest prior mechanism, native signals, zero
   competition. Cheapest real test available.
2. **The stop-geometry fix alone**, holding signals constant. If §D.3 is right,
   this moves the needle more than any signal change and it is a two-field edit.
3. **C12 (session structure)** on the equity perps — requires no forecasting,
   only a deployment clock.
4. **C13 (crowd × accuracy)** — unavailable to anyone off-platform, therefore
   the most durable edge if it exists.

---

## Appendix — Reproduction

All data was gathered with read-only tools, filtered by the server's own
`readOnlyHint` annotation rather than by tool name, so no write or destructive
tool could be reached.

| Dataset | Tools | Volume |
|---|---|---|
| Vocabulary | `list_strategy_categories`, `list_strategy_vocabulary` × 10 | 84 metrics, 16 transforms, budgets |
| Signals | `list_strategy_signals` | 84 signals, 19 modules |
| Signal definitions | `get_strategy_signal_definition` × 84 | 84/84; params, bounds, dependencies, scoring examples |
| Agent cross-section | `get_agent_explorer` × 3 sorts | 38 agents |
| Realised trades | `get_public_agent_realized_trades`, `get_public_agent_signal_performance` | 715 trades, 20 agents |
| Regime series | `get_regime_history`, `get_regime_snapshot` | 296 bars 4h + 184 bars 1d BTC; 30 coins × 2 TFs |
| Price series | `get_coin_candles` | 30 coins × 100 bars × 2 TFs |
| Cross-section | `get_macd_heatmap`, `get_top_ranked_coins` | 78 symbols |
| Risk bounds | `get_trading_config_catalog` | 5 presets, 18 bounds |

**Literature referenced** (external evidence tiers only):
Moskowitz, Ooi & Pedersen (2012) *Time Series Momentum*, JFE ·
Jegadeesh & Titman (1993) *Returns to Buying Winners and Selling Losers*, JF ·
Liu, Tsyvinski & Wu (2022) *Common Risk Factors in Cryptocurrency*, JF ·
Koijen, Moskowitz, Pedersen & Vrugt (2018) *Carry*, JFE ·
Cont, Kukanov & Stoikov (2014) *The Price Impact of Order Book Events*, JFM ·
Lou, Polk & Skouras (2019) *A Tug of War: Overnight vs Intraday Expected
Returns*, JFE · Kaufman (1995) *Smarter Trading* (efficiency ratio).
