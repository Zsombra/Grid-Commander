---
id: oauth-cannot-complete-without-a-subject
title: The OAuth path cannot complete - BattleGrid issues no subject, and the adapter requires one
type: bug
status: open
priority: p2
created: 2026-08-13
updated: 2026-08-13
change: ""
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
