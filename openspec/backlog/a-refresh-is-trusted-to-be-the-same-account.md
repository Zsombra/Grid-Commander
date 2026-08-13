---
id: a-refresh-is-trusted-to-be-the-same-account
title: A refreshed grant is assumed to be for the same account, and nothing checks it
type: question
status: open
priority: p3
created: 2026-08-13
updated: 2026-08-13
change: ""
capability: battlegrid-connection
github: "206"
blocked_by: []
tags: [oauth, battlegrid, identity]
---

# A refreshed grant is assumed to be for the same account, and nothing checks it

## What

`the-connection-asks-who-it-is` establishes a delegated connection's identity by
reading the account **once**, at the moment the authorization code is exchanged.
A refresh reuses the connection's stored subject and does not ask again.

That is almost certainly right — a refresh token is issued against one grant, and
BattleGrid rotates both tokens on refresh (walked 2026-08-13, #93) — but it is an
assumption the product has not tested, and it is the same *shape* of assumption
that produced #203: identity taken on faith from a token response.

The question is whether re-asking on refresh is worth one read per refresh, or
whether it is ceremony that protects nobody.

## Why it matters

p3. The failure it would catch requires BattleGrid to issue a refreshed grant for
a **different** account than the one that was originally authorized, which would
be a serious platform defect rather than an ordinary condition. Nothing observed
suggests it happens.

It matters enough to record because the consequence, if it ever did happen, is
the exact one the identity work exists to prevent: a user acting inside another
account's workspace. Left unfiled, the next person to read the refresh path has
no way to tell "considered and judged unnecessary" from "never thought about".

## Evidence

- `src/application/use-cases/connect.commands.ts` — `CompleteConnectionCommand`
  is the only place a subject is established
- `src/ports/battlegrid.ts` — `refresh(refreshToken)` returns a `TokenGrant`,
  which after `the-connection-asks-who-it-is` carries no identity at all
- Refresh behaviour walked live 2026-08-13: 3600s lifetime, both tokens rotate,
  no incremental step-up (#93)

## Notes

Deliberately out of scope for `the-connection-asks-who-it-is`, and named as such
in that proposal — the change is about connections that cannot complete, and
adding a read to every refresh is a different trade.

Settling it needs one live observation rather than a build: refresh a delegated
grant, read the account with the refreshed token, and compare. That is one extra
call inside a walk the operator is already doing for
[[oauth-cannot-complete-without-a-subject]].
