# Master Plan: a-confirmation-binds-to-what-was-agreed

## Goal

Make the agent edit's confirmation authorise the amounts it described, using the
binding the other four destructive flows already have, and put that binding in one
place so a fifth flow cannot be written without it.

## What is already true, and must stay true

Read before anything was written, because the shape of the fix depends on it:

- ~~`DescribeApplyQuery` issues `target: strategy:<id>#<intentDigest>` and
  `ApplyPlanCommand` consumes against the same. **This flow is already correct
  and is the control group.**~~

  **False, and the correction is the largest thing this change found.** The
  adapter composed `strategy:<id>` and spent against that, so `consume` never
  matched and **every `apply_strategy_plan` was refused by the product** — a fifth
  dead write path. I concluded "correct" from reading the issuer alone. See DL-7.
- `rebindTarget` produces `agent:<id>->strategy:<sid>`. The destination is the only
  value a rebind carries, so it is already bound.
- `enforce()` in `call-path.ts` consumes on `(token, userId, tool, target)` where
  `target` comes from the caller. **`ConfirmationStore.consume` does not change.**
  `target` is already a string that two flows overload with a composite. The
  *write ports* do change — see DL-6.
- `partitionEdit(changes)` returns `{ accepted, rejected }`. `accepted` is what
  `describeEdit` describes, and it is the digest input.

  **It is not what reaches the wire**, and an earlier draft of this plan said it
  was. `UpdateAgentCommand` merges `tradingConfigChanges` onto the agent's current
  config and sends all twenty fields, because a partial `tradingConfig` resets what
  it omits. The digest anchors on the submitted intent for that reason. Corrected
  here rather than deleted: assuming the payload equals the intent is the mistake
  this plan nearly made.

## File & Responsibility Inventory

| File | Responsibility | Status |
|---|---|---|
| `src/domain/capability/confirmation.ts` | `confirmationTarget()` — the one construction | modified |
| `src/application/use-cases/describe-edit.query.ts` | Binds to `digestOf(accepted)` | modified |
| `src/application/use-cases/update-agent.command.ts` | Recomputes and consumes against it | modified |
| `src/ports/agents.ts` | Write methods take `confirmation: { token, target }` | modified |
| `src/ports/strategies.ts` | Same | modified |
| `src/infrastructure/battlegrid/agent-adapter.ts` | Forwards the target; stops building it | modified |
| `src/infrastructure/battlegrid/strategy-adapter.ts` | Same | modified |
| `src/application/use-cases/lifecycle.command.ts` | Builds its target | modified |
| `src/application/use-cases/strategy-lifecycle.command.ts` | Builds its target | modified |
| `src/application/use-cases/rebind-agent.command.ts` | Builds its target | modified |
| `src/application/use-cases/apply-plan.command.ts` | Uses the shared construction | modified |
| `src/application/use-cases/compile-plan.command.ts` | `digestOf` moves to the domain | modified |
| `src/domain/capability/digest.ts` | `digestOf` — domain, not a use case | added |
| `src/domain/agent/rebind.ts` | `rebindTarget` **removed** — it was a second construction of the same string | modified |
| `src/presentation/form.ts` | `editIntent` + `MONEY_FIELDS`: one reader for both requests (DL-8) | modified |
| `app/(app)/agents/[id]/edit/page.tsx` | Uses the one reader; `pick` and `numberish` gone | modified |
| `tests/strategy/pipeline.test.ts` | Issue-then-spend regression for the dead apply path | modified |
| `tests/support/{agent,strategy}-fakes.ts` | Record the bound target | modified |
| `tests/architecture/confirmation-binds-values.test.ts` | The derived guard | added |
| `tests/agent/edit-binding.test.ts` | The behaviour, both directions | added |

`digestOf` moving out of `compile-plan.command.ts` is not tidying: a domain rule
about what a confirmation covers cannot import from an application use case, and
`boundaries.test.ts` enforces that direction.

## Constraints

- ~~**The apply-plan flow must be behaviourally unchanged.**~~ Withdrawn: the flow
  was broken (DL-7), so preserving its behaviour would have preserved a dead write
  path. It must instead become *spendable* — issue and consume against one target.
- **No signature change to `ConfirmationStore.consume`.** A fifth parameter would
  be a migration and a second mechanism, and the composite target already exists.
- **The digest anchors on the submitted intent, not on what ships.** The command
  merges onto the platform's current config before sending; digesting the merge
  would bind to something the proposal never described. See DL-6.
- **The write ports carry `confirmation: { token, target }`.** The command knows
  the intent, so the command builds the target; the adapter transports it. This is
  the contract change, and it is what makes the guard exception-free.
- **Refuse before building a request** (`battlegrid-connection` R3, and the new
  scenario). A platform rejection has already sent the values.
- No runtime dual-path: there must not be a bound and an unbound way to confirm.

## Coverage Matrix

| Requirement | Implementation | Test |
|---|---|---|
| Destructive Operations Require Confirmation Naming The Consequence — *submitted values differ* | `confirmationTarget` + consume in `UpdateAgentCommand` | `edit-binding.test.ts`, tampered amount refused |
| — *values are the agreed ones* | same | `edit-binding.test.ts`, happy path consumes once |
| — *one mechanism, in one place* | `confirmationTarget` in the domain | `confirmation-binds-values.test.ts`, derived |
| A Destructive Change Is Agreed To By A Person — *amount altered after agreement* | digest mismatch → `ConfirmationRequiredError` | `edit-binding.test.ts` |
| — *two agreements for one agent* | distinct digests → distinct targets | `edit-binding.test.ts` |
| — *a destination written relatively* (n/a here) | — | covered by `reachability.test.ts` |
| **DL-7**: what was issued is what can be spent | one construction, command-side | `pipeline.test.ts` ×2, re-injected |
| **DL-8**: both requests form the same intent | `editIntent`, one reader | `edit-binding.test.ts` ×7, re-injected |

## Risks

| Risk | Handling |
|---|---|
| **A correct edit is refused** because issuer and consumer digest different inputs | The same function on the same `accepted` set, called from both. Asserted directly: propose then apply with no tampering must succeed. This is the failure that would look like a working guard |
| The guard passes vacuously | Two vacuity checks: it must find the flows it compares, and it must fail when the binding is removed from *either* side |
| A list of flows rather than a derivation | Derived from the issuers, so a fifth flow is covered on the day it is written. A list is how this defect happened |
| `digestOf` moving breaks the strategy flow | Asserted through issue-then-spend rather than by comparing strings. The byte-identical check I first planned would have **locked in** the dead path, because the string it preserved was the broken one |
| Key ordering changes the digest | `canonicalise` already sorts keys; the existing tests for it stay |
| Scope creep into a schema change | Explicitly out of scope, with the revisit condition in the decision log |

## Not in this plan

- A column on the confirmations table. See the decision log.
- `expectedRevision` on the archive flows — BattleGrid refuses a mismatch.
- Rebind's strategy *revision* — a real and different gap. → backlog.
