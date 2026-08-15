---
id: the-figures-do-not-yet-reach-the-claims
title: Forward returns exist and the strategy-analysis claims still read "no forward data"
type: feature
status: open
priority: p3
created: 2026-08-15
updated: 2026-08-15
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
