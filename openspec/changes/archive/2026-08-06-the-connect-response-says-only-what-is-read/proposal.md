# Proposal: The Connect Response Says Only What Is Read

## Why

`CompleteConnectionResponse` carries three fields. The only production consumer
reads one:

```ts
// app/api/auth/battlegrid/callback/route.ts:31
const { userId } = await app.completeConnection.execute({ code, state });
await app.sessions.issue({ userId, issuedAt: new Date() });
```

`connectionId` and `isReturningUser` are read nowhere else in `src/` or `app/`.
Recorded as PG-003 in the `prove-it-runs` production gate and filed as
`unread-connect-response-fields`.

Two things make this worse than clutter.

**`isReturningUser` had its meaning changed for nobody.** `prove-it-runs`
widened it to `existingUserId !== null || resolved.userId !== proposedUserId`, so
that a callback which loses the identity race still reports its user as
returning. That is correct, and nothing observes it. The next reader will
reasonably assume the widening was made for a consumer and go looking for one —
an unread field whose semantics were recently changed is worse than an unread
field.

**`connectionId` is not merely unread; the value is wrong.**
`DrizzleConnectionRepository.upsert` mints an id for the insert and hands that id
back, while the insert is `onConflictDoUpdate` targeted on the unique index over
`user_id`, and its `set` block does not touch `id`
(`drizzle-connection-repository.ts:66-111`, `schema/index.ts:22,35`). On conflict
— which is every reconnection — the surviving row keeps its own primary key and
the returned id names no row.

The fake disagrees, in the direction that hides it: `FakeConnectionStore.upsert`
replaces the stored connection with the freshly minted id, so the value it
returns always names a row (`tests/support/fakes.ts:191-204`). The single
assertion that exists, `expect(res.connectionId).toBeTruthy()`, passes against
either. A consumer written against the fake would work in tests and read a
phantom id in production — the failure mode that fake's own comment was written
to prevent, one field over.

## Decision

**Decision: remove both fields, because the only consumer worth building is one
this product has already twice declined to build.**

Consuming `isReturningUser` means a first-time connection landing somewhere a
reconnection does not. That destination does not exist, and its absence is a
decision on the record twice over:

- `app/page.tsx` — "Rendering a third thing here would be a landing page — a
  product decision this change is not entitled to make."
- The callback has exactly one destination, `/agents`, and `/agents` already
  renders an empty roster honestly rather than needing a first-run variant.

Inventing a surface to give a boolean something to do is the wrong way round,
and nothing is lost by removing the field: whether a subject has connected
before is one `findUserIdBySubject` away, from the store that owns the fact, at
the moment a surface actually needs it. What the field *reported* goes; what it
reported *about* — one BattleGrid account resolving to one identity and one
workspace — is behaviour, is unchanged, and is what the tests now assert.

Rejected:

- **Build the first-run destination now, and consume the flag.** A product
  decision, not a cleanup. It needs its own proposal, its own empty states, its
  own place in the reachability walk, and a reason to disagree with the pages it
  would duplicate. Filed as nothing, because nobody has asked for it; if someone
  does, the flag is a one-line read at that point.
- **Fix `connectionId` and keep it** — return the surviving row's key with a
  second `.returning()` on the connection upsert. That produces a correct value
  nobody reads: it removes the phantom and keeps the trap, and adds a clause to
  the one write path in this product that concurrency has already bitten.
- **Drop it from the use-case response only, leaving `ResolvedConnection`
  alone.** The same unread field with the same wrong value, one layer down —
  and `ResolvedConnection.connectionId` would then be read by literally nothing,
  which is a worse hiding place than the one it is in now.
- **A comment saying "unread, deliberately".** A comment cannot fail, and this
  field already carries a comment explaining a widening nobody uses.

## What Changes

- `CompleteConnectionResponse` carries `userId` and nothing else — the identity
  the session is issued for, which is all the callback ever took.
- `ResolvedConnection` carries `userId` and nothing else. Both writers stop
  returning a connection id; the Drizzle writer still mints one for the insert,
  and now says in the file why it is not handed back.
- The three assertions that read the removed fields are replaced by assertions
  on the fact rather than on the report of it: a returning subject leaves one
  connection in the store and resolves to the identity that holds it; a new
  subject leaves two.
- A guard on the response shape, so a field arriving without a reader is a
  decision made in the test file rather than something that accumulates.

## What Is Not Changed

- **Behaviour.** A returning user still lands in the same workspace, and a
  callback that loses the identity race is still signed in under the identity
  that actually holds the connection. Both are properties of `upsert` resolving
  by subject, not of the fields being removed.
- **`connections.id`.** The row still has a primary key, `Connection.id` still
  carries it, and reads still reach a connection by user — which is how every
  caller already finds it.
- **The callback route** (`app/api/auth/battlegrid/callback/route.ts`). It
  destructures `userId` and is untouched.
- The identity race, the `ON CONFLICT DO UPDATE` that resolves it, and the
  database tests that prove it.

## Capabilities

**Touched in code**: `battlegrid-connection`. **No delta spec** —
`skip_specs: true` in `.openspec.yaml`.

This is genuinely internal. No requirement in
`openspec/specs/battlegrid-connection/spec.md` mentions either field, no
requirement can be satisfied or broken by their removal, and nothing a user can
observe differs before and after: the sole production consumer already read only
`userId`. The backlog item reaches the same conclusion and treats it as the
evidence rather than the loophole — "no requirement currently describes either
field, so removing them needs no spec change — which is itself the evidence that
nothing depends on them."

Writing a requirement to authorise a deletion would put internal mechanics into
the behaviour contract, which `openspec/config.yaml` asks specs not to carry. The
durable half lives in the test file instead, where it can fail.
