---
id: wager-authority-has-a-second-gate-we-do-not-model
title: mcp-wager is not sufficient to move money - there is a Profile-level signer gate and daily caps
type: question
status: open
priority: p3
created: 2026-08-13
updated: 2026-08-13
change: ""
capability: battlegrid-connection
github: "205"
blocked_by: []
tags: [battlegrid, safety, consent, live]
---

# Wager authority has a second gate, and caps, that nothing here models

## What

BattleGrid's own consent screen, read 2026-08-13 while answering
[[prove-token-lifetimes]] (#93), states two things no tool response or schema in
this repository carries:

> Wager submissions are protected by daily limits (**10 wagers/day, $500 max**).
> **Signer consent must be enabled in your Profile.**

So `mcp:wager` is **necessary but not sufficient**. A grant carrying it still
cannot move money unless a separate per-account toggle is on, and even then it
is capped per day.

## Why it matters

The product's safety model treats scope as the boundary: step up to
`mcp:wager`, and money is reachable. The platform's model has three layers -
scope, a profile-level signer switch, and daily caps.

That cuts both ways, and both are worth knowing:

- **The consent copy may overstate the risk.** Telling a user that granting
  `mcp:wager` lets the product stake their balance is not quite true if their
  signer consent is off. Overstating is far safer than understating, but R4 aims
  at honesty, not at worst-casing.
- **A wager could fail for a reason the product cannot name.** If a submission
  is refused because signer consent is off, nothing here knows that state
  exists, so it would surface as an unexplained refusal - which
  `failure-is-explained` exists to prevent.

CLAUDE.md's third domain fact - "this product holds credentials that configure
other people's agents, and with wager scope, move their money" - is still right
in direction and slightly wrong in mechanism.

## What is not known

Whether either fact is **readable over MCP**. `get_account_state` returns
`mcpWagerEnabled` and `tradingWalletProvisioned`; neither is obviously the
signer-consent switch, and no field across the 114 tools obviously carries the
daily counter. That is the first thing to check, and it is a read-only probe.

## Evidence

- BattleGrid consent screen, 2026-08-13, captured by the operator during the
  #93 walk
- `get_account_state` live 2026-08-13: `mcpWagerEnabled: true`,
  `tradingWalletProvisioned: true`

## Notes

The same screen confirmed, in the vendor's own words, that `mcp:read` is
write-capable: "create, update, bind, archive, or restore non-financial
BattleGrid configuration. Cannot submit wagers or move funds." That is
CLAUDE.md's first domain rule - until now our inference, now corroborated.
