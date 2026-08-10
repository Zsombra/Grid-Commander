# Proposal: Whether The Credential Could Stake

## Why

`/arena` says *"Watching only — entering a session stakes real money and is not
offered here yet."* That sentence explains what the product declines to offer,
and says nothing about whether the account could take that path at all.

The fact exists and the product already holds it. `get_account_state` carries
`mcpWagerEnabled` — whether BattleGrid permits MCP-signed wagers on this account
— and `a-cap-above-the-money-cannot-bind` mapped it onto `AccountState`
deliberately unrendered, with the reason recorded in #121: the wager flag
belongs beside the arena, not on a limits page that happened to make the read.

There are two independent gates between this product and a stake, and the page
should name both, because they fail differently:

1. **The account's own setting.** `mcpWagerEnabled` is BattleGrid's answer to
   whether MCP may stake money on this account. Reads `true` on the live
   account; an operator who believed MCP wagering was off would want to know.
2. **This product's scope.** Grid-Commander requests `mcp:read` only — never
   `mcp:wager` — by design decision D-3, enforced by an architecture guard.
   That is a static fact about the product and renders as copy.

## The half of #121 that is not built here, and why

#121 also says `/agents` "gives no warning before a create fails." **That
premise is wrong.** `ListAgentsQuery` computes `CreationAvailability` from the
roster's own `slotUsage`, and `CreateAffordance` renders the at-capacity state
before the form — "You are using all 3 of your agent slots. Recruit III allows
3; ranking up raises the limit. Archiving an agent frees a slot." — pinned by
`tests/agent/capacity.test.ts`. The remaining-count renders on the create link
when below capacity. Nothing to build; the issue gets corrected instead.

The issue's suggested first step — check whether `list_intelligence_agents`'
`slotUsage` and `get_account_state`'s `agentSlots` agree — was attempted live
on 2026-08-10 and **BattleGrid answered 502 on both reads** (the #100 flapping
pattern). Unanswerable today; it is a platform observation, not a product
change, and stays in #121's thread.

## What Changes

- A read of the account's wager setting, failing independently: an unreadable
  account state costs one sentence, never the arena.
- The arena's watch-only stance states both gates: whether BattleGrid would
  allow MCP wagers on this account, and that Grid-Commander holds no scope to
  place one regardless.
- `hasAccount: false` renders as its own fact — an account the platform says
  does not exist is not an account with wagering disabled.

## What is deliberately not here

- **No write path, no step-up, no offer to play.** The market-grid Purpose
  says reads only and this keeps it.
- **No slots rendering change** — built already, see above.
- **`tradingWalletProvisioned` stays unrendered** — no surface asks the
  question it answers; still filed on #121's item so it is not forgotten.

## Capabilities

**Modified**: `market-grid` — one ADDED requirement.
