# Proposal: Connect a BattleGrid account

## Why

Grid-Commander cannot do anything until it can act on a user's behalf, and *how*
it obtains that authority is the product's foundational trust decision.

BattleGrid's MCP server advertises a full delegated-authorization stack:
Dynamic Client Registration, PKCE, refresh tokens, revocation, and two separable
scopes. That means no user ever needs to paste a long-lived `bg_live_` key into
this product. Asking them to would be both worse security and a worse first
impression than the platform already supports.

It also means getting the scope story right at the outset. `mcp:read` is
**write-capable** — 11 of BattleGrid's 110 tools mutate on it alone, 6 of them
destructive, including one that replaces an agent's entire configuration. A
product that calls that "read-only access" in its consent screen is lying to its
users on their first interaction.

## What Changes

- A user connects their BattleGrid account through OAuth. Grid-Commander
  registers as a client, requests `mcp:read` only, and never handles a
  user-supplied credential.
- The BattleGrid connection *is* the user's identity. There is no separate
  Grid-Commander password.
- Tool capabilities are discovered from the live connection each session and
  classified by the server's own annotations. Unknown tools fail closed.
- `mcp:wager` is never requested.
- Every mutating call is recorded in a per-user audit log, written before the
  attempt and updated with its outcome.
- The user can disconnect, which revokes the grant at BattleGrid.

## Capabilities

**New**: `battlegrid-connection` — how Grid-Commander obtains, holds, scopes,
and relinquishes authority over a user's BattleGrid account.

## Out of Scope

- Anything that spends. No MVP feature needs `mcp:wager`, and requesting
  authority you do not exercise is the opposite of the trust position this
  change exists to establish.
- Agent and strategy features. They depend on this and are specified separately
  (`author-agents`, `author-strategies`).
- Connecting more than one BattleGrid account per user. One-to-one for MVP.
- Billing. No revenue model has been chosen.

## Impact

First application code in the repository. Establishes the OAuth client, token
custody, the capability-classification layer that every later feature calls
through, and the audit log.

The DCR flow must be proven end to end against the live server before anything
is built on top of it — it is the one assumption here that no amount of reading
can confirm.
