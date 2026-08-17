---
id: cannot-verify-what-a-key-grants
title: The product cannot read what a bg_live_ key actually carries
type: question
status: done
priority: p2
created: 2026-07-29
updated: 2026-07-31
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

## Closed 2026-07-31: not knowable, as predicted

All four channels checked, live where the platform allowed it:

1. **No OAuth introspection endpoint.** The live discovery document
   (fetched 2026-07-31) advertises `authorize`, `token`, `revoke`,
   `register` — no `introspection_endpoint` (RFC 7662).
2. **The conventional path does not exist.** `POST /introspect` → 404.
3. **No MCP tool reports a credential's scopes.** Swept all 110 declared
   outputs in the surface artifact: nothing introspects the caller's key.
4. **The nearest fact is `get_account_state.mcpWagerEnabled`** — an
   *account-level* upper bound, not the key's scopes. It cannot distinguish
   a read-only key on a wager-enabled account, so it cannot verify a
   declaration. (It could one day power a disclosure improvement: when the
   account itself cannot wager, the product could say so regardless of what
   the key claims. Not built — display nuance, not verification.)

The only true test of what a key carries is attempting a wager-scoped call
and watching the refusal — a write, unacceptable as a startup check.

So the declaration stays restraint-not-protection, and the disclosure banner
stays the answer, exactly as this item anticipated. Architecture policy P1
(scope never decides safety) is the standing mitigation.
