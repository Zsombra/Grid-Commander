# Money limits are editable, and someone sees the consequence

## Why

Two defects, and the second is why this change is not just a form.

### The page refuses, citing a reason that was fixed

`/agents/[id]/edit` says:

> Money limits are not yet editable from Grid-Commander. BattleGrid takes the
> trading configuration all at once, so a partial change resets the fields it
> omits — a form that sends one value would quietly clear the rest.

**That is no longer true.** `the-edit-path-cannot-succeed-either` rewrote
`applyEdit` to merge changes onto the current config and emit all twenty writable
fields, returning `{config, dropped, missing}` so a partial send cannot happen.
`UpdateAgentCommand` reads the agent first specifically to get that config. And
the path was exercised against a live account: trading limits were written and
read back.

So the product declines to do something it can demonstrably do, for a reason it
already solved. Meanwhile `THE .0` runs with **no ceiling on either loss limit**,
which this product can now describe precisely and cannot change.

### The confirmation confirms nothing

`updateAgent` proposes and consumes in the same request:

```ts
const proposed = await app.describeEdit.execute({ ...user.authority, agentId, changes });
// …four lines later…
confirmationToken: proposed.proposal.confirmationToken,
```

`proposed.proposal.consequence` is computed, stored against the token for the
audit, and **discarded**. No human ever reads it. The guard passes because a
token exists; the token exists because the product issued one to itself.

`update-cannot-carry-a-confirmation` named this exactly, under *The fix that
would be wrong*:

> Issuing the confirmation inside `UpdateAgentCommand`, immediately before the
> call. It makes the guard pass and means nothing: a confirmation the product
> grants itself records that the product intended to proceed, which was never in
> doubt. The guard exists so that a **person** saw the consequence named and
> agreed to it.

The fix landed in the *command* and the anti-pattern reappeared one layer out in
the *action*. The comment directly above it reads "the thing that performs the
write must not be the thing that authorises it" — and the same function does
both, in one request, with nobody in between.

**It is the journal mapper again**: code that states the right rule in a comment
and does the opposite three lines down.

## What Changes

- **Rename becomes two steps.** Propose, show the consequence, then apply on a
  second request the human initiated. The token is issued in step one and
  consumed in step two, which is the only arrangement in which it means
  anything.
- **Money limits become editable**, prefilled from the agent's current config,
  through the same two-step flow. `MoneyLimits` is reused rather than
  reimplemented so the zero-means-unbounded warning — the finding from
  `zero-does-not-mean-nothing` — appears where the number is typed.
- The stale refusal copy goes.

## Capabilities

- `agent-authoring` — one requirement modified.

## Out of Scope

- **The other fourteen `tradingConfig` fields.** The six here are the ones
  BattleGrid refuses to default — the money questions. The rest have platform
  defaults, their own bounds, and no evidence anyone wants them on this screen.
  `applyEdit` preserves them untouched. → backlog.
- **Binding the token to the values, not just the operation and target.**
  `consume(token, userId, tool, target)` matches on the agent, so a token issued
  for one set of values would be accepted with another if the hidden fields were
  edited. That is a **pre-existing, product-wide** property — `rebind` carries
  `toStrategyId` the same way — and fixing it touches the confirmation contract,
  the guard and three flows. It is not made worse here and it should not be
  fixed in a UI change. → backlog, filed with this change as the trigger.
- **Changing `THE .0`.** Its ceilings are the operator's decision. This makes
  changing them possible; it does not choose for them.
