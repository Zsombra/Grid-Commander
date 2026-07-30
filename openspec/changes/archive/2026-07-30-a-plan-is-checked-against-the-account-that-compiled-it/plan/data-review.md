# Data Review: a-plan-is-checked-against-the-account-that-compiled-it

## The flow

```
delegated:  connections.battlegrid_subject  →  asSubject()  →  Authority.battlegridSubject
personal:   list_user_active_positions.userId → asSubject() →  Authority.battlegridSubject
                                                 (or null, cached)
                                                       ↓
                                      DescribeApplyRequest.battlegridSubject
                                                       ↓
                                   refuseLocally(token, { battlegridSubject, … })
                                                       ↓
                          compared against the token's own `userId` claim
```

## No layer is skipped

The subject reaches the comparison from both entry points, and the comparison is the
only consumer. Before this change the value existed in the database and stopped
there: `users.battlegrid_subject` had been written on every connect since the schema
was authored and was read by nothing that needed BattleGrid's identity.

## No hidden recomputation

This change *removes* one. `refuseLocally` was effectively deriving "which account"
from `Authority.userId` — a value minted locally and unrelated to the platform. The
subject is now carried from where it is known rather than substituted from what
happened to be in scope.

## Absent is distinguished from empty

- `subjectFor` returns `null`, never `''`. A zero-length string would compare as a
  mismatch and refuse.
- `OwnerOnlyUser` distinguishes *not yet asked* (`undefined`) from *asked, unknown*
  (`null`), so a failed read is cached rather than retried on every request — and
  the two are different facts, which the type states.
- `refuseLocally` treats `null` as "cannot determine" and skips one check, rather
  than as "does not match".

## Persistence

No schema change, no migration, no relabelled rows. `users.id` still holds the local
id and audit rows still say `'owner'` on a personal deployment — which is the point
of DL-1, and the reason the alternative reading of this defect was rejected.

## What the pipeline does not carry

Whether BattleGrid accepts the applied plan. The product's own refusal is gone; the
platform's judgement is untested. Stated in the proposal and repeated in the
architecture review.
