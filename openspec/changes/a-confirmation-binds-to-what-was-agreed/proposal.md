# A confirmation binds to what was agreed

## Why

A token issued against

> Sets the most **THE .0** may lose in a day to **$25**.

is accepted by a submission carrying **$25,000**.

```ts
consume(token: string, userId: string, tool: string, target: string)
```

Four things are matched — who, which tool, which agent, and the token. The
values are not among them. Both submissions are
`update_intelligence_agent` against the same agent id, so both consume the same
token.

The consequence *is* stored with the token, so a mismatch is recorded in the
audit log and prevented nowhere. That is the sharp end of it: **the
confirmation's whole claim is that a person read a specific sentence and agreed
to it.** If the sentence and the operation can differ, the claim is weaker than
the audit log states — and the audit log is what this product offers instead of
trust.

### The product already solved this, once

`confirmation-is-not-bound-to-values` listed `strategies/[id]/…` as having "the
same shape". It does not. `DescribeApplyQuery` issues:

```ts
target: `strategy:${req.strategyId}#${plan.intentDigest}`
```

and its comment says why — *"two plans for one strategy are two different acts,
and a confirmation for one must not authorise the other."* A plan altered in
transit digests differently, the token fails to consume, and the write is refused
before it reaches BattleGrid. `rebind-agent` binds the same way, through
`rebindTarget`: `agent:<id>->strategy:<sid>` carries the destination, which is
the only value a rebind has.

Counted across every destructive flow:

| flow | target issued | are its values bound? |
|---|---|---|
| `apply_strategy_plan` | `strategy:<id>#<intentDigest>` | **yes** |
| `rebind` | `agent:<id>->strategy:<sid>` | **yes** — the destination *is* the value |
| agent archive / reactivate | `agent:<id>` | no values but `expectedRevision` |
| strategy archive / restore | `strategy:<id>` | no values; revision comes from a re-read |
| **agent edit** | **`agent:<id>`** | **no — and it is the one carrying money** |

So this is not a missing mechanism. It is **one flow missing the binding the
other four have**, and it happens to be the only flow that moves money. The
pattern, the digest function, and the composite-target convention are all already
in the codebase and already proven against the live platform.

### Departing from the filed recommendation, and why

The backlog item preferred *"store the accepted changes with the confirmation and
apply those"* over a digest. That was written without noticing the digest already
existed here. Storing the changes needs a column on the confirmations table and
would leave the strategy side on the digest — **two mechanisms for one property**,
which is its own defect in a codebase whose discipline is that a rule lives in one
place. The digest needs no migration: `target` is already a string that two flows
already overload exactly this way.

The one thing the stored-changes form buys that the digest does not is that the
action would stop reading values from the form at all. That is worth wanting —
sweeping `formData` is how `$ACTION_ID_…` became a proposed change — but the
allowlist read that replaced it is now guarded, and trading a guarded read for a
schema migration is not a good trade today. Recorded in the decision log so the
next reader sees a decision rather than an oversight.

## What Changes

- `DescribeEditQuery` binds its confirmation to the **accepted** changes, not the
  submitted ones: `agent:<id>#<digestOf(accepted)>`. Accepted, because
  `partitionEdit` has already dropped the fields BattleGrid will not take, and a
  digest over the raw submission would bind to fields that never reach the wire.
- `UpdateAgentCommand` recomputes the digest from what it is about to send and
  consumes against that. A tampered value produces a different target, the
  consume misses, and `ConfirmationRequiredError` is raised **before** a request
  is built.
- The composite-target convention moves out of two call sites and into the
  domain, next to `ConfirmationToken`. Three flows building the same string shape
  by hand is how the fourth came to be written without it.
- **A derived guard**: every destructive flow whose payload carries values must
  bind them. Not a list of the four — a list would pass while a fifth was added,
  which is exactly how this defect happened.

## Capabilities

- `battlegrid-connection` — `Destructive Operations Require Confirmation Naming
  The Consequence` gains the binding property.
- `agent-authoring` — the edit flow's confirmation is bound to the amounts.

## Out of Scope

- **A schema change to the confirmations table.** See above; the decision log
  carries the reasoning and the condition under which it would be revisited.
- **`expectedRevision` on the archive flows.** It travels through the form and is
  unbound, but tampering with it produces a revision mismatch at BattleGrid,
  which refuses. The platform is the guard, and adding a local one would be a
  second opinion on the platform's own concurrency check. Stated here so its
  absence is a decision.
- **Rebind's strategy *revision*.** `rebindTarget` binds the destination
  strategy id, not the revision it was read at. A rebind to the right strategy at
  a moved revision is a real gap and a different one. → backlog.

## Track

`full`, and the reason is not the size of the diff. This is the confirmation
contract, and **I have got confirmation logic wrong twice today** — minting and
spending in one request, first in `UpdateAgentCommand` and then again in the
server action above it, under a comment stating the correct rule. An area with
that error rate earns the planner and the production gate. No migration and no
new mechanism, so `full` here means scrutiny rather than ceremony.
