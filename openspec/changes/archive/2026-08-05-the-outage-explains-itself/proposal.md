# Proposal: The Outage Explains Itself

## Why

BattleGrid was down all day on 2026-08-05 — first per-tool `INTERNAL_ERROR`s,
then a flat **502 Bad Gateway from nginx**, HTML where JSON was expected. That
is a condition nothing in this product has ever been observed under, and it
disappears when the platform recovers, so the app was booted in personal mode
against the real key and every route walked while it lasted.

**The structure held.** Nothing crashed. Every surface answered, every read came
back `kind: 'unreadable'` with `cause: 'unreachable'` — never `empty` — and
`/pending` and `/audit`, which need only this product's own database, worked
normally. The whole "unreadable is not empty" design was proven against a
platform that was genuinely gone rather than against a fake that returns a
failure. That had never happened.

**The sentences did not hold.** What an operator actually read was:

> Your roster could not be loaded. **tools/call failed with 502**

The classification is right and the wording is a raw HTTP artefact. It reaches
five web surfaces and every MCP tool result, because `unreadable(err)` uses
`err.message` as the reason and the transport throws
`` new Error(`${method} failed with ${res.status}`) ``.

And on `/explorer`, during a total outage, an operator read:

> **Configuration changes are unavailable**: Grid-Commander could not confirm
> what "get_agent_explorer" does.

Nothing was being configured. `get_agent_explorer` is a read; with discovery
down it classifies as unknown, unknown fails closed as destructive, and the
message asserts a category the operation does not belong to. The refusal is
correct. The explanation is not.

## What Changes

- **A named error for a transport failure**, replacing the bare `Error`. Its
  message is a sentence, and it keeps the status: a 502/503/504 says BattleGrid
  is not answering and that this is not the operator's account or key; another
  5xx says BattleGrid failed while handling the request; a 4xx says BattleGrid
  refused it. Fixed at the boundary, so all thirty `unreadable` surfaces and the
  MCP surface improve at once.
- **`DiscoveryUnavailableError` says what actually happened** — that Grid-Commander
  could not confirm what the operation does and so did not perform it — instead
  of asserting the operation was a configuration change.
- A test that pins both against the real shapes, so a reworded message cannot
  quietly go back to protocol vocabulary.

## What This Does Not Change

The classification, the fail-closed rule, and the `unreadable`/`empty`
distinction are all correct and untouched. This is what those failures *say*.

## Deferred, with its scope measured

Thirty files render an `unreadable` branch. **Five** use `WhyNotLoaded`, the
shared component that adds "this does not mean your agents are gone — Grid-Commander
could not reach BattleGrid to ask". The other twenty-five print the reason and
stop, so `/agents` teaches and `/arena` does not, for the identical failure.

That is real and it is a twenty-five-file sweep plus a guard, not a copy fix.
Filed as `an-unreadable-branch-need-not-explain-itself` rather than folded in
here, where it would be the larger half of a change proposed as the smaller one.

## Capabilities

**Modified**: `battlegrid-connection` — one ADDED requirement.
