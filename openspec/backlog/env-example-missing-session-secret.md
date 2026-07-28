---
id: env-example-missing-session-secret
title: .env.example omits SESSION_SECRET, so a correctly-followed setup 500s on every page
type: bug
status: open
priority: p1
created: 2026-07-28
updated: 2026-07-28
change: ""
capability: app-access
blocked_by: []
tags: [config, serving]
---

# .env.example omits SESSION_SECRET, so a correctly-followed setup 500s on every page

## What

`loadConfig()` in `src/config.ts:29-46` calls `required()` for **five**
variables:

| variable | in `.env.example`? |
|---|---|
| `BATTLEGRID_CLIENT_ID` | yes |
| `BATTLEGRID_REDIRECT_URI` | yes |
| `DATABASE_URL` | yes |
| `TOKEN_ENCRYPTION_KEY` | yes |
| **`SESSION_SECRET`** | **no** |

`required()` throws when the value is absent, and `loadConfig()` runs on every
request that resolves a session. So someone who copies `.env.example`, fills in
every value it lists, and starts the application gets **HTTP 500 on every page
except `/connect`**.

## Why it matters

This is the whole product. `/connect` is the only route that does not resolve a
session, so it is the only one that works — which makes the failure look like a
half-finished app rather than a missing variable.

Nothing catches it. The build is green, `typecheck`, `lint` and all 394 tests
pass, and the 51 database tests pass because they construct their own
configuration rather than going through `loadConfig()`. The first thing that
notices is a browser.

`serving-is-not-gated` predicted exactly this shape — "the build is gated;
starting the application and requesting a page is not" — and this is a second,
independent instance of it.

## Evidence

Reproduced 2026-07-28 against PostgreSQL 16 with migrations applied, on a
production build (`npm run build && npm start`).

With the four documented variables set:

```
/connect                   200
/agents                    500
/agents/new                500
/strategies                500
/assistant                 500
/audit                     500
… every capability route   500
```

Server log: `⨯ Error: SESSION_SECRET is not set`, once per request.

Adding `SESSION_SECRET` and changing nothing else:

```
all 16 routes              200
```

## Fix

Add to `.env.example`, with the same care the other entries get — it signs the
session cookie and is deliberately distinct from `TOKEN_ENCRYPTION_KEY`
(`src/config.ts:15`, "different job, different blast radius"):

```
# Signs the session cookie. Distinct from TOKEN_ENCRYPTION_KEY on purpose:
# this one only proves who you are, that one protects a BattleGrid token.
# Generate: openssl rand -base64 32
SESSION_SECRET=
```

`ALLOW_INSECURE_COOKIES` is worth documenting in the same pass. It is
opt-*out*-only by design (`src/config.ts:44`) and local development over plain
HTTP needs it, so leaving it undocumented sends people looking for a bug that
is a deliberate default.

## Notes

The real fix is the one `serving-is-not-gated` describes: a gate that starts the
application from `.env.example` alone and requests a page. Documenting the
variable closes this instance; only that gate stops the next one.

Found while verifying `close-the-reachability-gap` — the change is unaffected
and its five new routes serve correctly. This was in front of them the whole
time and nothing had ever requested a page to see it.
