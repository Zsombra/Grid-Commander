# The OAuth endpoints are assumed

## Why

`CLAUDE.md` states the lesson this project learned the hard way:

> **The tool list goes stale after a BattleGrid deployment.** The server says so
> itself. Rediscover at runtime; never hard-code a tool list.

That lesson was applied to tools and to nothing else. Four OAuth URLs are built
from a constant and checked by nothing:

```ts
src/config.ts:105   authorizeUrl: `${BASE}/authorize`
src/config.ts:106   tokenUrl:     `${BASE}/token`
src/config.ts:107   revokeUrl:    `${BASE}/revoke`
```

BattleGrid publishes all of them, at
`/.well-known/oauth-authorization-server`. Nothing has ever compared the two.

**They agree today.** That is the finding, and it is worth recording rather than
assuming: probed live, `authorization_endpoint`, `token_endpoint` and
`revocation_endpoint` match what the product constructs, character for
character. `scopes_supported` is `["mcp:read","mcp:wager"]`, exactly the two the
product models.

So this change is not a bug fix. It is the difference between *correct* and
*known to be correct* — on the one path whose failure mode is a user sent to a
consent screen that does not exist.

### What else the probe established

Three things were unproven before and are proven now, all without a credential:

- **The authorize endpoint accepts the exact parameter set the product builds.**
  `buildAuthorizationUrl`'s output returns `302` to BattleGrid's consent screen,
  not a `400`.
- **PKCE is enforced, not merely advertised.** The same request with
  `code_challenge` removed comes back `error=invalid_request`. The product's
  S256 implementation is required by the server, not optional.
- **Registration still behaves as `findings-dcr` recorded on 2026-07-27** — open,
  no `client_secret` whatever is requested, no `registration_access_token`. A
  client registered now with `scope: "mcp:read"` echoes that ceiling back, so F-2
  holds: wager authority is unrequestable rather than merely unrequested.

### What is still not proven, stated plainly

Consent, the code exchange, and refresh. All three need a human in a browser, and
`findings-dcr` said so on 2026-07-27:

> Completing an authorization requires a real user consenting in a browser,
> which cannot be done headlessly.

That has not changed and this change does not pretend otherwise.

## What Changes

- `docs/battlegrid-oauth-metadata.json` — the discovery document, recorded the
  way `battlegrid-mcp-surface.json` records the tool surface.
- A conformance guard comparing every OAuth URL the product builds against that
  document, offline, plus the scopes, grant types, response types and PKCE method
  it assumes.
- A live check under `tests/live/` that re-fetches the document and compares it
  to the recording, so platform drift is detectable rather than silent — the
  same relationship `probe_mcp_surface.py` has to the tool artifact.
- The recorded facts about registration and PKCE enforcement land in
  `battlegrid-connection` as requirements, because they are properties the
  product depends on and currently only a findings document remembers.

## Capabilities

- `battlegrid-connection` — one requirement modified, one added.

## Out of Scope

- **Discovering the URLs at runtime instead of constructing them.** Tempting,
  and wrong here: a client that reads its authorization endpoint from the network
  at request time will follow a redirect an attacker controls if the discovery
  response is ever poisoned. Pinning the URLs and *checking* them against
  discovery is the safer half of the lesson — the tool list is rediscovered
  because tools change weekly and carry annotations; an issuer's endpoints are
  meant to be stable, and a change in them is news, not routine.
- **Completing an authorization.** Needs a browser and the operator. → the
  standing `oauth-path-may-be-dead-weight` item, now narrowed to exactly that.
- **The `client_id` produced while probing.** It is deployment configuration,
  not source, and `.env.example` deliberately leaves it blank.
