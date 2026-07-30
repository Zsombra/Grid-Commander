# Decision Log: a-confirmation-binds-to-what-was-agreed

## DL-1 — A digest in the target, not a column on the table

**Planner.** The backlog item preferred storing the accepted changes with the
confirmation and applying those, over comparing a digest. It called the digest
"cheap" and the stored form "the strongest".

**Decided: the digest.** Three reasons, in order of weight.

1. **It is already the product's mechanism.** `DescribeApplyQuery` has issued
   `strategy:<id>#<intentDigest>` since the compile pipeline was built, and it is
   proven against the live platform. Adding a second mechanism for one property
   is the defect this codebase most consistently guards against — a rule in two
   places drifts, and the drift is silent.
2. **No migration.** `target` is already a string carrying a composite in two
   flows. A column means a Drizzle migration on the table that gates every
   destructive write.
3. **It leaves the strategy side alone.** The stored form applied only to the
   agent edit would leave apply-plan on the digest permanently.

**What the stored form buys that this does not**, stated so the trade is legible:
the action would stop reading values from the form entirely — no allowlist, no
denylist, nothing to tamper with. That is genuinely stronger. It is not worth a
migration *today* because the allowlist read is now guarded and the digest closes
the stated risk completely.

**Revisit if** a second field family joins the edit payload, or the confirmations
table is being migrated for another reason. At that point the marginal cost of the
column is near zero and the stronger form should be taken.

## DL-2 — The digest covers `accepted`, not the submission

**Planner.** `partitionEdit` drops the fields BattleGrid rejects. Digesting the
raw submission would bind the agreement to fields that never reach the wire: a
user could alter a rejected field, the digest would differ, and a correct edit
would be refused for a field that was never going to be sent.

Digesting `accepted` makes the agreement and the payload the same set. This is
also what `describeEdit` already describes, so the sentence the user read and the
values the token covers derive from one thing.

## DL-3 — `digestOf` moves to the domain

**Planner.** It lives in `compile-plan.command.ts`, an application use case.
`confirmationTarget` belongs in `src/domain/capability/confirmation.ts` next to
`ConfirmationToken`, and the domain cannot import from `src/application/` —
`boundaries.test.ts` enforces the direction.

Moving it is therefore forced by the boundary, not a preference. `src/domain/
capability/digest.ts` is the home; `compile-plan.command.ts` re-exports nothing
and imports it like everything else.

## DL-4 — `full` track for a small diff

**Planner.** The change adds no mechanism and no migration, which argues for
`standard`. It is taken as `full` anyway, for a reason specific to this area:
**confirmation logic has been got wrong twice today**, in the same operation, one
layer apart — minted and spent in a single request inside `UpdateAgentCommand`,
then again inside the server action above it, directly beneath a comment stating
the correct rule.

An area with that error rate earns a production gate. `full` here buys scrutiny,
not paperwork.

## DL-5 — The failure mode to watch is a refused *correct* edit

**Planner.** A guard that refuses tampered submissions and also refuses honest
ones looks like it is working. It would present as "the edit form stopped
working" and the obvious fix — loosen the binding — puts the defect back.

So the happy path is asserted as directly as the attack: propose, submit
unchanged, and the write must reach the port exactly once. Recorded here because
this is the one way this change can be wrong while every new test passes.

## DL-6 — The port carries the target, and the plan changed to say so

**Planner, after reading `UpdateAgentCommand`.** The first plan had the adapter
compute the digest from `params.changes`, at the last point before the wire. That
does not work, and the reason is worth recording because it is not obvious from
the outside.

`UpdateAgentCommand` does not send what the user submitted. It reads the agent,
merges `tradingConfigChanges` onto the **current** config, and sends the full
twenty-field object — because a partial `tradingConfig` does not error on
BattleGrid, it resets what it omits. So:

```
propose:  changes = { displayName?, tradingConfig: <the 3 fields typed> }
apply:    changes = { displayName? } + tradingConfigChanges = <the 3 fields typed>
wire:     changes = { displayName?, tradingConfig: <all 20, merged> }
```

Digesting what ships would digest something the proposal never saw. Digesting the
submission requires the two shapes above to be normalised to one, which both
layers can do with no extra reads — and the propose shape already *is* that
canonical form.

**So the digest anchors on the submitted intent, and the command is the only layer
that holds it.** The adapter has `changes` post-merge and never sees
`tradingConfigChanges`.

**Decided: the write port methods take `confirmation: { token, target }`.**

A token and the target it is bound to are one fact. Today they are two independent
parameters, and every adapter builds the target itself — which is the actual root
cause of this defect: five construction sites, four that happened to include the
values and one that did not. Moving construction into the commands, which know the
intent, removes the duplication rather than adding a fifth copy of the string.

Taken for all five write methods rather than only `updateAgent`. Two shapes for
one concept would mean the guard needs an exception, and a guard with an exception
is a guard that gets exceptions added instead of defects fixed.

**Cost, stated plainly:** five port signatures, five adapter call sites, five
commands, and the fakes and tests that construct them. Mechanical, and larger than
the diff the first plan implied. The alternative — changing `updateAgent` alone —
is smaller and leaves the asymmetry that caused this.
