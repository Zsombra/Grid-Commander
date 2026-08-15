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
