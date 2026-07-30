---
id: cannot-verify-what-a-key-grants
title: The product cannot read what a bg_live_ key actually carries
type: question
status: open
priority: p2
created: 2026-07-29
updated: 2026-07-29
change: ""
capability: battlegrid-connection
blocked_by: []
tags: [personal-mode, scope]
---

# The product cannot read what a bg_live_ key actually carries

## What

In personal mode, `BATTLEGRID_KEY_SCOPES` is what the operator *says* the key
holds. Nothing verifies it. The key may carry `mcp:wager` while the declaration
says `mcp:read`, and the product would never know.

The delegated path has no such gap: the grant was registered for named scopes,
so authority beyond them is unobtainable.

## Why it matters, and how much

Less than it first appears, and worth being exact.

The declaration is **restraint, not protection**. Declaring `mcp:read` stops
this product from attempting a wager tool; it does not stop the key. Anything
else holding that key is unaffected.

What actually protects the account is unchanged and was always the real
boundary: every tool is classified from BattleGrid's own annotations, and
destructive ones need a confirmation naming the blast radius. Architecture policy
P1 already says scope must never be the thing that decides — this makes that
concrete rather than aspirational.

So the risk is narrow: a user who believes the declaration is enforced. The
disclosure banner says it is not, in the product, on every page.

## What would close it

Find out whether BattleGrid reports a key's scopes. The reference records
`positionManagementPresets` and `tradingDefaults` for the config catalog and
says nothing about introspecting a credential; the OAuth metadata advertises
`authorize`/`token`/`register`/`revoke` and no introspection endpoint.

If one exists, read it at startup and refuse to start when the declaration
claims *less* than the key holds — a mismatch worth failing on, because it means
someone believes they are safer than they are.

If none exists, this closes as "not knowable", and the disclosure is the answer.
