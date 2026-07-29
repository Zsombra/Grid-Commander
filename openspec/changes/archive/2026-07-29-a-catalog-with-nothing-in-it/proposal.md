# Proposal: A Catalog With Nothing In It

## Why

When the catalog comes back with nothing in it, the user gets the page heading,
the intro paragraph, and an empty `<ul>`. No sentence, no explanation.

It reads identically to a bug:
the `unreadable` branch above it was written with real care — it says the
strategies are not gone, only unreachable — and that whole distinction is lost
the moment "you have none" renders as blank space, because blank space is what a
broken page looks like too.

**The same problem is already solved one capability over, and the fix belongs
in the same place it did there.**

`RosterResult` carries a distinct `'empty'` kind, and `agent-authoring` requires
it:

> #### Scenario: The account has no agents yet
> - **THEN** they are told the account has none, and offered the path to create one
> - **AND** this is distinguished from a failure to load

`JournalResult` carries it too. `StrategyListResult` does not, and
`strategy-authoring` says nothing about the case at all — three levels of the
same asymmetry, from the spec down to the adapter.

So this is not an oversight in isolation. It is one capability having learned
something the other has not, and fixing it as a `listings.length === 0` check in
the component would leave the two capabilities modelling the same distinction
differently — which is how the next person to touch either one gets it wrong
again.

## What Changes

- **`StrategyListResult` gains an `'empty'` kind**, alongside `strategies` and
  `unreadable`, mirroring `RosterResult` exactly. The type is what keeps the
  distinction alive at every call site; a length check in one component is a
  convention.
- **`McpStrategyAdapter` returns it**, on the same condition the agent adapter
  uses: the platform returned no array, or an empty one.
- **`StrategyList` renders it** as its own branch, saying that nothing is
  listed and that nothing failed — and offering **no next action**, for the
  reason under "What the reference corrected" below.
- **`strategy-authoring` gains the requirement** its sibling capability has had
  all along.

## Capabilities

**Modified**: `strategy-authoring` — one ADDED requirement covering the empty
catalog and its distinction from a failed read.

## What the reference corrected

The backlog item framed this as a new user's first impression — "the first
screen a newly connected user reaches with nothing set up". Checking
`docs/BATTLEGRID_MCP_REFERENCE.md` before writing the copy showed that premise is
wrong:

> `list_strategies` — List the visible SYSTEM catalog **and** owned PRIVATE
> strategies

A newly connected user with no strategies of their own still sees BattleGrid's
catalog, so their list is not empty. An empty result means **nothing came back
at all**, including the system catalog — which is unexpected, not a starting
point, and leaves nothing to fork from.

That changed both the requirement and the words. The first draft of this change
said "This account has no strategies yet. Start from one of BattleGrid's own:
forking makes a private copy…" — an instruction pointing at strategies that were
not returned. It would have read as reassurance while being an affordance
leading nowhere, which is the class of defect `close-the-reachability-gap`
already existed to fix.

Whether an empty catalog is anomalous or simply what some accounts see is not
knowable from here — "the *visible* SYSTEM catalog" implies it can vary. So the
empty state states what is true (nothing is listed, nothing failed) without
claiming to know why, and offers no action that may not exist.

## Out of Scope

- **Designing the empty state.** It gets a sentence and a next action, using
  tokens. `strategy-catalog` has never had a design pass, and the surface
  manifest already records `empty` as a state the design agent should design.
  This change makes there be something to design.
- **`audit-list` and `journal-view`.** Checked rather than assumed:
  `JournalResult` already carries `'empty'`, and `audit-list` handles its own
  empty case inline and reads correctly. Neither needs this.
- **Quota when the catalog is empty.** `RosterResult`'s `'empty'` carries
  `slots`, because an account with no agents still has a capacity worth showing.
  The strategy quota is only meaningful against strategies you own, and an empty
  catalog owns none — so `'empty'` carries nothing, deliberately, and that
  asymmetry is stated here rather than left to look like an omission.
