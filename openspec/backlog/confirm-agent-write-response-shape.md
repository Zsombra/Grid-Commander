---
id: confirm-agent-write-response-shape
title: The agent write tools' response shape is tolerated rather than known
type: question
status: done
priority: p3
created: 2026-07-27
updated: 2026-08-13
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


## Answered and closed 2026-08-13 — walked live, fallback dropped

The operator freed a slot by archiving `Vanguard` (restored immediately after,
verified identical). Every tool that returns an agent was then called against
v18.2.0 and its envelope read off the wire:

| tool | response |
|---|---|
| `get_intelligence_agent` | `{ agent }` |
| `create_intelligence_agent` | `{ agent, slotUsage }` |
| `update_intelligence_agent` | `{ agent }` |
| `rebind_intelligence_agent` | `{ agent }` |
| `archive_intelligence_agent` | `{ agent }` |
| `activate_intelligence_agent` | `{ agent }` |

`payload['agent']` is correct at all six. The bare-agent shape the fallback
tolerated **was never sent**, and the reference never documented it.

`?? payload` is gone from all five call sites in `agent-adapter.ts`, with the
observation recorded above `getAgent` so the next reader gets the answer rather
than the hedge. 2239 tests pass unchanged — which is its own small finding: no
test ever exercised the fallback branch, so it was tolerated, never verified.

PG-102 can be closed with it.

### One thing the walk added

`create` returns a **`slotUsage` sibling** — the same `{level, rank, limit,
used, remaining}` shape `list_intelligence_agents` carries and
`mapSlotUsage` already maps. `createAgent` currently discards it, so the
roster's slot count is one call staler than it needs to be after a create.
Too small to hold this item open; filed as
[[create-returns-a-slot-count-nothing-reads]].
