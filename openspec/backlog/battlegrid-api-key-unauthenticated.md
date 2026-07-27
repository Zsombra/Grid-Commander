---
id: battlegrid-api-key-unauthenticated
title: The BattleGrid API key does not authenticate any known endpoint
type: question
status: open
priority: p1
created: 2026-07-27
updated: 2026-07-27
change: ""
capability: ""
blocked_by: []
tags: [battlegrid, api, access]
---

# The BattleGrid API key does not authenticate any known endpoint

## What

A `bg_live_`-prefixed key was issued for programmatic access to
battlegrid.trade. It does not authenticate. Every protected endpoint returns
`401 {"error":"Unauthorized"}` **identically with and without the key**, under
every header scheme tried.

Until this resolves, nothing can be built against the live API — only against
the published documentation.

## Why it matters

It is the single blocker on programmatic work. Everything about the agent and
strategy surface is documented well enough to design against
(`docs/BATTLEGRID_SURFACE_MAP.md`), but no configuration can be read back, no
agent state inspected, and nothing verified against reality without working
credentials.

## Evidence

Probed 2026-07-27, read-only GETs only.

| Endpoint | No auth | With key (5 schemes) |
|---|---|---|
| `/api/platform/config` | 200 | 200 — public, cannot discriminate |
| `/api/account/balance` | 401 | 401 |
| `/api/intelligence/agents` | 401 | 401 |
| `/api/market-grid-sessions/my-live` | 200 `{"sessions":[]}` | 200 — same empty result |

Header schemes tried: `Authorization: Bearer <key>`, `X-API-Key`, `x-api-key`,
raw `Authorization: <key>`, `X-BG-API-Key`.

The empty `my-live` result is itself a tell: an authenticated caller with live
sessions should not see `[]`, so the request is being treated as anonymous
rather than rejected.

Host discovery: `api.battlegrid.trade`, `developers.battlegrid.trade`, and
`agent.battlegrid.trade` do not resolve. Only `docs.battlegrid.trade` exists.
No public or developer API is documented anywhere in the docs set, and no
API-key auth path appears in the web app bundle — the app authenticates by
Privy wallet session via `/api/auth/session`.

The only API-key concept found in the product is `/api/intelligence/byok/key`,
which is the *inbound* BYOK form where a user supplies their own LLM provider
key. That is the opposite direction and takes a `{provider, apiKey}` pair, so a
`bg_live_` value is unlikely to belong there.

## Notes

Possibilities, in rough order of likelihood:

1. The key is for a surface that is not yet deployed or not publicly routed.
2. The key needs activation, or is scoped to an account with nothing in it.
3. Key auth exists but expects an undocumented header or a query parameter.
4. The key was issued by a system that is not yet wired to the API.

Blocked on an external answer, not on another backlog item — hence `status: open`.
Needs an answer from the BattleGrid side before more probing — further guessing
at header names against a production host is not a good use of anyone's rate
limit, and a `_live_` key means real credentials against real custody.

**Do not commit the key.** It currently lives only in the session scratchpad at
`0600`, outside the repo.
