# Task 0.1 — Dynamic Client Registration, proven against the live server

Executed 2026-07-27 against `https://mcp.battlegrid.trade/register`.
Two registrations were created. No user data was touched; no wager tool was called.

## It works

```
POST /register  →  HTTP 201
{
  "client_id": "<uuid>",
  "client_id_issued_at": 1785170823,
  "client_name": "Grid-Commander (development)",
  "redirect_uris": ["http://localhost:3000/api/auth/battlegrid/callback"],
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none",
  "scope": "mcp:read"
}
```

- Registration is **open** — no authentication required to register a client.
- The `client_id` is a UUID with an issue timestamp and **no expiry field**, so
  it is durable. Register once per deployment, not per user.
- The requested `scope` is echoed back, so registration bounds what the client
  may later ask for.
- No `registration_access_token` is returned, so RFC 7592 client management
  (read/update/delete of the registration) is **not available**. A registration
  cannot be revoked or edited through the API — treat `client_id` as
  write-once.

## F-1 — Every client is public, whatever it asks for

A second registration requested `token_endpoint_auth_method: "client_secret_post"`.
The server **echoed that value back and still issued no `client_secret`**.

```
  token_endpoint_auth_method: client_secret_post
  has client_secret: False
```

RFC 7591 §3.2.1 expects a server to issue `client_secret` when the registered
auth method requires one. It does not. So:

- **Client authentication is impossible.** There is no secret to present at the
  token endpoint.
- All security rests on **PKCE (S256)** plus exact `redirect_uris` matching.
- Registering with `client_secret_post` would be worse than useless — it
  declares an auth method the client cannot perform, and the token request would
  have to omit the secret anyway. **Register with `"none"` and be honest about
  being a public client.**

### Consequence for the threat model

Open registration plus no client authentication means **anyone can register a
client called "Grid-Commander"**. Nothing binds our name to our registration.
A phishing client could present a plausible consent screen. We cannot prevent
that; it is a property of the platform.

What we can do, and what the design must therefore include:

- Pin one `client_id` per deployment in configuration. Never register at
  runtime, never per user — a registration created on the fly is unverifiable.
- Exact-match `redirect_uris`. No wildcards, no path suffixes.
- PKCE S256 on every authorization, with a single-use `state` bound to the
  user's session.
- Tell users, in our own UI, which `client_id` they authorized, so a suspicious
  grant is at least visible after the fact.

## F-2 — Registration-time scope is a hard ceiling worth using

The second registration requested `"mcp:read mcp:wager"` and was granted both.

That makes registration scope a **defence in depth for D-3** (never request
wager authority in MVP). Rather than merely omitting `mcp:wager` from each
authorization request — a line of code someone could later add — register the
production client with `scope: "mcp:read"` only. Wager authority then becomes
**unrequestable**, not merely unrequested, and stepping up later is a deliberate
act of re-registering rather than editing a query string.

## What remains unproven

**Token lifetimes and refresh behaviour.** Completing an authorization requires
a real user consenting in a browser, which cannot be done headlessly. The
following are still unknown and must be discovered on first real connection:

- Access token lifetime
- Whether a refresh token is issued in practice (it is advertised in
  `grant_types_supported`)
- Refresh token rotation and absolute expiry
- Whether incremental scope step-up re-consents everything or only the delta

The design must not assume any of these. It should read expiry from the token
response and treat a missing `expires_in` as "unknown, refresh eagerly".

## Registrations created

Two, both against a localhost redirect URI, both harmless. They cannot be
deleted (no RFC 7592 endpoint). Production will use a third, registered once
against the real redirect URI and pinned in configuration.
