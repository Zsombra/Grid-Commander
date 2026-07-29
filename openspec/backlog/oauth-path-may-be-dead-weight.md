---
id: oauth-path-may-be-dead-weight
title: The delegated OAuth path may now be dead weight
type: question
status: open
priority: p2
created: 2026-07-29
updated: 2026-07-29
change: ""
capability: battlegrid-connection
blocked_by: []
tags: [architecture, personal-mode]
---

# The delegated OAuth path may now be dead weight

## What

`a-personal-key` added a second way to reach BattleGrid and left the first
alone. If Grid-Commander stays a personal controller, the delegated path — PKCE,
the callback route, token refresh, per-user encrypted tokens, the `connections`
and `oauth_transactions` tables, `/connect` — is code that ships and never runs.

## Why it was kept

Deleting it on one turn of direction would have been a large irreversible change
made without evidence. It is audited, archived, and correct for the product the
idea brief describes; the personal path had not been run once when the direction
changed.

## What would settle it

Use. If a few weeks of real use never touches `/connect`, removing it is a
deliberate cleanup with evidence behind it rather than a guess.

Worth weighing on the other side:

- **It is the reason the brief believes third-party clients are permitted.** No
  terms of service are published; the argument was that BattleGrid deploys a
  full delegated-authorization stack, which is meaningless for a first-party
  app. Removing the client does not remove that reasoning, but it does remove
  the product's only demonstration of it.
- **It is what a multi-tenant version would need back.** If Grid-Commander ever
  serves anyone but its owner, this is the capability, and it is expensive to
  rebuild correctly — the guard sequence, single-use state, and the uniqueness
  one identity per account rests on are all tested against a real database.

## Notes

Not a defect. Filed so that the decision is made rather than drifted into, and
so the next person to read `battlegrid-connection` knows the second path exists
on purpose.
