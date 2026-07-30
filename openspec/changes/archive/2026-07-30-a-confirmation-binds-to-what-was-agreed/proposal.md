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

### The product had the shape of the answer already

`confirmation-is-not-bound-to-values` listed `strategies/[id]/…` as having "the
same shape". Not quite. `DescribeApplyQuery` issues:

```ts
target: `strategy:${req.strategyId}#${plan.intentDigest}`
```

and its comment says why — *"two plans for one strategy are two different acts,
and a confirmation for one must not authorise the other."* `rebind-agent` does the
same through `rebindTarget`: `agent:<id>->strategy:<sid>` carries the destination,
which is the only value a rebind has.

So the convention existed. **Whether it worked is a separate question, and for
apply-plan the answer turned out to be no** — see below. That is the point of the
whole change: the convention was *composed by hand in five places*, and being
correct in most of them is what made the exceptions invisible.

Counted across every destructive flow:

| flow | target issued | are its values bound? |
|---|---|---|
| `apply_strategy_plan` | `strategy:<id>#<intentDigest>` issued, `strategy:<id>` **spent** | **no — see below** |
| `rebind` | `agent:<id>->strategy:<sid>` | **yes** — the destination *is* the value |
| agent archive / reactivate | `agent:<id>` | no values but `expectedRevision` |
| strategy archive / restore | `strategy:<id>` | no values; revision comes from a re-read |
| **agent edit** | **`agent:<id>`** | **no — and it is the one carrying money** |

So this is not a missing mechanism. It is **one flow missing the binding the
others have**, and it happens to be the only flow that moves money. The pattern,
the digest function and the composite-target convention are all already in the
codebase.

### The table above was wrong about `apply_strategy_plan`, and that is a fifth dead write path

Written from reading the issuer alone. Building the *spender* half of the guard
found that `ApplyPlanCommand` passed only the token and the adapter composed its
own target:

```
issued:  strategy:<id>#<intentDigest>     DescribeApplyQuery
spent:   strategy:<id>                    McpStrategyAdapter.applyPlan
```

`consume` matches the target, so it never matched. **Every `apply_strategy_plan`
was refused by the product before it reached BattleGrid** — the call that
reconfigures every agent bound to a strategy, dead for the life of the feature and
through two production gates.

Nothing saw it because `FakeStrategiesPort.applyPlan` does not go through
`enforce()`. Worse, `mapper.test.ts` asserted the broken string as correct:
`expect(calls[0]?.target).toBe('strategy:s1')`. A guard was pinning the defect —
the third time that has happened here.

Confirmed by a direct `issue`-then-`consume` before anything was changed, and
fixed as a consequence of there being one construction. See DL-7.

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
- **One construction, in the domain.** `confirmationTarget` sits next to
  `ConfirmationToken` with five named cases and no free-form path. `agentEdit`
  cannot be called without the intent, so the compiler enforces the binding.
  `digestOf` moves to `src/domain/capability/digest.ts` — forced, not chosen: the
  domain may not import an application use case.
- **The write ports carry `confirmation: { token, target }`.** A token and the
  target it is bound to are one fact, and they travelled as two independent
  parameters with every adapter composing its own target. That is the root cause:
  five construction sites, and the adapter had no way to know what the user agreed
  to. The command knows the intent, so the command builds the target and the
  adapter transports it. See DL-6.
- **`rebindTarget` is deleted.** It produced the same string as
  `confirmationTarget.agentRebind`, which made it a second construction of exactly
  the thing being consolidated. Its reasoning is kept in a comment where it stood.
- **One reader for the edit intent.** The review read a query string and kept
  `"25"`; the apply read a form and produced `25`. Those digest differently, so
  binding the confirmation to the values would have refused **every honest edit** —
  the failure mode DL-5 predicted, already present and invisible while nothing
  compared the two. `editIntent` in `src/presentation/form.ts` replaces `pick` and
  `numberish`, and `MONEY_FIELDS` moves beside it because the fields to read and
  how to read them are one rule. See DL-8.
- **A derived guard**: every confirmation target comes from the one construction.
  Not a list of flows — a list would pass while a sixth was added, which is how
  this defect happened. Scoped to object literals pairing a token with a target,
  because `target:` is overloaded here and a broader rule produced four false
  positives.

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
- **Rebind's strategy *revision*.** `confirmationTarget.agentRebind` binds the
  destination strategy id, not the revision it was read at. A rebind to the right
  strategy at a moved revision is a real gap and a different one. →
  `rebind-is-not-bound-to-the-revision-it-read`.
- **Telling the four refusal causes apart.** `enforce()` raises one message for
  expired, replayed, unknown and mismatched. This change makes the fourth
  reachable, so the most useful sentence — *"the amount changed since you agreed to
  it"* — is now unavailable where it would help. Needs a port signature change. →
  `a-refused-confirmation-does-not-say-which-way-it-failed`.
- **Proving the revived apply path against BattleGrid.** The confirmation is now
  spendable, which is not the same as the platform accepting the call. No key is on
  disk. Stated so the distinction is not lost: a dead path that stops being refused
  locally can still fail upstream.

## Track

`full`, and the reason is not the size of the diff. This is the confirmation
contract, and **I have got confirmation logic wrong twice today** — minting and
spending in one request, first in `UpdateAgentCommand` and then again in the
server action above it, under a comment stating the correct rule. An area with
that error rate earns the planner and the production gate. No migration and no
new mechanism, so `full` here means scrutiny rather than ceremony.
