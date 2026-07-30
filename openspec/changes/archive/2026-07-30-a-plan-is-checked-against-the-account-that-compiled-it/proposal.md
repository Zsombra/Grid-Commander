# A plan is checked against the account that compiled it

## Why

Applying a compiled strategy plan is refused, in **every** deployment
configuration, before a request is built. The review renders, names the blast
radius, and offers no Apply button:

> This plan was compiled for a different account. Compile it again on yours.

It was compiled on that account. Found by driving the served application in a
browser against a live account, and confirmed by decoding the token BattleGrid
returned:

```
plan token userId    bb334a1e-2ac2-4956-8dea-7c7cf01097b9    BattleGrid's account id
context.userId       "owner"                                  OWNER_USER_ID
```

### It is not only personal mode

`Authority.userId` is the product's **local** row id, and it is not BattleGrid's
identity in either mode:

```ts
// personal
export const OWNER_USER_ID = 'owner';

// delegated — connect.commands.ts
const proposedUserId = existingUserId ?? this.random.token(16);
//   stored as users.id, alongside a separate users.battlegrid_subject
```

Two columns, on purpose — *"the connection IS the identity"* names
`battlegridSubject` as the natural key, and `users.id` as the local one. So
`refuseLocally` compares BattleGrid's claim against a random sixteen-byte local id
in delegated mode and against the string `'owner'` in personal mode. **Neither can
ever match.** OAuth has never been completed, so nobody had exercised the delegated
path to notice.

`apply_strategy_plan` is the product's headline capability — *tuning* a strategy —
and it has never been able to run.

### The fixture made it unobservable

```ts
const USER = '…';
const claims = { userId: USER, … };
const context = { userId: USER, strategyId: STRATEGY };
```

One constant on both sides, so the two agree by construction. The test proves
`refuseLocally` compares correctly and can never show that nothing supplies it a
comparable value. Third fixture this week modelling a world that cannot exist.

### Two identities were doing one job

The real defect is conceptual. `Authority.userId` answers *"which rows in our
database"*. The plan token's `userId` answers *"which BattleGrid account"*. They
are different questions, they coincide in neither mode, and one field was carrying
both.

## What Changes

- **`Authority` carries the remote identity explicitly** —
  `battlegridSubject: string | null`, beside the local `userId`. Delegated mode
  already stores it. Personal mode discovers it, or reports `null`.
- **`refuseLocally` takes the remote identity, not the local one.** Its context
  parameter changes shape, so **passing a local id becomes a type error** — the
  compiler enforces the distinction rather than a scan.
- **Unknown is not mismatched.** Where the remote identity is `null`, the user
  check is skipped and the platform decides. Refusing on a fact we do not have is
  the mistake this product fixed in the fork affordance yesterday, and it is the
  mistake that produced this defect: a comparison against a value that was never
  BattleGrid's read as a mismatch rather than as an unknown.
- Personal mode discovers the account id from `list_user_active_positions`, which
  returns `userId` at the top level and takes no parameters. Observed, not
  inferred — it is in the probed surface artifact.
- The fixture stops using one constant for both sides.

## Capabilities

- `strategy-authoring` — applying a compiled plan must be able to succeed.
- `battlegrid-connection` — the local identity and BattleGrid's are distinct, and
  a check against the platform's own claim uses the platform's.

## Out of Scope

- **Backfilling `users.id` or audit rows.** Nothing stored changes. The earlier
  draft of this fix proposed replacing the local id with BattleGrid's, which would
  have relabelled history — the opposite of the `AuditActor` decision, where
  `'assistant'` was kept so an old row would not be re-attributed. Separating the
  two fields makes that unnecessary.
- **Weakening `refuseLocally`.** The user check is right: a plan compiled for one
  account must not apply to another. It is given the correct value, not removed.
- **Proving the apply end to end against BattleGrid.** Needs a key and a strategy
  the operator is willing to see change. The local block is what this change
  removes; whether the platform then accepts is the next question, and it is one
  only a live run answers.

## Track

`full`. It changes a contract two capabilities depend on, it is the headline
capability of the product, and the last change in this area shipped a CRITICAL
that every quality gate passed.
