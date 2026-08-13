---
id: wager-authority-has-a-second-gate-we-do-not-model
title: The daily wager cap is enforced by the platform and published nowhere on its own API
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

# A cap the platform enforces that its own API does not carry

## What

BattleGrid's own consent screen, read 2026-08-13 while answering
[[prove-token-lifetimes]] (#93), states two things:

> Wager submissions are protected by daily limits (**10 wagers/day, $500 max**).
> **Signer consent must be enabled in your Profile.**

So `mcp:wager` is **necessary but not sufficient**. A grant carrying it still
cannot move money unless a separate per-account toggle is on, and even then it
is capped per day.

That screen remains the only evidence the cap exists at all. An exhaustive walk
of every declared output schema on the surface - all 114 tools, recorded below -
found no field anywhere carrying a per-day wager count or ceiling. The limit is
real, the platform enforces it, and no client can read it.

## What this repository models, and what it does not

The account-level toggle **is** modelled. This item's original framing - that
the product treats scope as the whole boundary and carries none of the rest -
was wrong on that point:

- `src/ports/account.ts:138` declares `mcpWagerEnabled: boolean` on `AccountState`
- `src/infrastructure/battlegrid/account-adapter.ts:137` maps it from the payload
- `src/application/use-cases/read-wager-authority.query.ts:24` types the result
  as `{kind: 'authority', accountAllowsMcpWagers: boolean}`, and line 34 fills it
  from `result.state.mcpWagerEnabled`

What is genuinely unmodelled is the **daily cap**. The reason is now measured
rather than assumed: it is not on the wire to model.

## Why it matters

- **The consent copy may overstate the risk.** Telling a user that granting
  `mcp:wager` lets the product stake their balance is not quite true if their
  signer consent is off. Overstating is far safer than understating, but R4 aims
  at honesty, not at worst-casing. Still open - see below.
- **A wager can fail for a reason no client can name.** If a submission is
  refused because the account has spent its ten wagers for the day, nothing here
  can say so, and this is not a gap closable by reading a field we overlooked.
  The counter is not published. `failure-is-explained` can restate a platform
  refusal after the fact, but it cannot name this one in advance or show
  remaining headroom before a write.

CLAUDE.md's third domain fact - "this product holds credentials that configure
other people's agents, and with wager scope, move their money" - is right in
direction and still slightly wrong in mechanism. Wager scope plus signer consent
moves their money, up to a daily ceiling, and only the first of those three is
legible to this product.

## What is not known

Whether `mcpWagerEnabled` **is** the Profile signer-consent switch. It is the
only candidate on the surface - no other field on any of the 114 tools names
signer or consent - and it reads `true` on this account, which is consistent
with the toggle being on. Consistent is not proof. The single way to settle it
is to turn the Profile switch off, re-read `get_account_state`, and see whether
the boolean follows. That is an operator action in the BattleGrid UI, not a tool
call, and not something this repository can perform.

Until then the honest statement is: one candidate, unconfirmed identity.

## Evidence

- BattleGrid consent screen, 2026-08-13, captured by the operator during the
  #93 walk
- `get_account_state` live 2026-08-13 ~20:00 UTC, account `username: "Fibonacci"`,
  BattleGrid v18.2.0, read-only: `mcpWagerEnabled: true`,
  `tradingWalletProvisioned: true`
- Output-schema walk of `docs/battlegrid-mcp-capabilities.json`, recorded below

## Notes

The same screen confirmed, in the vendor's own words, that `mcp:read` is
write-capable: "create, update, bind, archive, or restore non-financial
BattleGrid configuration. Cannot submit wagers or move funds." That is
CLAUDE.md's first domain rule - until now our inference, now corroborated.

---

# Re-checked 2026-08-13 - the surface walked, one half of the question closed

Every declared output schema in `docs/battlegrid-mcp-capabilities.json` was
walked to its leaves and every field name matched against `wager`, `signer`,
`consent`, `dailyLimit`, `dailyCap`, `wagersPerDay`, `remainingWagers`. The
artifact records `serverInfo.version: 18.2.0` and 114 tools, so it is level with
the live platform rather than the major version behind it was during #198.

**Three field paths matched, across two tools. That is the whole of it:**

| Tool | Path | Type |
|---|---|---|
| `get_account_state` | `mcpWagerEnabled` | boolean |
| `get_account_state` | `stats.totalWagered` | number |
| `get_agents_hub` | `summary.dailyLimit` | number |

`summary.dailyLimit` is not the wager cap. It carries no description, so the
reading is **inferred from its siblings**, which are the only evidence available:
`activeAgents, activePercent, agentsWithOpenPositions, avgCostPerMessageUsd,
avgPnlPerAgentUsd, messagesUsedPercent, messagesUsedToday, openPositionCount,
totalAgents, totalCost24hUsd, totalPendingApprovalCount, totalRealizedNetPnl`.
It sits directly beside `messagesUsedToday` and `avgCostPerMessageUsd`, in an
object otherwise entirely about agent message spend. It is the message quota.

`stats.totalWagered` is likewise **inferred**, not stated, to be a lifetime
figure: its siblings are `avgRank, level, rank, tierClass, totalGames, winRate`,
which are career statistics. Either way it cannot serve as a daily counter. A
lifetime total does not yield today's remaining ten, and nothing publishes the
window it would have to be differenced against.

What follows:

1. **The daily wager cap is not readable over MCP.** This closes half this
   item's original question with a definitive negative. The scope of the
   measurement, stated precisely: it is over *declared output schemas*, not over
   live response bodies from all 114 tools. A response could in principle carry
   an undeclared field. The schema record is the strongest evidence obtainable
   without 114 live calls, and #198 is the standing reminder that a schema
   record is a record and not the wire.
2. **`mcpWagerEnabled` is the only signer-consent candidate that exists.** That
   is materially stronger than this item's original wording, which said neither
   account field was "obviously the signer-consent switch". It is not obvious.
   It is also the only one, on the entire surface. The open question narrows from
   "which field, if any" to "is this one it", and only the operator's Profile
   toggle can answer that.

The item stays open on the second point alone.
