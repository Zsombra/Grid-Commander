# Architecture Review: a-plan-is-checked-against-the-account-that-compiled-it

## Dependency direction

- `src/domain/connection/subject.ts` — imports nothing. A branded string and its
  constructor.
- `src/domain/strategy/plan-token.ts` — imports the sibling domain module by
  relative path, consistent with the rest of `src/domain/`.
- `src/ports/account.ts` — imports the domain type only, which is what every other
  port does.
- `src/infrastructure/battlegrid/account-adapter.ts` — imports the port, the domain
  type, and `OWNER_USER_ID` from an application use case.

**One inward-pointing import to justify.** The adapter imports `OWNER_USER_ID` from
`src/application/`. Infrastructure may depend on application in this codebase's
layering — `boundaries.test.ts` forbids `app/` → domain and enforces that the
domain imports nothing outward, and it passes. The value is needed because
`callTool` attributes an audit row, and this call runs *before* an identity exists;
attributing it to the owner constant is the honest answer for a read whose whole
purpose is to discover who we are.

## No runtime dual-path

- One place answers "which BattleGrid account": `Authority.battlegridSubject`.
  Delegated reads it from the connection, personal discovers it. The composition
  root picks the implementation once, as it already did for `ActingUser`.
- One place compares it: `refuseLocally`.
- `null` is not a second path. It is the absence of a fact, and it removes exactly
  one check while the other three keep running — asserted directly.

## No defensive fallback masking a contract

The `catch` in `McpAccountAdapter.subjectFor` returns `null`, and `null` is a
declared answer rather than a swallowed failure: the port's own comment says so, and
the value flows to a check that treats unknown as unknown. This is the one shape of
`catch` this codebase permits, and the alternative was measured: failing closed here
means a deployment whose positions read is down cannot apply a plan, which is the
defect being fixed arriving through another door.

`OwnerOnlyUser` caches `null` as readily as a value, so a failed read does not
become a failing call in front of every page.

## No stale or redundant runtime code

`grep` over the touched paths: no `TODO|FIXME|HACK|XXX`. Nothing was left behind —
`refuseLocally` has one signature, `Authority` has one shape, and no previous field
survives alongside a replacement. `asSubject` has four call sites, each at a real
boundary; the type has no other constructor.

## Contract consistency

`BattlegridSubject | null` is spelled identically in `Authority`, `AccountPort`,
`DescribeApplyRequest` and `refuseLocally`'s context. The brand means a mismatch is
a compile error rather than a convention, which is the point of DL-2.

`users.battlegrid_subject` is `text` and unchanged. Nothing stored moves.

## What this review flags

**The property this change is named for is not proven end to end.** Applying a plan
now passes the product's own account check; whether BattleGrid then accepts the
call is unverified, because that needs a key and a strategy the operator is willing
to see change. The proposal says so in Out of Scope. Worth repeating here because
the last two changes to this call each removed one block and revealed another, and
the honest position is that a third is possible.
