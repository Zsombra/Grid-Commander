---
id: a-proposal-cannot-be-recorded-on-a-personal-deployment
title: proposals.user_id references users, and personal mode has no users row
type: bug
status: open
priority: p2
created: 2026-08-07
updated: 2026-08-07
change: ""
capability: mcp-control
blocked_by: []
tags: [proposals, personal-mode, database]
---

# proposals.user_id references users, and personal mode has no users row

## What

`proposals.user_id` carries `references(() => users.id)`
(`src/infrastructure/db/schema/index.ts`), and `users` rows are written by
exactly one path: `DrizzleConnectionRepository` on the OAuth callback
(`drizzle-connection-repository.ts:76`). A personal deployment acts as
`OWNER_USER_ID = 'owner'` (`owner-only-user.ts:21`), for which no code inserts
a `users` row — so `record_proposal` over the MCP server on a personal
deployment should fail its insert with a foreign-key violation.

Noticed while building the signal record's tables, which deliberately use
plain `user_id` text like `audit_entries` for exactly this reason
(`tests/db/signal-record.test.ts`, "needs no users row").

## Why it matters

`docs/FIRST_SESSION.md` boots the operator in personal-key mode, and the
proposals flow is one of the MCP server's headline behaviors
(`the-model-can-propose-and-only-a-human-agrees`). If the FK fires, a model's
propose call on the operator's own deployment errors every time — on the
deployment mode the operator actually runs.

## Evidence

- Schema: `proposals.userId` → `.references(() => users.id)`.
- `grep -rn "insert(users)" src/` → only
  `drizzle-connection-repository.ts:76` (OAuth callback path).
- `tests/db/proposals.test.ts` inserts `users` rows in `beforeEach`, so the
  suite never meets the personal-mode state.
- Unverified against a live personal deployment — `proposal-probe` may have
  run delegated. One run of the MCP server with a `bg_live_` key and a
  `propose_agent_change` call settles it.

## Notes

If confirmed, two candidate fixes, one decision: drop the FK (match
`audit_entries`; ownership stays in the WHERE), or insert a `users` row for
`owner` at personal boot (gives personal mode an identity row, but invents a
`battlegrid_subject` when the account read fails). The first is smaller and
matches the newest tables' precedent.
