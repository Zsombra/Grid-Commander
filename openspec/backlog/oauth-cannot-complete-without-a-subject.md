---
id: oauth-cannot-complete-without-a-subject
title: The OAuth path cannot complete - BattleGrid issues no subject, and the adapter requires one
type: bug
status: done
priority: p2
created: 2026-08-13
updated: 2026-08-13
change: "the-connection-asks-who-it-is"
capability: battlegrid-connection
github: "203"
blocked_by: []
tags: [oauth, battlegrid, live, dead-path]
---

# The OAuth path cannot complete - there is no subject to establish identity with

## What

Walked live 2026-08-13 with the operator consenting in a browser. Three token
responses across two grants and one refresh. Every one:

```
keys: access_token, token_type, expires_in, refresh_token, scope
sub : absent
```

`src/infrastructure/battlegrid/mcp-adapter.ts:430`:

```ts
if (!json.sub) {
  throw new Error('BattleGrid returned a grant with no subject; cannot establish identity');
}
```

**So every delegated connection throws at the last step.** The consent succeeds,
the code exchanges, the tokens are valid - and the adapter refuses them.

## Why it matters

p2. Not because anyone is blocked - the product runs on the personal key - but
because this is a whole audited capability that **has never once worked**, and
the codebase does not know it.

The cause is a category error rather than a typo. `sub` is an **OIDC** claim,
and BattleGrid does not run OIDC:

```
/.well-known/openid-configuration        404
/.well-known/oauth-authorization-server  200, and advertises no userinfo_endpoint
```

It is plain OAuth 2.1 - authorization, not authentication. There was never going
to be a subject in that response.

The guard's *reasoning* is sound and worth keeping: defaulting the subject to an
empty string "would make every such grant collide on the same key, and the second
user to connect would be recognised as the first". What is wrong is only the
assumption that the field exists at all.

## What identity would have to come from instead

Not the token. The natural source is an authenticated call: `get_account_state`
returns `username`, and a stable user id rides on other payloads - `userId`
appears on every agent, observed `0eccbf37-d90b-4933-88f2-d120627b23f7`. One
authenticated read after the exchange would establish identity honestly, at the
cost of a round trip.

That is a design decision, not a patch: it changes when a connection becomes
real, and what happens if that read fails. It needs a `/propose`.

## Evidence

- Live walk 2026-08-13 - three grants, `sub` absent on all three
- `src/infrastructure/battlegrid/mcp-adapter.ts:430`
- `https://mcp.battlegrid.trade/.well-known/openid-configuration` returns 404
- `https://mcp.battlegrid.trade/.well-known/oauth-authorization-server` carries
  no `userinfo_endpoint`

## Notes

This falsifies [[oauth-path-may-be-dead-weight]] (#91), which concluded "a
working path with one untested segment". The segment was tested and it fails.
The keep-or-delete decision there now has a third option in front of it: fix
this first, or choose between deleting the path and keeping code that has never
run to completion.

Found while answering [[prove-token-lifetimes]] (#93).

## How this survived audit, archive, and a green CI

Local CI is green at `bedf6f0` — twelve gates, ten run, including `oauth-live`.
It stays green with this bug in place, and that is not a failure of any gate.

**`oauth-live` is correctly scoped and does not claim otherwise.** It re-fetches
the discovery document and checks it still matches
`docs/battlegrid-oauth-metadata.json` — reachability first, so a dead network
reports *unchecked* rather than red. Its own comment in `scripts/ci.sh` says
why: "a recording nothing re-fetches can quietly stop describing the platform,
and then the guard built on it passes while a user is sent to an endpoint that
has moved."

That guard works. It is a different guard from the one this needed.

**Nothing exercises a grant.** One file in the suite mentions `grant_type` or
`authorization_code` — `tests/architecture/oauth-conformance.test.ts` — and it
runs entirely offline against the recording. So:

```
discovery document matches the platform   covered, live, every CI run
PKCE / challenge method advertised        covered, live
the product's URL shape                   covered, offline
a token actually being exchanged          NOT COVERED, anywhere
```

The last line is where `sub` lives, so no gate could have caught this. **And
nothing said so** — which is the part worth fixing, because the coverage reads
as complete. `oauth-live` in a green list looks like the OAuth path is exercised
live. It is the *metadata* that is exercised live.

This cannot be automated away: an authorization code requires a human at a
consent screen, and that is a real limit rather than a missing test. The
answerable question is whether the boundary is **written down where someone
meets it**, the way `tests/rendering/support/render.ts` now states what the
render harness cannot see (#194).

Same shape as five other findings this session: a check that reads as covering
more than it covers. Here the check is honest and the *list it appears in* is
what misleads.

## And the registration premise was already contradicted in-repo

`src/config.ts:95` argues that requiring a `client_id` "would force the operator
to invent a value … Registration is the thing being avoided; it cannot be a
precondition for avoiding it."

`docs/battlegrid-oauth-metadata.json` — committed, and re-verified by
`oauth-live` on every CI run — records:

```json
"registration_endpoint": "https://mcp.battlegrid.trade/register",
"token_endpoint_auth_methods_supported": ["client_secret_post", "none"]
```

Registration is one unauthenticated POST returning a public client with no
secret; it was walked on 2026-08-13 and answered 201. So the comment's premise
was contradicted by a file in the same repository, verified by the same CI, for
as long as both have existed.

Exactly the shape of [[the-performance-design-rests-on-a-dead-premise]] (#189):
a careful argument that outlived its evidence, with the correction already
sitting somewhere nobody connected to it.

---

# Closed 2026-08-13 — the path completes, and the walk found a second defect

`the-connection-asks-who-it-is` archived. Identity is established by an
authenticated read performed with the newly granted authority; a grant carrying
no subject is ordinary; a connection that cannot be identified is refused, stores
nothing, and releases the grant it was just given.

**Walked live.** Consent, exchange, identity read, session, `/agents` served.
Verified in the database rather than from the redirect:
`users.battlegrid_subject = 0eccbf37-d90b-4933-88f2-d120627b23f7` — the same
account the personal key resolves to — with `users.id` a separate local token,
`connections.status active`, `scopes ["mcp:read"]`, tokens stored encrypted.

**The first walk failed, and not for the reason this item predicted.** The
identity read never reached BattleGrid: `callTool` measures authority against the
caller's *stored connection*, and this read runs before one exists, so the guard
refused a call whose grant was holding exactly the scope it wanted. Fixed with
`ToolCallRequest.grantedScopes` and contained by
`tests/architecture/granted-scopes.test.ts`. Nothing offline could have found it
— 2257 tests and two live probes were green throughout. See the change's
`plan/decision-log.md`, DL-11.
