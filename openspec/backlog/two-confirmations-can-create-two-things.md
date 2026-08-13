---
id: two-confirmations-can-create-two-things
title: Fork and Create have no confirmation token, and only one of them is provably safe
type: risk
status: done
priority: p2
created: 2026-08-14
updated: 2026-08-14
change: ""
capability: app-access
github: "231"
blocked_by: []
tags: [confirmation, idempotency, write-path, battlegrid]
---

# Fork and Create have no confirmation token, and only one of them is provably safe

> **This item was filed at p1 claiming that two presses of Fork make two
> strategies. A live probe refuted that.** The original text is kept at the
> bottom. What follows is what was actually observed.

## What

Eighteen perform submits render `<PerformButton>`. Fourteen carry a
`confirmationToken` hidden input, and that token is single-use — `consume` is an
atomic conditional UPDATE, so a second press is refused. **Four carry none:**

| submit | second press | verdict |
|---|---|---|
| `strategies/[id]/fork` | `INTERNAL_ERROR` — **measured** | no duplicate; bad error |
| `agent-form` (create) | unknown — **not testable here** | protection exists, unused |
| `strategies/[id]/restore` | sets `active: true` again | idempotent, safe |
| `connect` | mints a fresh OAuth state, redirects | safe |

## What the probe measured

Run live against the real account on 2026-08-14, with the operator's explicit
authorisation, and cleaned up afterwards (both forks archived; balance, stats and
agent slots unchanged).

**Fork does not duplicate.** Two identical `fork_strategy` calls were made twice
over, once with an explicit name and once with the name omitted:

```
fork_strategy(Dunkirk, rev 7, name "probe-231-dup")   -> created 429bb4bf…
fork_strategy(Dunkirk, rev 7, name "probe-231-dup")   -> INTERNAL_ERROR

fork_strategy(Leningrad, rev 7, no name)              -> created "Leningrad (fork)"
fork_strategy(Leningrad, rev 7, no name)              -> INTERNAL_ERROR
```

The no-name case matters because the fork page's name field is **optional** and
its own copy says *"Left blank, BattleGrid names the copy '(fork)' — and names
every copy the same way."* That is the default path, and it is refused too.

So the platform does dedupe fork, by name collision. **The original claim in this
item — two strategies from two presses — is false.**

**What fork's second press actually produces is the defect in
[[a-spent-confirmation-shows-a-crash-page]] (#232)**, one layer out: the fork
*succeeded*, and the operator is shown a server error. That is already recorded
in [[forking-a-name-that-exists-is-a-500]], which this probe independently
re-confirms at the current platform version.

## What is still open, and honestly unknown

**Create was not testable.** `agentSlots` reads `limit: 3, used: 3, remaining: 0`,
so a create would be refused for capacity rather than for duplication and would
prove nothing. Making room means archiving one of the operator's real agents,
which was outside what was authorised.

What *is* verified, from the live tool schema rather than from the docs:

```
create_intelligence_agent.idempotencyKey
  "Caller-generated key, 8-255 chars. A retry with the same key returns the
   original result rather than repeating the command."

fork_strategy   — no idempotencyKey parameter at the current version
```

So the platform offers create a real dedupe mechanism, Grid-Commander has it
plumbed end to end, and **the UI passes nothing**:

```
src/application/use-cases/create-agent.command.ts:32,180   accepts it
src/ports/agents.ts:64 · src/ports/battlegrid.ts:83        carry it
src/infrastructure/battlegrid/agent-adapter.ts:253,264     forwards it
src/infrastructure/db/schema/index.ts:75                   uniqueIndex(user, key)

grep -rn idempotencyKey app src/presentation            -> ZERO hits
```

A Postgres unique index does not dedupe NULLs, so an unset key is no guard at
all. Whether BattleGrid refuses a duplicate agent by name is **unknown** — the
platform may well dedupe create the way it dedupes fork, in which case this is
tidiness rather than exposure.

## Why it matters

**p2, downgraded from p1** on the evidence. The demonstrated harm is a confusing
error on a successful action, not duplicate objects. The remaining exposure is
one untested path.

It still matters for #229: the sentence "duplicate submits are refused by
single-use confirmation tokens" would be false for these four regardless — fork
is protected by a name collision, restore by idempotence, connect by having no
effect, and create by nothing anyone has verified. Amending a binding standard to
claim a mechanism that four of eighteen submits do not use would be a new false
sentence in a binding record.

## What would settle it

1. **Pass the `idempotencyKey` at `/agents/new`.** Cheap, the plumbing exists,
   and it is correct whether or not the platform also dedupes. Mint it
   **server-side when the form renders** and carry it as a hidden input — minting
   it inside the action gives each press its own key and defeats the mechanism.
2. **Test the create path** when a slot is free, or on an account with room.
3. Fork needs no client work: it is deduped. Its defect is the error, and that
   belongs to #232 and to `forking-a-name-that-exists-is-a-500`.

## Evidence

- Live probe, 2026-08-14 — four `fork_strategy` calls, results above
- `create_intelligence_agent` / `fork_strategy` live tool schemas
- `get_account_state` — slots 3/3, which is why create was not probed
- `src/application/use-cases/create-agent.command.ts:32,180`
- `src/infrastructure/db/schema/index.ts:75`
- `app/(app)/strategies/[id]/fork/page.tsx` — the optional name field

## Notes

Filed while investigating #229 on a static read, then corrected by measurement
the same day. The static read was right that four submits carry no token and
wrong about what follows from it — the guard was on the platform, where nobody
had looked.

<details>
<summary>Original text, filed p1 and refuted</summary>

The item claimed: *"two presses of Fork make **two strategies**. Two presses of
Create make **two agents** — on an account where agents occupy slots and cost
money."* It reasoned from the absence of a client-side token and an unused
idempotency key, and did not consider that BattleGrid might enforce uniqueness
itself. For fork it does. For create it remains untested.

</details>
