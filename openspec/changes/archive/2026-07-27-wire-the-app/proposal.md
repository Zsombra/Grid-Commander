# Proposal: Make the product reachable

## Why

Two changes have shipped a complete domain, application and infrastructure layer
and 223 passing tests. **No user can reach any of it.** There is no session, no
composition root, and no route — `app/` holds three empty directories and two
component files.

The gap was found by the production gate on `author-agents` (PG-103), filed as
`no-composition-root` at P1, and it is worth being precise about how it happened.
Both delta specs describe behaviour: what the system does when a user connects,
creates, rebinds. Both are fully satisfied. Neither ever says the behaviour is
*reachable*, because reachability reads like plumbing rather than behaviour. It
is plumbing, and it is also the difference between a library and a product.

There is a second cost, less obvious than "nothing runs". Every layer is tested
against its own contract and **nothing tests that the layers are connected**. The
path from an HTTP request, through the guard sequence, to BattleGrid and back
does not exist, so the guarantees the audit log and the confirmation tokens make
are guarantees about a call path no request takes. They are correct and they are
not yet load-bearing.

## What Changes

- A request can identify the user it belongs to, and the connection it may act
  with, without the user handling a credential.
- A request that has no connection is refused, and refused the same way whether
  the connection is absent, revoked, or expired beyond recovery.
- An access token that has expired is refreshed before use rather than after a
  failure — `needsRefresh` exists, is tested, and nothing calls it.
- Every existing use case is reachable through a route: connecting, the
  authorization callback, disconnecting, the audit log, the agent roster,
  creating, editing, rebinding, archiving and the journal.
- The adapters are constructed once, from configuration, at a composition root.
- At least one test exercises request → session → guard → adapter → response, so
  "the layers are connected" stops being an assumption.

## Capabilities

**New**: `app-access` — how a request in Grid-Commander comes to act for a
particular user, with a particular authority, and what happens when it cannot.

## Out of Scope

- **A second identity.** The BattleGrid connection is still the only identity;
  this change reads it back on a request, it does not add an account system.
- **New behaviour in the capabilities being wired.** If a route needs a rule that
  is not in `battlegrid-connection` or `agent-authoring`, that is a spec change
  in those capabilities, not a route detail decided here.
- **Styling.** The components exist and are reviewed. Making them attractive is a
  design pass, and design tickets do not change behaviour.
- **Multi-account, teams, sharing.** One BattleGrid account per user, unchanged.
- **Anything that spends.** Unchanged and unchanging.

## Impact

The first change whose value is that other changes become real. It touches no
domain rule and adds no BattleGrid capability; it adds the layer at which every
existing guarantee is finally exercised.

Two things will be discovered here that could not be discovered before: whether
the guard sequence behaves under a real request, and what BattleGrid's token
lifetimes actually are (DL-8, backlog `prove-token-lifetimes`) — the first live
human authorization happens in this change or not at all.

It also carries a security surface the previous changes did not: a session
cookie is a credential, and getting its flags, lifetime and invalidation wrong
would undo the custody work `connect-battlegrid-account` did. Full track for
that reason.
