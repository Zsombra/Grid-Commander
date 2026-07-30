---
id: rebind-is-not-bound-to-the-revision-it-read
type: risk
status: open
priority: P3
capability: agent-authoring
created: 2026-07-30
updated: 2026-07-30
change: a-confirmation-binds-to-what-was-agreed
---

# A rebind confirmation names the destination, not the version of it

`confirmationTarget.agentRebind(agentId, toStrategyId)` produces

```
agent:<id>->strategy:<sid>
```

so a confirmation for one destination cannot authorise another. What it does not
carry is the **revision of that destination**. The consequence the user reads
does:

> …bound to Berlin at revision 2, replacing its current configuration.

Between reading that and confirming, Berlin can move to revision 3. The
confirmation still consumes, and the agent is rebound to a configuration the user
never saw described.

## Why it is P3 and not higher

- The window is the confirmation TTL, five minutes.
- The mover would be the operator themselves, on a personal deployment — the same
  reasoning that made the parent risk P2 rather than P1.
- `expectedRevision` on the *agent* is carried and checked, so the agent side
  cannot drift. Only the strategy side can.
- Rebinding does not itself move money; it changes what the agent reads and how it
  reasons, and the next decision it makes is where the effect shows.

It is filed anyway because the parent change's whole claim is that a confirmation
authorises the operation it described, and the described revision is part of that
description.

## Fix, when it is taken

`confirmationTarget.agentRebind(agentId, toStrategyId, toRevision)` — the
construction already takes the values it binds, so this is one argument and two
call sites. Then the question is what to do when it fails: a refusal saying "Berlin
changed while you were reading" and offering a fresh proposal is the honest
answer, not a retry.

Worth doing at the same time as anything else that touches
`src/domain/capability/confirmation.ts`, since the guard
(`tests/architecture/confirmation-binds-values.test.ts`) already requires every
target to come from that one place.

## Related

- `a-confirmation-binds-to-what-was-agreed` — declared this out of scope
  explicitly rather than half-fixing it, and found a fifth dead write path on the
  way (DL-7).
