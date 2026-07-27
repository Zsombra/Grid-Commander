# Design: wire-the-app

---

## W-A · The session is a signed pointer to a user, and nothing else

**Decision**: The session cookie carries a user id and an HMAC over it, keyed by
a server-held secret. No BattleGrid token, no scopes, no expiry claim about the
grant.

**Why**: `connect-battlegrid-account` encrypted tokens at rest so that a database
dump alone is not usable. Putting a token in a cookie would hand out, to every
browser, the thing that work was protecting. And a cookie is disclosed far more
easily than a database.

The HMAC is what makes it a session rather than a suggestion. Without it, a user
id in a cookie is an invitation to type someone else's.

**Why not a random session id in a table?** It is the more conventional answer
and it is better in one way — instant server-side invalidation. It costs a table,
a read on every request, and a cleanup job. The deciding factor is that this
product's authority is *already* revocable at its source: disconnecting revokes
the grant at BattleGrid, so a stolen session survives as a pointer to a user
whose connection holds nothing. The blast radius of a leaked session is bounded
by the connection, not by the session's lifetime.

**Recorded as a known limitation**: a leaked cookie remains valid until it
expires or the connection is revoked. If the product later holds anything not
gated by the BattleGrid connection, this decision needs revisiting.

## W-B · Refresh happens in one place, and it is the place that hands out authority

**Decision**: A single `resolveAuthority(userId)` reads the connection, refreshes
if `needsRefresh` says so, persists the result, and returns the access token.
Nothing else reads a token from the database.

**Why**: `needsRefresh` and `expiryFromResponse` were written and tested in
change 1 and never called. Scattering the call to them across routes guarantees
one route forgets, and the symptom — an intermittent 401 on one screen — is
miserable to diagnose.

One place also means one answer to the harder question: what happens when a
refresh fails. It becomes `ConnectionRevokedError`, which the product already
knows how to present, rather than a new failure mode per route.

**Consequence**: `resolveAuthority` is the only function that may decrypt a
token. That is a property worth asserting structurally.

## W-C · Losing authority collapses to one outcome deliberately

**Decision**: absent connection, revoked connection, unrefreshable token, and a
401 from BattleGrid all produce the same user-facing result: not connected,
reconnect.

**Why**: they differ in cause and not in remedy. Every one of them is fixed by
authorizing again, and none of them is fixed by anything else the user could do.
Distinguishing them in the interface would offer a distinction the user cannot
act on — which is the same mistake as "tools/call failed with 401", the defect
verification caught in change 1.

**What is not collapsed**: the audit log still records what actually happened,
because that record answers a different question than the screen does.

## W-D · Routes are thin, and the thinness is enforced

**Decision**: A route handler resolves the session, resolves authority, calls one
use case, and renders. No branching on domain state, no validation, no BattleGrid
call.

**Why**: everything a route might be tempted to do is already implemented and
tested one layer down. A route that re-checks capacity, or re-validates a bound,
creates a second answer that will drift from the first — and the first is the one
with the tests.

**Enforced**: a structural test asserts no file under `app/` imports from
`@/infrastructure` or `@/domain`. Routes may touch `@/application` and
`@/presentation` only.

## W-E · The composition root is a module, not a framework feature

**Decision**: One module builds the adapters from `loadConfig()` and memoises
them. Routes import from it.

**Why**: Next.js offers several places to do this and none of them is one place.
A module is boring, testable, and obvious to a reader; it also fails at import
time when configuration is missing, which is the behaviour the requirement asks
for — the application must not start with a value it invented.

**Cost**: a module-level singleton is awkward to substitute in tests. Mitigated
by the fact that nothing worth testing lives in it — every dependency it wires is
independently tested with a fake, and the one thing worth asserting about the
root itself is that it exists and is used, which is structural.

## W-F · One end-to-end test, and it goes through the guard

**Decision**: A test drives request → session → `resolveAuthority` → guard
sequence → adapter → response, against a fake BattleGrid at the fetch boundary.

**Why**: this is the assumption two changes have been resting on. Every layer is
tested against its own contract; nothing has ever asserted the contracts are
plugged into each other. The specific thing worth proving is that a destructive
call made through the real path really does require a confirmation and really
does write an audit row — because those are guarantees about the call path, and
until now no request has taken it.

**Deliberately one test, not a suite**: the layers below are thoroughly covered.
What is missing is a single proof of connection, not a second copy of the
coverage.

## W-G · The user record is created at connection time, and only there

**Decision**: `ConnectAccountCommand` already creates the user on first
authorization. The session layer never creates one — a session naming an unknown
user is refused and discarded.

**Why**: a session that can create a user is a session that can invent one. The
identity comes from BattleGrid confirming a grant, which is the whole basis of
"the connection is the identity"; a signed cookie is evidence of a previous
session, not evidence of a grant.

This is the requirement scenario *A session naming a user who does not exist*,
and the tempting bug is to treat it as a first visit.
