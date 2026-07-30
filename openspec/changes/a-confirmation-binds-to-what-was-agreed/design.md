# Design: a-confirmation-binds-to-what-was-agreed

## The shape

```
DescribeEditQuery                              UpdateAgentCommand
  partitionEdit(submitted) → accepted            partitionEdit(submitted) → accepted
  describeEdit(name, accepted) → consequence     confirmationTarget.agentEdit(id, accepted)
  confirmationTarget.agentEdit(id, accepted)                       │
                    │                                             ▼
                    ▼                                    enforce() → consume(token, user, tool, target)
         confirmations.issue({ target, … })                        │
                                                                   ├─ match → build the request
                                                                   └─ miss  → ConfirmationRequiredError
```

Both ends compute the target from the same function over the same set. Nothing is
compared by hand; a mismatch shows up as a consume that finds no row.

## Decision: the target is a composite string, not a new column

`consume(token, userId, tool, target)` stays as it is. `target` already carries a
composite in two flows — `strategy:<id>#<intentDigest>` and
`agent:<id>->strategy:<sid>`. See DL-1 for the full trade, including what the
stored-changes form would buy and the condition under which to take it.

## Decision: one construction, and it lives in the domain

Three flows compose this string today, each by hand, and the fourth was written
without it. That is the whole causal story of this defect, so the fix is not "add
the string to the fourth place" — it is that there is one place.

```ts
// src/domain/capability/confirmation.ts
export const confirmationTarget = {
  agent: (agentId: string) => agentId,
  agentEdit: (agentId: string, accepted: Readonly<Record<string, unknown>>) =>
    `agent:${agentId}#${digestOf(accepted)}`,
  agentRebind: (agentId: string, strategyId: string) =>
    `agent:${agentId}->strategy:${strategyId}`,
  strategy: (strategyId: string) => strategyId,
  strategyPlan: (strategyId: string, intentDigest: string) =>
    `strategy:${strategyId}#${intentDigest}`,
};
```

The two identity cases are included deliberately. Leaving `agent:` as a bare id
inline would mean the shared construction covers *some* flows, and the guard would
have to special-case which — a guard with exceptions is a guard that gets an
exception added rather than a defect fixed.

## Decision: the digest input is `accepted`

Not the submission. See DL-2 — digesting the raw submission would refuse a correct
edit whose only difference is a field BattleGrid was never going to accept.

## Decision: `digestOf` moves to `src/domain/capability/digest.ts`

Forced, not chosen. `confirmationTarget` is a domain rule and the domain may not
import `src/application/`, which is where `digestOf` currently lives.
`boundaries.test.ts` already enforces the direction, so leaving it would fail the
architecture check rather than merely reading oddly.

Its `canonicalise` sorts keys, which is what makes two structurally identical
change sets digest identically regardless of construction order. That property is
load-bearing here for the same reason it was there: a re-render that reorders an
object must not invalidate an agreement.

## Decision: refuse before the request is built

The existing `enforce()` path in `call-path.ts` already does this — the consume
happens at step 3, before the audit `begin` at step 4 and before any HTTP. So the
binding inherits the ordering rather than restating it. Nothing new is needed;
this is recorded because *not* inheriting it would be the easy mistake (checking
the digest inside the adapter, after the payload is assembled).

## The failure mode this design is most likely to produce

A refused *correct* edit — issuer and consumer digesting different inputs. It
presents as "the edit form stopped working", and the obvious fix is to loosen the
binding, which restores the defect. See DL-5. The happy path is therefore asserted
as directly as the attack, and the two ends share one function precisely so they
cannot diverge.

## What this design does not do

- Stop the values travelling through the form. They still do; they are now
  redundant rather than trusted.
- Bind `expectedRevision` on the archive flows. BattleGrid refuses a mismatch, and
  a local check would be a second opinion on the platform's own concurrency
  control.
- Bind rebind's strategy *revision*. `agent:<id>->strategy:<sid>` names the
  destination, not the version of it. A real gap, and a different one. → backlog.
