---
id: update-cannot-carry-a-confirmation
title: update_intelligence_agent is destructive and the port cannot carry a confirmation
type: bug
status: done
priority: p1
created: 2026-07-29
updated: 2026-07-29
change: the-edit-path-cannot-succeed-either
capability: agent-authoring
blocked_by: []
tags: [battlegrid, guard, agent-edit-form]
---

# update_intelligence_agent is destructive and the port cannot carry a confirmation

> **Done** — . 
> now takes a required ;  mints it alongside
> the rendered consequence, and  never issues its own. The
> question raised below — whether renaming and changing a loss cap deserve the
> same copy — was answered in : they get different sentences, and
> the money one is deliberately the heaviest.

## What

BattleGrid annotates `update_intelligence_agent` with `destructiveHint: true`.
The product's guard sequence therefore requires a confirmation bound to the
operation and its target before the call goes out.

`AgentsPort.updateAgent` has no `confirmationToken` parameter.

```
rebindAgent   … expectedRevision, confirmationToken   ✓
setLifecycle  … expectedRevision, confirmationToken   ✓
updateAgent   … expectedRevision                      ✗
```

`McpAgentAdapter.updateAgent` passes `{ target: params.agentId }` and no token,
so `beginGuardedCall` refuses before any request is made. Observed live:

```
ConfirmationRequiredError: "update_intelligence_agent" is destructive
and needs confirmation: no confirmation was supplied
```

No caller can satisfy it, because there is nowhere to put the token.

## Why it matters

**This is a second, independent reason the edit path could never succeed.** The
first — the read returning twenty-three `tradingConfig` keys where the write
accepts twenty — was fixed in `the-edit-path-cannot-succeed-either`. Fixing it
moved the failure one layer out, from the platform refusing the product to the
product refusing itself.

Two UI surfaces call it and neither can work today:

- `app/(app)/agents/[id]/edit/page.tsx:79`
- `app/(app)/agents/[id]/page.tsx:84`

## The fix that would be wrong

Issuing the confirmation inside `UpdateAgentCommand`, immediately before the
call. It makes the guard pass and means nothing: a confirmation the product
grants itself records that the product intended to proceed, which was never in
doubt. The guard exists so that a **person** saw the consequence named and
agreed to it.

This was deliberately not done in the live probe, which is why the probe proves
the create path and explicitly does not claim the edit path.

## Fix

Give update the two-step flow rebind already has:

1. A propose command that names the consequence and issues a token bound to the
   agent — the shape of `ProposeRebindCommand`
   (`rebind-agent.command.ts:71`), which returns
   `{ proposal, consequence, confirmationToken }`.
2. `confirmationToken` on `AgentsPort.updateAgent`, forwarded by the adapter as
   `{ target, confirmationToken }` exactly as `setLifecycle` does.
3. Both call sites gain the confirm step.

Worth deciding while doing it: whether *every* edit needs confirming, or only
one that touches `tradingConfig`. BattleGrid marks the whole tool destructive,
and the product treats server annotations as authoritative — but renaming an
agent and changing its loss cap are not equally consequential, and the
confirmation copy should say which is happening.

## Related

- `the-edit-path-cannot-succeed-either` — fixed the 23-vs-20 defect and found
  this underneath it
- `agent-edit-form` — cannot be finished until this is resolved
