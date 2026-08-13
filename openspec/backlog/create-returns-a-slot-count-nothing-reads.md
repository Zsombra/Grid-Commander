---
id: create-returns-a-slot-count-nothing-reads
title: create_intelligence_agent returns the new slot count and createAgent throws it away
type: debt
status: done
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

---

# Closed 2026-08-13 — the defect is real and has no consequence

`createAgent` does drop `slotUsage`. Traced end to end, nothing is worse for it.

**The staleness this item is priced on does not happen.** The only surface that
renders a slot count is `CreateAffordance`
(`src/presentation/components/agent-roster.tsx:224-242`, "... {creation.remaining}
slots remaining"), fed by `app/(app)/agents/page.tsx:14`, which calls
`listAgents` in the page body on every request. The route is dynamic — 
`src/presentation/session.ts` awaits `cookies()` — and `next.config.ts` sets no
`revalidate` or `staleTimes` override. And the create path redirects to
`app/(app)/agents/new/page.tsx:134` -> `/agents/{id}`, which renders no slot
count at all.

So there is no moment at which a user sees a count that is one short. The
authoritative number was thrown away and the next read fetched it again.

**Two of this item's supporting claims were also wrong**, found in the
2026-08-13 re-verification:

- *"It is the only agent write that carries a second key."* `update_intelligence_agent`
  declares `agent` **and** `feasibilityAdvisory` in the v18.2.0 contract
  (`docs/BATTLEGRID_MCP_REFERENCE.md:564`), and `updateAgent` drops that sibling
  too (`agent-adapter.ts`, `return mapAgent(payload['agent'])`). The 2026-08-13
  wire walk saw only `{agent}` from update, which is how the claim survived: the
  observed shape was compared to itself rather than to the declared one. That is
  #198's lesson arriving again.
- *"It reads one short until something refetches."* Above.

**Why this closes rather than getting a three-line fix.** Capturing the field
would add a value nothing reads, on the argument that a future surface might.
This repository has a whole open item about payloads carrying more than anything
reads ([[the-payload-carries-more-than-is-read]]); adding to that pile to close a
p3 with no observable symptom is the wrong trade.

The second reason the item gives — that a create is the moment a user most wants
to know how many slots are left — is a **feature**, not this defect. If that is
wanted, it is a surface change with a delta spec, and it should be proposed as
one rather than smuggled in as a mapper fix. Filed nothing for it, because
nobody has asked for it.
