# Design: a-plan-is-checked-against-the-account-that-compiled-it

## The distinction, made structural

```
Authority {
  userId:             string          which rows in OUR database
  battlegridSubject:  string | null   which account on THEIR platform
  accessToken:        string
}
```

Two fields because they are two facts. `users.id` is minted here
(`random.token(16)`, or the constant `'owner'`); `battlegridSubject` is given to us
by BattleGrid. The database has said so since it was written — two columns, with a
comment naming the subject as the natural key — and one field was carrying both
jobs anyway.

## Decision: the compiler is the guard, not a scan

`refuseLocally`'s context parameter changes from

```ts
{ userId: string; strategyId: string; currentRevision?: number }
```

to

```ts
{ battlegridSubject: string | null; strategyId: string; currentRevision?: number }
```

**A rename is not enough**, and the first attempt at this design stopped there.
`battlegridSubject: req.userId` type-checks when both sides are `string`; renaming
catches the wrong property name and never the wrong value. So the subject is a
**branded** type — `BattlegridSubject` in `src/domain/connection/subject.ts`,
constructible only through `asSubject` — and passing the local id now reads:

```
error TS2322: Type 'string' is not assignable to type 'BattlegridSubject'.
```

Each `asSubject` call is a place the value genuinely came from BattleGrid, so the
cast is the assertion rather than a way around the type.

This is deliberately not a source scan: the property is "these two identifiers are not interchangeable", and a type
expresses that exactly, permanently, and at every future call site. A regex would
have to be maintained and could be worked around by a rename.

The delta spec says as much — *"typed so that supplying the local identifier is not
possible, rather than guarded by convention"* — because a convention was in force
and this is what it produced.

## Decision: `null` skips the check

```ts
if (c.userId !== context.battlegridSubject) …   // WRONG when null
if (context.battlegridSubject !== null && c.userId !== context.battlegridSubject) …
```

Unknown is not mismatched. This is the same rule as `forkAffordance`, where a
`null` quota offers the control rather than withholding it, and it is the rule this
defect broke: a substituted identity read as a mismatch, and the user got a refusal
naming a cause that was not true.

The cost of skipping is that a foreign plan reaches BattleGrid and is refused
there — one round trip, an honest error, and the requirement already says the
platform's judgement decides.

## Decision: personal mode discovers the subject, and may fail

`list_user_active_positions` returns `userId` at the top level and takes no
parameters. Chosen because it is in the **probed** surface artifact — observed from
a live call, not read off a schema. `get_account_state` looked like the obvious
candidate and returns `username`, `balance`, `stats`, `agentSlots`,
`mcpWagerEnabled`, `tradingWalletProvisioned` — and no id at all.

Discovery is one read, cached for the process, and **allowed to fail to `null`**. A
deployment whose positions read is unavailable must still be able to apply a plan;
the platform will catch a foreign one. Failing closed here would reintroduce the
defect through the other door.

## Decision: nothing stored changes

An earlier reading of this defect proposed replacing `OWNER_USER_ID` with
BattleGrid's id. That relabels every audit row and confirmation already written as
`'owner'` — the opposite of the `AuditActor` decision, where `'assistant'` was
deliberately kept so an old row would not be re-attributed to a user. Separating the
two fields makes the migration unnecessary.

## What this design does not fix

The apply may still fail at BattleGrid. This removes the product's own refusal; it
does not prove the platform accepts the call. Only a live run answers that, and it
needs a strategy the operator is willing to see change.
