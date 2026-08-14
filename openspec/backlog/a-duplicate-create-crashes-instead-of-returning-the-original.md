---
id: a-duplicate-create-crashes-instead-of-returning-the-original
title: The idempotency key never reaches BattleGrid, and a duplicate create is a raw Postgres error
type: risk
status: in-progress
priority: p1
created: 2026-08-14
updated: 2026-08-14
change: "a-duplicate-create-returns-the-original"
capability: agent-authoring
github: "239"
blocked_by: []
tags: [idempotency, create, error-handling, operator-facing]
---

#231 shipped an `idempotencyKey` on `/agents/new`, minted per render and carried
as a hidden input. The per-render minting is correct and **measured**:
`/agents/new` is server-rendered on demand — `.next/prerender-manifest.json`
lists only `/_not-found` — so every visitor gets a distinct key. That part of
the fix is sound and should not be reverted.

What the key then does is not what the records say it does.

## Measured

**It never reaches BattleGrid.** `mcp-adapter.ts` `callTool` passes
`idempotencyKey` into `beginGuardedCall`, which puts it on the audit entry. The
call itself is:

```ts
const envelope = await this.rpc(request.accessToken, 'tools/call', {
  name: request.tool,
  arguments: request.args,
});
```

`request.args` does not carry the key. So BattleGrid's own contract — *"a retry
with the same key returns the original result rather than repeating the
command"* — is quoted in `agent-form.tsx`, in
`tests/architecture/a-create-carries-a-dedupe-key.test.ts` and in the PR body,
and is not the mechanism in force.

**The local mechanism is a unique index with no conflict path.**
`drizzle-audit-repository.begin()` is a bare INSERT. The unique index
`audit_entries_user_idempotency_idx` on `(user_id, idempotency_key)` exists
(`drizzle/migrations/0000_sleepy_paibok.sql`). `findByIdempotencyKey` exists on
the port and on the repository — and has **zero production callers**; only
`tests/` and `tests/support/fakes.ts` call it. `onConflictDoUpdate` is used
elsewhere in this repo (`drizzle-connection-repository.ts:78`), so the idiom was
available and simply not applied here.

**So a second press is a 500.** `begin` runs before the RPC, so the duplicate
write genuinely is prevented — that half works. But the unique violation throws
from `beginGuardedCall`, which sits *outside* the adapter's try/catch.
`create-agent.command.ts` has no catch, the `create` action has no catch, and
there is no error boundary (#236). The operator whose agent *was* created sees
*"Application error: a server-side exception has occurred"*.

That is the same defect as #232, on the route #231 was written to protect.

## A second effect, from the same shape

**A failed first attempt burns the key.** `begin` records the attempt before the
call is tried, so a create that fails at BattleGrid still leaves a row holding
that key. The form the operator is still looking at carries the same key, so
pressing again hits the unique index — the retry this feature exists to make
safe is the one thing it now refuses, and it refuses it with a crash page.

## What would fix it

Either is sufficient; they are not equivalent.

1. **Honour it locally.** `findByIdempotencyKey` first, and return the original
   entry's outcome rather than inserting. This makes the quoted sentence true
   for this product regardless of what BattleGrid does, and gives the operator
   *"this was already created"* instead of a crash. It needs a decision about
   the burned-key case above — probably that only a `succeeded` entry dedupes.
2. **Send it.** Put the key in `arguments` so BattleGrid honours its own
   contract. Cheaper, but the local index still throws first, so this does not
   remove the 500 on its own.

The honest framing: (1) is the fix, (2) is the thing the records already claim.
Doing (2) alone leaves the crash in place.

## Why it matters

p1. Operator-facing, reachable by an ordinary double press, and the binding
records assert the opposite of what ships — which is the failure mode CLAUDE.md
and this session's journal both name. Found reviewing PR #235. Related: #238
(whether BattleGrid dedupes create by name) is the *other* open question about
this path and stays open independently.
