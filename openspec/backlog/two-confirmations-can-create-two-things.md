---
id: two-confirmations-can-create-two-things
title: Two presses of Fork or Create make two strategies or two agents on a real account
type: risk
status: open
priority: p1
created: 2026-08-14
updated: 2026-08-14
change: ""
capability: app-access
github: "231"
blocked_by: []
tags: [confirmation, idempotency, write-path, battlegrid]
---

# Two presses of Fork or Create make two strategies or two agents on a real account

## What

Eighteen perform submits render `<PerformButton>`. Fourteen carry a
`confirmationToken` hidden input, and that token is single-use — `consume` is an
atomic conditional UPDATE, so a second press is refused. **Four carry no token**,
and two of those four create a new entity:

```
app/(app)/strategies/[id]/fork/page.tsx      fork a strategy   -> no token, no key
src/presentation/components/agent-form.tsx   create an agent   -> no token, no key
```

The other two are safe for a reason rather than by accident, and must not be
swept in with them: `restore` sets `active: true`, which is idempotent, and
`connect` mints a fresh OAuth state per press and only redirects to consent.

So two presses of Fork make **two strategies**. Two presses of Create make
**two agents** — on an account where agents occupy slots and cost money.

## The instrument exists and is not connected

`idempotencyKey` is plumbed end to end and unused by the UI:

```
src/application/use-cases/create-agent.command.ts:32,180   accepts it
src/ports/agents.ts:64                                     carries it
src/ports/battlegrid.ts:83                                 carries it
src/infrastructure/battlegrid/agent-adapter.ts:253,264     forwards it
src/infrastructure/db/schema/index.ts:75                   uniqueIndex(user, idempotencyKey)

grep -rn idempotencyKey app src/presentation            -> ZERO hits
```

A Postgres unique index does not dedupe NULLs, so an unset key is not a weak
guard — it is no guard.

## Why it matters

p1, and the priority is about the account rather than the click.

This product holds credentials that configure other people's agents. A duplicate
agent is a real object on a real BattleGrid account, occupying a real slot, and
it has to be cleaned up by hand. This is the one place in the product where an
impatient second click costs something — and `perform-button.tsx` records that
the impatient second click is the *observed* behaviour, in its own words: *"a
slow platform and a dead button look identical, and the honest response to that
is to press it again."*

It is also why #229 cannot be closed by amending a checklist to read "duplicate
submits are refused by single-use confirmation tokens". That sentence is false
exactly here, and writing it into a binding record would repeat the failure #229
was filed to name.

## What would settle it

1. **Create**: mint the `idempotencyKey` **server-side when the form renders**
   and carry it as a hidden input, so a resubmit reuses the same key. Minting it
   inside the action defeats the mechanism entirely — each press would mint its
   own key and both would be accepted.
2. **Fork**: `openspec/backlog/forking-a-name-that-exists-is-a-500.md` records
   that `fork_strategy` accepts no `idempotencyKey` at v18.2.0, so this cannot be
   closed server-side today. **Probe the current version before assuming that
   still holds** — CLAUDE.md's rule is to probe the version, never the shape. If
   it does still hold, the only available protection is client-side, which is a
   mitigation and must be labelled as one rather than described as a guarantee.
3. A guard test that the create and fork forms carry an idempotency input, so a
   new create surface cannot land without one.

**One cheap check comes first and could shrink all of this**: does BattleGrid
itself refuse a duplicate `create_intelligence_agent` or `fork_strategy` — on a
name collision, or slot capacity? If it does, the exposure is "two attempts, one
refused" rather than two objects. Nobody has tested it. It is a **live write
probe against a real funded account and needs explicit authorisation from the
operator before anyone runs it.**

## Evidence

- `app/(app)/strategies/[id]/fork/page.tsx` — `<PerformButton>`, no token input
- `src/presentation/components/agent-form.tsx` — same
- `src/application/use-cases/create-agent.command.ts:32,180` — accepts the key
- `src/infrastructure/db/schema/index.ts:75` — the unique index, unused
- `src/domain/capability/confirmation.ts` — the guard the other fourteen get
- `openspec/backlog/forking-a-name-that-exists-is-a-500.md` — fork has no key

## Notes

Found while investigating [[the-checklist-and-the-button-disagree-about-disabling]]
(#229). It is the fact that decided that question, and it is more serious than
it. Filed separately because it is a write-path defect rather than a standards
disagreement, and it should not wait on one.
