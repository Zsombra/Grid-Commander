---
id: prove-token-lifetimes
title: Token lifetime, refresh rotation and step-up behaviour are unproven
type: question
status: open
priority: p2
created: 2026-07-27
updated: 2026-07-27
change: ""
capability: battlegrid-connection
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
