# Tasks: A Catalog With Nothing In It

## The port

- [x] `StrategyListResult` gains `'empty'`, mirroring `RosterResult`
- [x] `'empty'` carries no quota — an empty catalog owns no strategies, and the
      asymmetry with `RosterResult`'s `slots` is deliberate and documented
- [x] `McpStrategyAdapter.listStrategies` returns it on no array or an empty one,
      the same condition the agent adapter uses
- [x] `ListStrategiesQuery` passes the kind through and reports `forking` as
      `unknown` — the platform returned no quota, and a remaining count invented
      here would be the fabrication this product refuses everywhere else

## The surface

- [x] `StrategyList` renders `'empty'` as its own branch
- [x] It offers **no** next action — see below
- [x] Tokens only

## Guards

- [x] Test: an empty catalog is `'empty'`, not `'strategies'` with a zero-length list
- [x] Test: a missing field is empty too, not an empty catalog object
- [x] Test: a failed read stays `unreadable`, and so does a malformed payload
- [x] Test: the surface branches on the kind and contains no `length === 0`
- [x] Test: the empty branch renders no link and names no fork
- [x] Re-inject each defect and watch the guard fail — 7 injected, 7 caught

## Checked rather than assumed

- [x] `JournalResult` already carries `'empty'` — nothing to do
- [x] `audit-list` handles its own empty case inline and reads correctly

## Gates

- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm test` — 483 passing, up from 472
- [x] `npm run build`
- [x] `./scripts/check.sh`
- [x] `./scripts/check-serving.sh`
- [x] Render it and look at it, light and dark

## The premise in the backlog item was wrong

It framed this as a new user's first impression — *"the first screen a newly
connected user reaches with nothing set up"*. `docs/BATTLEGRID_MCP_REFERENCE.md`
says otherwise:

> `list_strategies` — List the visible SYSTEM catalog **and** owned PRIVATE
> strategies

A newly connected user with none of their own still sees BattleGrid's catalog,
so their list is not empty. An empty result means **nothing came back at all** —
unexpected, and with nothing left to fork from.

The first draft of the empty state said *"This account has no strategies yet.
Start from one of BattleGrid's own: forking makes a private copy…"* — an
instruction pointing at strategies that were not returned. It would have read as
reassurance while being an affordance leading nowhere, which is what
`close-the-reachability-gap` already exists to prevent. Caught by reading the
reference before writing the copy, and now guarded by a test asserting the empty
branch renders no link and names no fork.

Proof: `docs/merge/proof/strategy-empty-light.png`,
`docs/merge/proof/strategy-empty-dark.png`. `empty` is plain prose; `unreadable`
is a bordered alert. Distinguishable without reading them, which is the whole
requirement.
