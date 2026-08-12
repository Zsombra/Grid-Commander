---
id: create-returns-a-slot-count-nothing-reads
title: create_intelligence_agent returns the new slot count and createAgent throws it away
type: debt
status: open
priority: p3
created: 2026-08-13
updated: 2026-08-13
change: ""
capability: agent-authoring
github: "200"
blocked_by: []
tags: [battlegrid, agent-authoring, adapter]
---

# create returns the new slot count, and we discard it

## What

Walked live against v18.2.0 on 2026-08-13 while answering
[[confirm-agent-write-response-shape]]. `create_intelligence_agent` answers:

```json
{ "agent": { ... }, "slotUsage": { "level": 3, "rank": {...},
                                   "limit": 3, "used": 3, "remaining": 0 } }
```

It is the only agent write that carries a second key. `listAgents` already
reads exactly this shape through `mapSlotUsage`
(`agent-adapter.ts:137`), so the mapper exists and is proven — `createAgent`
simply drops the field.

## Why it matters

p3, and it is freshness rather than correctness. After a create, the slot count
the roster shows is whatever the last `list` said, so it reads one short until
something refetches. The authoritative post-create number was in the response
and was thrown away.

There is a second, smaller reason: a create is the one moment a user is most
likely to care how many slots are left, because they have just spent one.

## Evidence

- Live probe 2026-08-13, v18.2.0 — create of `GC probe shape` returned
  `slotUsage {limit: 3, used: 3, remaining: 0}` alongside the agent
- `src/infrastructure/battlegrid/agent-adapter.ts:137` — `mapSlotUsage`, already
  used by `listAgents`
- `src/infrastructure/battlegrid/agent-adapter.ts` `createAgent` — reads
  `payload['agent']` only

## Notes

The fix is small but it is not free: `createAgent` returns `Agent`, so handing
back slots means widening that return type and touching its callers. Worth
doing when something next opens that path, not on its own.

Related: [[two-account-facts-nothing-renders]] — the item that made slot usage
readable in the first place.
