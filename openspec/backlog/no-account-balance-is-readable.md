---
id: no-account-balance-is-readable
title: get_account_state publishes the wallet balance and nothing calls it — the exposure comparison is buildable
type: feature
status: done
priority: p2
created: 2026-08-10
updated: 2026-08-10
change: "a-cap-above-the-money-cannot-bind"
capability: agent-understanding
github: "84"
blocked_by: []
tags: [battlegrid, risk, agent, surface, unread-payload]
---

# The balance is readable, and unread

Tracked on GitHub as **#84**, which carries the correction in full.

> **This item was filed with the opposite headline and corrected the same day.**
> The original claim was that no tool publishes an account balance. One does.
> The id is kept so the link from `a-stop-inside-the-noise-looks-like-a-tight-stop`
> does not rot.

## What

`get_account_state` returns `balance: {hasAccount, totalBalance, usdc}` — six
declared fields, all six observed live, no arguments required, classification
`read`. **The product has never called it.** It appears twice in `src/` and
neither is a call: a comment in `account-adapter.ts:10` explaining why it was
not chosen to answer *which account is this* (correct — it carries no id), and
the read-classification list. `SlotUsage` comes from `list_intelligence_agents`,
not from here.

So the sharpest row of `a-stop-inside-the-noise-looks-like-a-tight-stop` —
`maxConcurrentExposureUsd` against the balance, a **$250** cap against a
**$49.05** balance — is an ordinary `/propose`.

## Why it matters

An exposure cap above the money behind it cannot bind, and reads as a limit.
It is the one comparison in the original p1 that no shipped surface makes.

## Evidence

`docs/battlegrid-mcp-surface.json` — `get_account_state`, `declared_output` and
`observed` both list `balance`. Found by grepping `tools[].description` for
balance/equity/capital/fund across all 114 tools.

**And the correction that matters more**: the gate-block `equityUsd` this item
originally pointed at is *not* a balance. `openspec/JOURNAL.md` established it —
`equityUsd` is the agent's own `maxConcurrentExposureUsd`. Setting it against
that field would have compared the cap with itself.

## Unblocked, 2026-08-10 — there is only one pool

Read live, both sides at the same moment:

| | |
|---|---|
| `get_account_state` → `balance.usdc` | **43.667427** |
| `list_user_active_positions` → `totals.marginedUsd` | **25.229691** (7 positions, notional 89.29) |

$25.23 of margin sits inside a $43.67 balance, and **`balance.usdc` is the only
balance the platform publishes anywhere on the 114-tool surface**.
`tradingWalletProvisioned` is a boolean — whether the wallet exists — not a
second figure. There is no second pool to confuse it with, so the comparison is
honest as *the agent's cap against the only balance the platform reports*.

`get_agent_fund_allocation`, the one tool that claims to split money per agent,
reports `committedUsd: 0` for an agent holding $17.45 of margin at that same
moment (`performance-and-allocation-are-unmodelled`, GitHub #107). It cannot
refine this and must not be used to.

**The finding this makes renderable**: `THE .0` carries
`maxConcurrentExposureUsd: 250` against a **$43.67** balance — a cap 5.7× the
money behind it, which cannot bind and reads as a limit.

Also unread at the account level: `agentSlots {limit 3, used 3, remaining 0}`
and `mcpWagerEnabled: true`.

## Notes

~~**Establish the pool before building the comparison.**~~ Answered above. The
description said
"play balance (USDC)" and "use this to check if you're ready to play", which is
arena language, and `tradingWalletProvisioned` sits beside it as a separate
flag. Whether the play balance and the perps trading wallet are one pool is
unestablished, and assuming they are is the mistake this codebase keeps
recording. One live read settles it; needs a key.

If they are separate, the tool is still worth reading — `mcpWagerEnabled` is the
fact that decides whether the arena's write path could ever be offered, and
nothing reads it either.

**The lesson.** The original search was over the three ports the product
happened to have, not over the platform's own 114-tool map. "This product
cannot read X" is a claim about the platform and must be checked against
`docs/battlegrid-mcp-surface.json`, which answered it in one grep.

## Done, 2026-08-10 — `a-cap-above-the-money-cannot-bind`

`get_account_state` is now read behind `AccountStatePort`, and the exposure cap
renders against the balance on `/agents/[id]/limits`.

The live run found more than the item described. `THE .0` at $250 against $43.60
is 5.73× — but **Breakwater, Undertow and Vanguard each carry a $45 cap against
that same $43.60**, over by $1.40, so they cannot bind either. A $45 cap looks
carefully chosen; that is exactly the class of thing this panel exists to catch.
All five live agents have a non-binding exposure cap.

`agentSlots` and `mcpWagerEnabled` come along with the read and are deliberately
unrendered — `two-account-facts-nothing-renders` (GitHub #121).
