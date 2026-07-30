# Decision Log: a-plan-is-checked-against-the-account-that-compiled-it

## DL-1 — Two identities, not one renamed

`Authority.userId` was answering two questions: which rows in our database, and
which account on BattleGrid. They coincide in neither deployment mode.

Considered replacing `OWNER_USER_ID` with BattleGrid's id so the single field would
be correct. Rejected: `userId` is written into audit rows and confirmation tokens,
and rows already say `'owner'`. Changing it relabels history, which is the opposite
of the `AuditActor` decision — `'assistant'` was deliberately kept so an old row
would not be re-attributed to a user.

**Decided:** add `battlegridSubject` beside `userId`. Nothing stored changes and no
migration is needed. The database already models the distinction; the application
layer now does too.

## DL-2 — A type, not a scan — and the first version of this entry was false

The property is *"these two identifiers are not interchangeable"*.

**This entry originally claimed that renaming the context field to
`battlegridSubject` made supplying the local id a compile error. It did not.**
`battlegridSubject: req.userId` type-checks perfectly when both sides are `string`;
renaming only catches the wrong *property name*, never the wrong *value*. Caught by
re-injecting the defect and watching typecheck stay silent — the behaviour tests
failed, four of them, and the compiler said nothing.

That is the PG-003 pattern from the previous change repeating inside its successor:
a decision log asserting a verification that was never run. Recorded rather than
quietly amended, because the claim being wrong is the more useful fact.

**Now genuinely enforced.** `BattlegridSubject` is a branded string in
`src/domain/connection/subject.ts`, constructible only through `asSubject`, so:

```
src/application/use-cases/apply-plan.command.ts(86,9):
  error TS2322: Type 'string' is not assignable to type 'BattlegridSubject'.
```

Every `asSubject` call site is a place the value came from BattleGrid — an
authorization grant, a stored `battlegrid_subject`, or a read of the platform — and
the cast reads as the assertion it is.

A source scan was the alternative and is weaker on every axis: it needs
maintenance, it can be defeated by a rename, and it reports after the fact. The
previous change in this area learned the same lesson twice — a guard anchored on
`confirmations.issue({` missed two flows that used a ternary, and a broader rule
produced four false positives.

Where a type can hold a property, it should — and *whether* it holds it has to be
re-injected, not reasoned about. This entry is the evidence for that sentence.

## DL-3 — `null` skips the check

Unknown is not mismatched. Identical in shape to `forkAffordance`, where a `null`
quota offers the control rather than withholding it — and identical to the mistake
that caused *this* defect, where a substituted identity read as a mismatch and the
user was told the plan belonged to another account.

The cost is one round trip: a genuinely foreign plan reaches BattleGrid and is
refused there. The requirement already says the platform's judgement decides, so
this is the documented division of labour rather than a concession.

## DL-4 — `list_user_active_positions`, because it was observed

`get_account_state` is the obvious candidate by name and returns no id at all —
`username`, `balance`, `stats`, `agentSlots`, `mcpWagerEnabled`,
`tradingWalletProvisioned`. `list_user_active_positions` returns `userId` at the top
level and takes no parameters, and it is in the **probed** section of the surface
artifact, meaning a live call returned that shape.

Chosen on observation rather than on the reference document. The reference has been
right and unread before — `enum(MANUAL|VOLATILITY_AUTO)` sat in it for two days
while the product sent a value that did not exist — so agreement between the two is
worth having and only one of them is evidence.

## DL-5 — The fixture is part of the fix

```ts
const context = { userId: USER, strategyId: STRATEGY };   // USER is also the claim
```

One constant on both sides. The test proved the comparison works and could never
show that nothing supplies a comparable value. Two distinct constants, and the
test asserts they are distinct, or this ships again.

Third fixture in a week that modelled an impossible world: `defaultCatalog()`
defaulted three fields where the live catalog defaults fifteen, and a
four-field `tradingConfig` was unconstructible against a twenty-field schema.
Worth naming as a pattern rather than a coincidence.
