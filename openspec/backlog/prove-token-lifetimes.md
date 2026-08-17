---
id: prove-token-lifetimes
title: Token lifetime, refresh rotation and step-up behaviour are unproven
type: question
status: done
priority: p2
created: 2026-07-27
updated: 2026-08-13
change: ""
capability: battlegrid-connection
github: "93"
blocked_by: []
tags: [oauth, battlegrid, assumption]
---

# Token lifetime, refresh rotation and step-up behaviour are unproven

## What

Three facts about BattleGrid's OAuth grants were never established, because
establishing them requires a human consenting in a browser and cannot be done
headlessly:

1. How long an access token actually lives.
2. Whether refresh tokens rotate on use, and whether the old one is invalidated.
3. Whether scope can be stepped up on an existing connection without the user
   re-consenting from scratch.

Recorded as DL-8, task 0.2 (deliberately left unchecked), and PG-005 in the
production gate.

## Why it matters

Only mildly, and deliberately so. `connection.ts:43` reads `expires_in` from the
response and falls back to 60 seconds when it is absent — the shortest safe
window. Being wrong about the real lifetime costs an unnecessary refresh; it
never leaves stale authority in place. The assumption was chosen so that its
failure mode is expense, not exposure.

Item 3 matters more than the other two, because the answer shapes how step-up to
`mcp:wager` will have to work. If BattleGrid cannot step up incrementally, the
user re-consents to everything, and the consent copy (R4) has to say so.

## Fix

Record the real values on the first live human connection: log `expires_in`,
attempt one refresh and check whether the original refresh token still works,
then attempt an authorization request with an added scope against an existing
connection. Update DL-8, check off task 0.2, and revisit
`UNKNOWN_EXPIRY_FALLBACK_SECONDS`.


---

# Answered 2026-08-13 — walked end to end with the operator consenting

A client was registered by DCR, the operator consented twice in a browser, and
every leg was run against live BattleGrid. All tokens were revoked afterwards
and verified dead (401 on `/mcp`).

## 1. Access token lifetime: **3600 seconds**

`expires_in: 3600` on the authorization-code grant, and 3600 again on refresh.
Present every time.

`UNKNOWN_EXPIRY_FALLBACK_SECONDS = 60` therefore **never fires** against this
server, and should stay exactly as it is: it is the answer to a *missing* field,
not to a short one, and its reasoning — assume the shortest safe window, so
being wrong costs a refresh rather than leaving stale authority — is untouched
by learning the real number. No change.

## 2. Refresh rotation: **yes, and the old token dies — but you cannot tell why**

One refresh returned a new access token *and* a new refresh token. Replaying the
consumed one fails.

**How it fails is the finding.** Every rejected refresh returns `500
server_error`, never `400 invalid_grant`:

```
replayed (consumed) token   500  x3, deterministic
random 64-char token        500
the literal string "nope"   500
```

A valid refresh returns 200, so the endpoint works — it simply has no
`invalid_grant` path. The consequence is that a client **cannot distinguish
"your refresh token was rotated away, reconnect" from "BattleGrid is down, back
off"**, and those demand opposite responses. Filed as
[[refresh-rejection-is-indistinguishable-from-an-outage]].

## 3. Scope step-up: **no incremental consent — everything is re-approved**

Requesting `mcp:read mcp:wager` against an existing `mcp:read` grant re-presents
**both** permissions on a fresh consent screen. Not "just the new one", not a
silent pass-through. The exchange returned `scope: mcp:read mcp:wager`.

This is the item's own "matters more than the other two", and the answer is the
one that constrains R4: **the consent copy must say that stepping up re-approves
everything**, because that is what the user will see.

## What the walk found that this item did not ask

- **The token response carries no `sub`**, so `mcp-adapter.ts:431` throws on
  every grant and no OAuth connection can complete. BattleGrid is plain OAuth
  2.1, not OIDC — `/.well-known/openid-configuration` is 404 and no
  `userinfo_endpoint` is advertised. Filed as
  [[oauth-cannot-complete-without-a-subject]]; it also falsifies
  [[oauth-path-may-be-dead-weight]] (#91).
- **Dynamic Client Registration works** — unauthenticated POST, 201, public
  client, no secret issued.
- **Revocation works** for a public client and is immediate.
- **BattleGrid'\''s own consent screen confirms `mcp:read` is write-capable**:
  "create, update, bind, archive, or restore non-financial BattleGrid
  configuration. Cannot submit wagers or move funds." The first line of
  CLAUDE.md'\''s domain rules, in the vendor'\''s words.
- **Wagering has platform-side limits and a second gate** — "10 wagers/day,
  $500 max" and "Signer consent must be enabled in your Profile". Filed as
  [[wager-authority-has-a-second-gate-we-do-not-model]].

DL-8 and task 0.2 can be closed. PG-005 too.
