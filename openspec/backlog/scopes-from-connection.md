---
id: scopes-from-connection
title: The adapter reports a constant scope set instead of the grant's
type: debt
status: open
priority: p2
created: 2026-07-27
updated: 2026-07-27
change: ""
capability: battlegrid-connection
blocked_by: []
tags: [security, scope, battlegrid]
---

# The adapter reports a constant scope set instead of the grant's

## What

`McpBattleGridAdapter.scopesFor()` (`src/infrastructure/battlegrid/mcp-adapter.ts:152`)
returns the literal `['mcp:read']` rather than reading the scopes recorded on
the connection at exchange time. The scope check in `beginGuardedCall` therefore
measures every call against an assumption, not against what BattleGrid actually
granted.

Recorded as F-3 in the architecture review, DL-14 in the decision log, and
PG-004 in the production gate.

## Why it matters

It is correct today and wrong the moment anything changes. The pinned
registration declares `mcp:read` as a ceiling (DL-4), so no grant can currently
carry more, and the constant and the truth coincide.

The direction of the eventual failure is the problem. If a grant ever comes back
narrower than `mcp:read` — a user consenting to less, a server-side policy
change, a partial grant — the adapter reports authority the connection does not
hold, and the guard permits a call that BattleGrid will refuse. It fails open.
The whole point of the scope check is that it refuses *before* attempting, so a
check that can over-report is a check that is not doing its job.

## Fix

Read the recorded scopes from the connection the token belongs to, and pass them
into the guard. The connection is already the authority on what was granted —
`connections.scopes` is populated at exchange time in `connect.commands.ts`.

Naturally belongs to whichever change first needs a scope other than
`mcp:read` — currently expected to be `author-agents`.

## Not blocking

The failure mode cannot be reached under the current deployment without a
deliberate re-registration, which is itself a reviewed act (DL-4).
