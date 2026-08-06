---
id: unread-connect-response-fields
title: CompleteConnectionCommand returns two fields nothing reads
type: debt
status: done
priority: p3
created: 2026-07-28
updated: 2026-08-06
change: the-connect-response-says-only-what-is-read
capability: battlegrid-connection
blocked_by: []
tags: [cleanup, api-surface]
---

# CompleteConnectionCommand returns two fields nothing reads

## What

`CompleteConnectionResponse` carries `userId`, `connectionId` and
`isReturningUser`. The only production consumer is the callback route:

```ts
const { userId } = await app.completeConnection.execute({ code, state });
await app.sessions.issue({ userId, issuedAt: new Date() });
```

`connectionId` and `isReturningUser` are read by nothing outside two unit tests.

Recorded as PG-003 in the `prove-it-runs` production gate.

## Why it matters

Less as clutter than as a trap. `prove-it-runs` widened `isReturningUser` to
`existingUserId !== null || resolved.userId !== proposedUserId`, so that a
callback which lost the identity race still reports the user as returning —
which is correct, and which nothing observes. The field now looks like it
carries a decision and does not.

An unread field whose semantics were recently changed is worse than an unread
field, because the next reader reasonably assumes the change was made for a
consumer.

## Fix

Decide per field, and they are not the same.

`isReturningUser` has an obvious use nobody has built: a first-time connection
could land somewhere different from a reconnection. Either build that or drop
the field.

`connectionId` is harder to justify. The session is keyed by user, the audit log
is keyed by user, and the connection row is reachable by user. Dropping it is
the likely answer.

Whichever way, no requirement currently describes either field, so removing them
needs no spec change — which is itself the evidence that nothing depends on them.
