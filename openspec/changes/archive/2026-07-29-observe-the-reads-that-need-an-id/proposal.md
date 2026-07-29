# Observe the reads that need an id

## Why

Six defects were found on this branch. **Every one came from calling the real
platform**, and none from a test, a gate, or a review:

```
the MCP envelope nobody had unwrapped        every read returned {}
archive_strategy / restore_strategy          never sent expectedRevision
create: brain.kind                           'preset' vs const "PRESET"
create: sizingStrategy                       'FIXED' vs MANUAL|VOLATILITY_AUTO
update: tradingConfig                        23 keys sent, 20 accepted
update: no confirmation could be supplied    the guard refused its own product
```

So the set of tools the probe can *call* is the set the product can safely be
built against. Everything outside it must be modelled from a declared schema —
which is precisely the practice that produced all six.

**The probe reaches 21 of 110 tools.** It calls a tool only when `readOnlyHint`
is true *and* the schema declares no required arguments. Of the 89 it skips,
most are reads whose only requirement is an id it could ask for: `agentId` from
`list_intelligence_agents`, `strategyId` from `list_strategies`, `decisionId`
from `list_entry_decisions`.

Fourteen of the sixteen agent-internals tools have never been called by
anything, only because they take an `agentId`.

Building `an-agent-can-be-read-thinking` needed five of them observed. They were
called by hand in an ad-hoc script, so the knowledge went into that change and
not into the artifact — the next person starts where that one did, and the
artifact still says `needs arguments: agentId` for tools that have since been
called successfully.

## What Changes

- After the argument-free pass, the probe harvests ids from the responses it has
  already collected — every `id` field under a top-level array, keyed by the
  field name a schema would ask for.
- Each skipped **read** is then re-examined: if every required argument can be
  satisfied from that pool, it is called. If not, `not_called_because` names the
  argument that could not be supplied rather than the whole list.
- Each entry records how its arguments were obtained, so the artifact
  distinguishes *observed*, *observable but not reached*, and *not observable*.
- **The safety property does not move.** Only `readOnlyHint` tools are ever
  called, filtered in code before any request is built. Widening the id supply
  must not widen the classification, and a test asserts that the write and
  destructive sets are untouched by this.

## Capabilities

- `battlegrid-connection` — one requirement added.

## Out of Scope

- **Calling write or destructive tools with discovered ids.** The filter that
  keeps them out is the reason this file can be run without thinking about it,
  and nothing here relaxes it.
- **Ids the account does not have.** A tool needing a `decisionId` on an account
  with no entry decisions stays uncalled, recorded as such. Inventing an id to
  reach a tool would test the platform's error handling, not its shape.
- **Modelling the newly observed tools.** This widens what is *seen*; building
  surfaces on it is separate work, and each deserves its own reading.
