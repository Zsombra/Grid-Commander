# The players above you are shown

## Why

`get_leaderboard` returns rows. `ExplorerPort` models them.
`ReadFieldQuery` carries them to the surface. `/explorer` renders none of them.

Observed live on 2026-08-06, account 1, `{metric: PROFIT, timeframe: ALL_TIME,
gameType: ALL, limit: 10}` — the exact call `ReadFieldQuery` makes:

```json
{"rank":1,"userId":"9b7a50e1-…","displayName":"PrawnCocktail",
 "avatarUrl":"https://imagedelivery.net/…","value":371.7}
```

Ten rows, on every metric tried. The page shows one sentence built from
`currentUser` — *"Rank 7 by profit, ahead of 97% of players · $37.51"* — and
drops the field that gives that rank its meaning.

## The reason it looks like this, which is not a mistake

The rows were empty when the page was written. The 2026-08-06 surface probe
recorded `"leaderboard": []` with `"currentUser": null`, and
`market-grid-standings-need-a-gametype-not-a-second-mapper` says in as many
words that the rows "have never been observed populated". That was true when it
was written. It is not true now.

This is the ordinary case of a payload filling in after its surface was built —
which is why the fix is a re-read rather than a repair.

## Why it is worth doing rather than filing

**Mapped and unrendered is this repository's recurring defect.**
`binding.state` was mapped, carried through the domain, and rendered nowhere
while the roster wrote the word "Bound" into its JSX — and the day the platform
answered `ORPHANED`, the product stated the opposite of the payload. Nothing is
*false* on `/explorer` today. The same gap is open: the data crosses the entire
application and stops one line short of a reader.

And the surface is thin without it. `/explorer` is the "where do I stand" page.
It answers with a rank and no field to be ranked against.

## What changes

**A table of the ten rows**, under the standing sentence: rank, name, value.
The port already carries all three.

**`userId` is mapped, on both the rows and the standing**, and used for exactly
one thing: marking which row is this account's.

That marking is the substance of the change rather than a decoration. **This
account's own row is in the list** — measured: `ANBUJEFF` is rank 1 by volume
and by score on this account's own leaderboard, and rank 7 by profit, which is
inside a top ten. A page that printed "Rank 7" above a table silently containing
that same rank 7 would be showing one fact twice and claiming two. The `userId`
is what tells them apart; matching on rank would tie, and matching on display
name would trust a string anyone can choose.

`mapOwnStanding` already knows the field is there — its comment reads *"The
envelope always carries a userId"* — and deliberately did not map it, because
nothing needed it. Something needs it now.

## What does not change

**`avatarUrl` is not mapped.** It is on the wire and this product renders no
avatars anywhere; mapping it would be carrying a field to no reader, which is
the defect this change exists to close, pointed the other way.

**No link out of a row.** `userId` would let a row link to that player's public
agents, which `agent-comparison` already reads — but the public-agent reads are
keyed by `agentId`, not by owner, and no observed payload connects the two. That
is a shape nobody has seen, and this product has paid four times for modelling
one.

**No `gameType` argument.** The sibling item wanted one so the arena could ask
"who is winning this game". Measured 2026-08-06: `ALL` and `MARKET_GRID` return
byte-identical payloads — every player on the platform is a Market Grid player —
and `COIN_GRID` returns nothing. An argument whose live values return the same
bytes, with no surface asking the question, is a widening nobody can test the
point of. It waits for the arena to want the panel.

## Capabilities

- `agent-comparison` — MODIFIED: `Where This Account Stands Is Shown First`
