---
id: confirm-agent-write-response-shape
title: The agent write tools' response shape is tolerated rather than known
type: question
status: open
priority: p3
created: 2026-07-27
updated: 2026-08-12
change: ""
capability: agent-authoring
github: "103"
blocked_by: []
tags: [battlegrid, defensive-code]
---

# The agent write tools' response shape is tolerated rather than known

## What

`agent-adapter.ts` reads write responses as `payload['agent'] ?? payload` at
five call sites. The tool reference documents `create`, `update`, `rebind`,
`archive` and `activate` as returning `agent`, so the fallback tolerates a shape
the platform is not documented to send.

Recorded as PG-102 in the production gate.

## Why it matters

Mildly. It fails closed: `mapAgent` throws `AgentPayloadError` without an `id`
and a `revision`, so a genuinely wrong shape raises rather than producing a
half-mapped agent. The cost is defensive code standing where a known contract
should be — the kind the architecture checklist asks us not to accumulate.

## Fix

Confirm the shape against a live create, then drop the fallback. Doing so needs
a real mutation on a real account, which was deliberately not attempted while
the test account had one agent slot remaining.

## 2026-08-12 — the probe got harder, not easier

`get_account_state` now reports `agentSlots: {limit: 3, used: 3,
remaining: 0}`. There is no free slot to spend on a live create at all;
the probe waits on the operator archiving an agent or the account
levelling up. (A create attempted at zero slots would only observe the
*refusal* shape, which is not what this item needs.) Note the slot cap
itself became readable — see the correction on
`preset-custom-in-the-preset-branch-is-unestablished`.
