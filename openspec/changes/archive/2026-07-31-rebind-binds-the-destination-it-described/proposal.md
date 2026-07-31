# Proposal: Rebind Binds The Destination It Described

## Why

`rebind-is-not-bound-to-the-revision-it-read` (P3 risk) — the last flow
whose confirmation does not cover everything it described. The token binds
the (agent, destination) pair, and the agent side carries
`expectedRevision`; the **destination strategy's revision** is described to
the user and bound to nothing. Between reading and confirming, the strategy
can move, the token still consumes, and the agent is rebound to a
configuration the user never saw described. Five-minute window,
operator-moved in practice — filed and taken because the parent change's
whole claim is that a confirmation authorises the operation it described.

A second honesty gap falls out of fixing it: `toStrategyName` arrives from
the **query string** — the caller tells the product what the destination is
called, and the consequence prints it. The describe must read the
destination from the platform anyway to learn its revision; the name comes
with it.

## What Changes

- `DescribeRebindQuery` gains the strategies port: the destination is read
  live — real name, real revision. Unreadable or missing destination is a
  refusal with the reason, not a proposal about a guess. The caller-supplied
  name leaves the request shape.
- `confirmationTarget.agentRebind(agentId, toStrategyId, toRevision)` — the
  trio. A token agreed at revision 2 cannot spend at revision 3.
- The consequence names the destination's revision; `Rebind` carries it; the
  confirm form posts it back.
- `RebindAgentCommand` gains the strategies port and re-reads the
  destination before performing: moved → `{kind: 'destination-moved'}` with
  "changed while you were reading" and nothing attempted; the page returns
  the reason and a fresh proposal. Unreadable → refusal likewise.

## Capabilities

**Modified**: `agent-authoring` — the rebind requirement gains the
destination-revision binding and the moved-destination scenario.

## Out of Scope

- Strategy browsing on the rebind chooser (`?to=` still supplies the id;
  only the *name and revision* stop being caller-supplied).
- Live proof (platform outage); the guard path is identical to the proven
  flows and the new refusals are unit-held.
