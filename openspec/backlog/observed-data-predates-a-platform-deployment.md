---
id: observed-data-predates-a-platform-deployment
title: Re-probe live — the artifact's observed data predates a schema-changing deployment
type: debt
status: done
priority: p3
created: 2026-07-31
updated: 2026-07-31
change: conformance-sweep-for-required-and-accepted-params
capability: battlegrid-connection
blocked_by: []
tags: [battlegrid, probe, drift]
---

# Re-probe live — the artifact's observed data predates a schema-changing deployment

## What

Found while building the conformance sweep: the declared fields the surface
artifact carried were **stale against the committed capabilities dump**. A
BattleGrid deployment between the artifact's last live probe and the dump's
capture dropped `conditions` / `conditionVerdicts` (from
`preview_strategy_report` and the compile/apply plan subtrees) and
`entryStrategy` (deployment tools) — 12 constant paths and one tool's
required/optional set changed.

The `--refresh-declared` pass corrected the declared fields from the dump, so
everything the conformance checks read is current. But the artifact's
**observed** responses — shapes, envelope facts, failure reasons — are still
from the older generation, and a refresh deliberately cannot touch them: an
observation cannot be derived, only made.

## Why it matters

The server says its own list goes stale after deployments, and this is a
confirmed instance, not a hypothetical. Any code written against
`observed_shape` for the affected tools is reading a pre-deployment response.
The mismatch is bounded (declared drift was 1 tool's top level + plan-subtree
constants) but only a live call can say what the responses look like now.

## Fix

`BATTLEGRID_API_KEY=… python3 tools/probe_mcp_surface.py` — the standing
re-probe instruction. Needs the operator: this environment holds no key, by
design. One run regenerates declared and observed together and closes the
generation gap.

## Closed 2026-07-31

The operator supplied a key and the live probe ran: 43 of 110 tools called (21 argument-free + 22 via harvested ids), 66 writes skipped by the safety filter, 1 failed (`get_market_context`, see `two-read-tools-do-not-answer`). Declared and observed are one generation again; no key material in the artifact; tool set unchanged vs the capabilities dump.
