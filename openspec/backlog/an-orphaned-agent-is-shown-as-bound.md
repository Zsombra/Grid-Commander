---
id: an-orphaned-agent-is-shown-as-bound
title: The roster says "Bound to X" for an agent whose binding state is ORPHANED
type: feature
status: open
priority: p2
created: 2026-08-06
updated: 2026-08-06
change: ""
capability: agent-understanding
blocked_by: []
tags: [battlegrid, binding, live, false-claim]
---

# An orphaned agent renders as a bound one

Found 2026-08-06 while surveying the second account. `Volatilis` reads:

```
Volatilis [ARCHIVED] rev7  strategy=Volatilis — imported (ORPHANED)
```

BattleGrid declares exactly **two** binding states on
`list_intelligence_agents` — `BOUND` and `ORPHANED`. This product maps the
field (`agent.binding.state`, set in `agent-mapper.ts`) and **renders it
nowhere**.

## Why it is a false claim rather than a missing field

`src/presentation/components/agent-roster.tsx` does not merely omit the state.
It asserts the opposite:

```tsx
Bound to <span className="font-medium">{agent.binding.strategyName}</span>{' '}
at revision {agent.binding.strategyRevision}
```

The word **"Bound"** is hard-coded. An agent whose strategy is gone renders
identically to one whose strategy is healthy — and reads *"Bound to Volatilis
— imported at revision 7"*, which is precisely what is not true.

`/agents/[id]` is the same: the "Inherited from its strategy" section prints
the strategy name and revision and says its context, rules, prose and timeframe
"come from there" — for a binding that no longer points anywhere.

This is the shape of defect this repository keeps finding and naming: a surface
stating something definite that the payload contradicts. A null win rate that
is not 0%, an unconfigured gauge that is not a limit of zero, an unreadable
roster that is not an empty one, a submission check that did not answer
rendered as "has not entered" — and now a broken binding rendered as intact.

## What is not yet known

**What `ORPHANED` means operationally.** Whether the strategy was archived,
deleted, or forked away; whether the agent still runs on its materialized copy
of the configuration; and whether rebinding is the remedy. Do not guess — the
agent carries `strategyRevision` at materialization time, so it plausibly keeps
running on what it already has, but that is inference and this item should not
assert it.

The observed instance is **ARCHIVED**, so nothing is trading on it today. That
is why this is p2 and not p1. An ACTIVE orphaned agent has not been seen.

## First step when taken

Render `binding.state` wherever the binding is described — the roster line and
the agent page — and stop hard-coding "Bound". Where the state is `ORPHANED`,
say the strategy it was bound to can no longer be read and name what the agent
is still running on.

Then find out what it means, by observation rather than from the schema:
archive a strategy that an agent is bound to on the test account and read the
agent back. That is a write, so it needs `BATTLEGRID_LIVE_WRITES=1` and its own
throwaway subject — never one of the operator's real agents.
