# Proposal: A Personal Key

## Why

Grid-Commander is a **personal controller** — one person, their own BattleGrid
account, reached over the MCP surface BattleGrid exposes. That is the direction,
stated 2026-07-29.

The product as built assumes the other thing. `battlegrid-connection` implements
delegated authorization: a registered OAuth client, PKCE, a callback route, token
refresh, per-user encrypted tokens. All of it is correct for a multi-tenant
product holding other people's credentials, and all of it stands between the
owner and their own account.

Concretely: **it cannot be run.** Pressing *Continue to BattleGrid* redirects to
`/authorize` carrying a `client_id` that has never been registered, and there is
nothing after that point. To use a personal tool against your own account you
would first have to register an OAuth client with a third party — to talk to
yourself.

BattleGrid takes a `bg_live_` bearer key. The owner already has one.

## What Changes

The architecture already anticipated this. `Authority` is `{ userId, accessToken }`,
`ResolveAuthorityQuery` is documented as *"the single place a BattleGrid token is
obtained"*, and the adapter does `Authorization: Bearer ${accessToken}`. A
personal key **is** a bearer token to that endpoint, so everything downstream —
agents, strategies, compile/review/apply, audit, the assistant — works unchanged.

Three seams need a second implementation, chosen at the composition root exactly
as `AssistantPort` already is:

- **Who is acting.** `CurrentUserQuery` resolves a session, looks up a
  connection, and refreshes a token. `OwnerOnlyUser` returns the owner. One
  interface, two implementations, no branching inside either — a runtime
  dual-path is what the architecture review forbids.
- **What token.** The configured `BATTLEGRID_API_KEY`, unchanged and unrefreshed.
- **What scopes.** `scopesFor` reads `connections.scopes` and returns `[]` when
  there is no connection — which makes the guard refuse *every* call. A personal
  deployment declares its scopes instead.

**`BATTLEGRID_API_KEY` absent leaves today's OAuth path exactly as it is.**
Additive, and reversible by unsetting one variable.

## The trade, stated plainly

Two protections weaken, and both must be written down rather than discovered.

**Scope stops being a grant restriction and becomes a declaration.** Today the
OAuth client is registered `mcp:read`-only, so `mcp:wager` is *unrequestable* —
not merely unrequested. A `bg_live_` key carries whatever the account grants. The
product cannot verify what a key holds, so `BATTLEGRID_KEY_SCOPES` is what the
operator *says* it holds. What still stands is the classification guard and the
confirmation gate, which is where the boundary always was — architecture policy
already says scope must never be the thing that decides.

**There is no login.** With no session to resolve, anyone who can reach the page
acts as the account owner. That is correct for a tool on localhost and wrong the
moment it is exposed. So personal mode says so, on every page, in the product
rather than only in a document.

## Capabilities

**Modified**: `battlegrid-connection` — requirements covering a deployment that
holds the owner's own credential: what a declared scope means, and that the
absence of a login is disclosed.

## Out of Scope

- **Removing the OAuth path.** It is audited, archived, and correct for the
  product the brief describes. Deleting it on one turn of direction would be a
  large irreversible change made without evidence; if the personal model holds
  up in use, removing it later is a deliberate cleanup. Filed as
  `oauth-path-may-be-dead-weight`.
- **Verifying what a key actually holds.** BattleGrid may expose it; nothing in
  the reference says so, and guessing is what this product refuses. Filed as
  `cannot-verify-what-a-key-grants`.
- **Protecting an exposed personal deployment.** Disclosure is not
  authentication. A personal tool that needs to be reachable from elsewhere
  needs a front door of its own, and that is a different change.
