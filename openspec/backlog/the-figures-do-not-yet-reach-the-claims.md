---
id: the-figures-do-not-yet-reach-the-claims
title: Forward returns exist and the strategy-analysis claims still read "no forward data"
type: feature
status: open
priority: p3
created: 2026-08-15
updated: 2026-08-16
change: ""
capability: signal-recording
github: "282"
blocked_by: []
tags: [signals, evidence, analysis]
---

# The figures do not yet reach the claims

## What

`the-record-answers-forward` (from #94) built the analysis layer: forward
returns per triggered signal, per bias, per conflict flag, with sample
sizes, on `/recorder/analysis`. The third clause of #94's What — *attach
any of it to the claims in the operator's strategy analysis so their
evidence tier can move off "no forward data"* — is deliberately not built:
it consumes this layer's output and is its own design problem (which claim
maps to which figure, and what sample size moves a tier).

## Why it matters

The item's own words: the record is the prerequisite, not the product. The
analysis page makes the figures readable; this item is where they start
doing argumentative work against the operator's documented strategy claims
(`_PM/TRADE_CATEGORIES_AND_MATHEMATICAL_FAMILIES.md` and the evidence
tiers).

## What would settle it

A mapping from claims to figures with an explicit tier-moving rule (e.g. a
claim cites a figure only at n ≥ some floor, and the floor is stated where
the claim is). Likely needs the operator's judgement on which claims to
wire first — the funding-fade family has both authored strategies and
recorded signals.

## Notes

Filed 2026-08-15 as the Out of Scope residue of `the-record-answers-forward`.
The depth caveat rides along: at ~2.4 days of record the per-signal samples
are small; the attachment gains value automatically as the record deepens.

## Evidence — depth check, 2026-08-15 (funding-fade family)

Measured read-only against the live record, all date arithmetic done in UTC
inside the query (`set time zone 'UTC'`; the db client renders UTC+7).
Record: 1,203 recorded captures, 2026-08-12 19:46Z → 2026-08-15 10:18Z
(2.61 days), 20 series at 1h cadence. Pairing replicated the product's own
rule (consecutive recorded captures, spacing ≤ 2× per-series median,
per `deriveSeriesCoverage`): 1,130 valid pairs, baseline mean +0.0036%.

Per-signal n, funding family:

| Signal | n (pairs) | mean fwd | notes |
|---|---:|---:|---|
| `funding_rate_flipping` | 113 | +0.0714% | sd 0.75%, se 0.071% — mean is ~1 se from zero and from baseline; 14 coins, 55 distinct hours (triggers cluster cross-sectionally, so effective n < 113) |
| `funding_extreme_positive` | 2 | +0.75% | no figure at any defensible floor |
| `funding_extreme_negative` | 0 | — | never triggered in 1,203 captures |

**Why this stops the attachment for now.** The family's tier-moving claims
(C10's crowding-unwind thesis; Lepanto's ±0.06% fade; Cannae's
`FUNDING_STRETCHED`) rest on the *extreme* signals — n = 2 and n = 0. That
is §D.6's "almost nothing to harvest right now" confirmed by the record:
in this funding regime the extremes essentially never fire, so **calendar
depth alone will not fix this** — the tripwire is trigger count, not date.
The one above-floor signal, `funding_rate_flipping`, attaches only to a
minor allocation-2 build note, and its figure is statistically empty
(mean inside ~1 se). Wiring it would move a tier on noise.

**Re-check condition:** revisit when `funding_extreme_*` triggered captures
reach ~30 (one query: `select signal_id, count(*) from signal_readings
where triggered and signal_id like 'funding_extreme%' group by 1`), or when
the operator picks a different first family. Suggested floor when wiring:
a claim cites a figure only at n ≥ 30, floor stated beside the claim;
below it the tier stays "no forward data".

## Re-check 2026-08-16 — the tripwire has not fired, and the reason it will not is now measured

Ran the item's own re-check query read-only against the live record. The
recorder's `DATABASE_URL` was loaded by evaluating that one assignment line out
of `record.ps1` rather than dot-sourcing it — the script ends by *starting a
capture run*, so sourcing it to read the database would have written to the
thing being measured.

```
funding_extreme_positive   2 triggered
funding_extreme_negative   absent from the result — still never triggered
funding_rate_flipping    157 triggered

record: 1,641 captures, 2026-08-12T19:46Z -> 2026-08-16T14:31Z (3.78 days), 20 series
```

### The prediction held, and that is the finding

| | 2026-08-15 | 2026-08-16 | delta |
|---|---:|---:|---:|
| captures | 1,203 | 1,641 | **+438 (+36%)** |
| days of record | 2.61 | 3.78 | +1.17 |
| `funding_rate_flipping` | 113 | 157 | +44 |
| `funding_extreme_positive` | 2 | **2** | **0** |
| `funding_extreme_negative` | 0 | **0** | **0** |

The item argued that *"calendar depth alone will not fix this — the tripwire is
trigger count, not date."* That was an inference from §D.6 when written. It is
now a measurement: **the record grew by 36% and the extreme signals gained not
one trigger between them**, while the non-extreme signal in the same family
gained 44. The extremes are not slow to accumulate; in this funding regime they
are not firing at all.

### What this does to the item

**Nothing changes about the decision** — the attachment stays unbuilt, for the
same reason and now with better evidence for it. The tier-moving claims (C10's
crowding-unwind thesis, Lepanto's ±0.06% fade, Cannae's `FUNDING_STRETCHED`)
rest on n = 2 and n = 0, and a second measurement says waiting is not a strategy.

**What it changes is the advice.** The re-check condition should not be read as
"come back in a few days". Two re-checks 1.17 days apart both answer 2/0. A
third at the same cadence is a read whose answer is on record — the same trap
`market-grid-payloads-that-only-fill-once-someone-plays` (#104) documents about
polling a listing that has never changed. **Re-check on a regime change, or on
the operator naming a different first family**, not on a calendar.

The `funding_rate_flipping` figure is the one that moved (113 -> 157), and it is
still the wrong thing to wire: it attaches only to a minor allocation-2 build
note, and at 113 its mean sat inside ~1 se of both zero and baseline. n growing
to 157 does not change what it is attached to.

### Carried to #85

The record's depth is now **1,641 captures over 3.78 days at 1h across 20
series**, up from the 1,203/2.61 figure quoted in
[[the-stop-vs-noise-comparison-has-no-home]]. That item's live candidate — a
locally measured single-step adverse move from the forward-return distribution —
is not signal-conditioned, so it draws on the whole record rather than on one
signal's triggers. **It is therefore not blocked by what blocks this item**, and
its own depth gate is still owed against effective sample.
