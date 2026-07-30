---
id: apply-is-refused-for-every-personal-deployment
type: bug
status: done
priority: P1
capability: strategy-authoring
created: 2026-07-30
updated: 2026-07-30
change: a-confirmation-binds-to-what-was-agreed
---

# `apply_strategy_plan` is refused for every personal-key deployment

**A sixth dead write path, on the same call as the fifth.** Found live, against a
real account, driving the served application in a browser.

The review renders, names the blast radius, and offers **no Apply button**. The
page says:

> This plan was compiled for a different account. Compile it again on yours.

It was compiled on that account. The comparison is wrong:

```
plan token userId   bb334a1e-2ac2-4956-8dea-7c7cf01097b9   (BattleGrid's account id)
context.userId      "owner"                                 (OWNER_USER_ID)
```

`refuseLocally` in `src/domain/strategy/plan-token.ts:98` does
`if (c.userId !== context.userId) return { kind: 'different-user' }`, and
`OwnerOnlyUser` (`src/application/use-cases/owner-only-user.ts:19`) hands down the
literal string `'owner'`. In personal-key mode the two can never match, so
**every apply is refused before a request is built** — unconditionally, for the
only mode this operator runs.

## Evidence

Decoded from a live `compile_strategy_plan` response, 2026-07-30:

```
userId          = "bb334a1e-2ac2-4956-8dea-7c7cf01097b9"
credentialId    = "37ab0d89-19f3-461d-987a-9d3f7a48bc02"
strategyId      = "7fdf521e-9b48-49dd-8e04-1cefdcfede41"
operation       = "UPDATE"
expectedRevision = 2   proposedRevision = 3
```

Compiling is effect-free, so nothing on the account changed: the strategy is still
revision 2 with its original tagline, verified after.

## Why the previous fix did not cover it

`a-confirmation-binds-to-what-was-agreed` (DL-7) found and fixed a *different*
block on this same call — the confirmation was issued against
`strategy:<id>#<intentDigest>` and spent against `strategy:<id>`, so `consume`
never matched. That fix is correct and necessary. **It was not sufficient**, and
the reason is instructive: the confirmation refusal happens in `enforce()`, deep in
the adapter, while this one happens in `DescribeApplyQuery` before the button is
ever rendered. Fixing the inner block simply revealed the outer one.

Neither was visible to any test, because both fakes bypass the layer that refuses.

## The fix, and why it is not a one-liner

The honest reading: in personal-key mode the acting user **is** the BattleGrid
account, so `userId` should be BattleGrid's id rather than a synthetic constant.
`OwnerOnlyUser` would have to discover it — `get_account_state` is the candidate
read, and the plan token itself carries both `userId` and `credentialId`.

What makes it a change rather than an edit: `userId` is the identity written into
**audit rows** and **confirmation tokens**. Existing rows say `'owner'`. Switching
it silently relabels history in the opposite direction from the `AuditActor`
decision — where `'assistant'` was deliberately kept so an old row would not be
re-attributed. Same principle, so the switch needs a deliberate answer for rows
already stored.

**Do not weaken `refuseLocally` instead.** The user check is right: a plan compiled
for one account must not apply to another. Loosening it to make personal mode work
would remove a real guard to paper over a wrong identity.

## Priority

P1 because it is the product's headline capability — *tuning* a strategy — dead in
the deployment mode the operator actually uses, and because it is a **behavioural**
P1 rather than an infrastructure one, unlike the other three.

## Closed 2026-07-30 — and it was wider than this item said

`a-plan-is-checked-against-the-account-that-compiled-it` fixed it. Two corrections to
what is written above:

**Not personal-mode-only.** This item said "for every personal deployment". The
delegated path is equally dead: `connect.commands.ts:117` mints
`existingUserId ?? this.random.token(16)` as the local id and stores
`grant.subject` in a separate column, so `refuseLocally` compared BattleGrid's
account id against a random sixteen-byte string there too. OAuth has never been
completed, which is why nobody had noticed.

**The fix was not the one proposed here.** This item suggested making
`OwnerOnlyUser` discover BattleGrid's id and use it as `userId`, and flagged the
audit-row problem that creates. The change instead **separated the two identities** —
`Authority.battlegridSubject` beside `Authority.userId` — so nothing stored changes
and no row is relabelled. The database had modelled the distinction since it was
written; only the application layer had collapsed it.

`BattlegridSubject` is a branded type, so routing the local id there is now a compile
error rather than a convention. That took two attempts: a rename was claimed
sufficient in a decision log and was not.

**Still true, and still open elsewhere:** whether BattleGrid accepts the applied
call. This removed the product's own refusal only. → the gate's "Not verified"
section, and it needs a live apply.
