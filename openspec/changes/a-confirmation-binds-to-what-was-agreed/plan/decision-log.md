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

## DL-7 — A fifth dead write path, and the plan's "control group" was wrong

**Executor.** The plan opened by stating what was already true, and put
`apply_strategy_plan` first:

> `DescribeApplyQuery` issues `target: strategy:<id>#<intentDigest>` and
> `ApplyPlanCommand` consumes against the same. **This flow is already correct
> and is the control group.**

**It does not consume against the same.** `ApplyPlanCommand` passed only the
token; `McpStrategyAdapter.applyPlan` composed its own target:

```
issued:  strategy:<id>#<intentDigest>     DescribeApplyQuery
spent:   strategy:<id>                    McpStrategyAdapter.applyPlan
```

`consume` matches the target, so it never matched. **Every `apply_strategy_plan`
was refused by the product before it reached BattleGrid** — the call that
reconfigures every agent bound to a strategy, dead for the life of the feature.
That is a fifth dead write path, the same family as the four in
`four-dead-write-paths`, and it survived two production gates.

Nothing saw it because `FakeStrategiesPort.applyPlan` does not go through
`enforce()`. Both ends were tested — the issuer's target in `pipeline.test.ts`,
the adapter's in `mapper.test.ts`, and `mapper.test.ts` *asserted the wrong
string as correct*: `expect(calls[0]?.target).toBe('strategy:s1')`. A guard was
pinning the defect, which is the third time that has happened in this project.

**How it was found:** by writing the second half of the guard — the spender side —
rather than by reading. I had read `apply-plan.command.ts` and concluded the flow
was correct from the issuer alone. The lesson is the plan's own: *both ends, or
neither*. Confirmed with a direct `issue`-then-`consume` before changing anything.

**Fixed as a side effect**, because there is now one construction and the command
supplies the target: `confirmationTarget.strategyPlan(strategyId, intentDigest)`
at both ends. Regression tests in `pipeline.test.ts` drive issue-then-spend
through the store rather than comparing strings, and re-injecting the bare
strategy id fails them.

## DL-8 — Two coercions would have refused every honest edit

**Executor.** DL-5 named the failure mode: a binding that refuses tampered *and*
honest submissions, presenting as "the edit form stopped working". It was already
present, and would have shipped:

```
review (query string):  { maxDailyLossUsd: "25" }   pick()
apply  (FormData):      { maxDailyLossUsd: 25 }     numberish()
```

`digestOf` canonicalises through `JSON.stringify`, so `"25"` and `25` digest
differently. Harmless while nothing compared the two; fatal the moment the
confirmation is bound to the values.

Found by comparing the two readers before writing the binding — not by running
anything. `editIntent` in `src/presentation/form.ts` is now the one reader for
both requests, and `MONEY_FIELDS` moved beside it because the fields to read and
how to read them are one rule. `pick` and `numberish` are gone.

**And the first re-injection of this defect did not fail any test**, because
`edit-binding.test.ts` builds both intents directly and never goes through the
page's readers. The property needed its own coverage: `the two requests agree on
what was submitted`, plus a source check that the page has one reader rather than
two. That gap between *fixed* and *guarded* is what the re-injection discipline is
for.
