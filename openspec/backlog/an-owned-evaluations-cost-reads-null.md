---
id: an-owned-evaluations-cost-reads-null
title: The cost-to-think reads null on an owned evaluation, stable across runs
type: risk
status: open
priority: p2
created: 2026-08-07
updated: 2026-08-07
change: ""
capability: agent-understanding
blocked_by: []
tags: [battlegrid, drift, owned-reads]
---

# The cost-to-think reads null on an owned evaluation, stable across runs

## What

`own-evaluation-probe` failed twice, identically, in the 2026-08-07 keyed
sweep: "an owned evaluation carries what it cost to think: expected null not
to be null". The scorecard reads fine; `e.cost` is null on an evaluation the
account owns.

## Why it matters

The cost was the owned read's headline over the public one — live-proven
2026-08-03 ("an owned evaluation shows what it cost to think", the
`ownerView` field the platform nulls publicly). Stable null now means either
the platform stopped publishing it **without a version change** (11.0.0
throughout — semantics drift inside a version would be a first), or the
probe's chosen evaluation genuinely carries no cost (a decision recorded
without an LLM call?), which the probe's pick logic doesn't distinguish.

## Evidence

- Two serial runs, 16:13Z and 16:2xZ, same assertion, same null.
- Platform 11.0.0 both times (freshness green the same hour).
- The surfaces degrade honestly (cost renders as unpublished), so this is
  a fidelity loss, not a crash.

## Fix

First step is discrimination, not code: read several owned evaluations raw
(`get_signal_log`) and check whether `ownerView`/cost is null on all of
them or only on decisions of a certain shape. All-null → platform drift;
report it and update HANDOFF's owned-vs-public claim. Shape-dependent →
teach the probe to pick an evaluation that should carry cost, and say which
shapes cannot.
