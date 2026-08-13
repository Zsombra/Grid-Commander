---
id: oauth-path-may-be-dead-weight
title: The delegated OAuth path may now be dead weight
type: question
status: done
priority: p2
created: 2026-07-29
updated: 2026-08-13
change: ""
capability: battlegrid-connection
github: "91"
blocked_by: []
tags: [architecture, personal-mode]
---

# The delegated OAuth path may now be dead weight

> **Narrowed** — `oauth-endpoints-are-assumed`.
>
> Most of what "unproven" covered is now proven, without a credential:
>
> ```
> discovery endpoints match config.ts        ✓  authorize / token / revoke
> authorize accepts the product's exact URL  ✓  302 to the consent screen
> PKCE is enforced, not just advertised      ✓  no challenge → invalid_request
> registration open, no secret, scope-capped ✓  findings-dcr F-1 and F-2 hold
> callback handles error= from the server    ✓  redirects to /connect?declined
> ```
>
> **What is left is exactly three things, and all three need a browser:** the
> consent itself, the authorization-code exchange, and refresh. Token lifetimes
> and refresh-rotation behaviour are still unknown — `findings-dcr` predicted
> that on 2026-07-27 and it is still the honest answer.
>
> So this is no longer "the path may be dead weight". It is a working path with
> one untested segment, and the segment needs the operator at a keyboard.
> `docs/DEPLOYING.md` says so under *What is not here*.

## What

`a-personal-key` added a second way to reach BattleGrid and left the first
alone. If Grid-Commander stays a personal controller, the delegated path — PKCE,
the callback route, token refresh, per-user encrypted tokens, the `connections`
and `oauth_transactions` tables, `/connect` — is code that ships and never runs.

## Why it was kept

Deleting it on one turn of direction would have been a large irreversible change
made without evidence. It is audited, archived, and correct for the product the
idea brief describes; the personal path had not been run once when the direction
changed.

## What would settle it

Use. If a few weeks of real use never touches `/connect`, removing it is a
deliberate cleanup with evidence behind it rather than a guess.

Worth weighing on the other side:

- **It is the reason the brief believes third-party clients are permitted.** No
  terms of service are published; the argument was that BattleGrid deploys a
  full delegated-authorization stack, which is meaningless for a first-party
  app. Removing the client does not remove that reasoning, but it does remove
  the product's only demonstration of it.
- **It is what a multi-tenant version would need back.** If Grid-Commander ever
  serves anyone but its owner, this is the capability, and it is expensive to
  rebuild correctly — the guard sequence, single-use state, and the uniqueness
  one identity per account rests on are all tested against a real database.

## Notes

Not a defect. Filed so that the decision is made rather than drifted into, and
so the next person to read `battlegrid-connection` knows the second path exists
on purpose.

The `change:` link to `oauth-endpoints-are-assumed` was cleared 2026-08-12:
that change proved everything provable without a credential and archived.
What this item still holds — the keep-or-delete decision, settled by a few
weeks of real use never touching `/connect` — was never that change's scope.
The same browser session that would settle `prove-token-lifetimes` (#93)
would also inform this one.

---

# Falsified 2026-08-13 — the untested segment was tested, and it fails

The narrowing above ends: *"a working path with one untested segment, and the
segment needs the operator at a keyboard."* An operator sat at a keyboard.

A client was registered by DCR, the operator consented twice against live
BattleGrid, and the segment was walked end to end. **It does not work.** The
token response carries no `sub`, and `mcp-adapter.ts:430` throws
`'BattleGrid returned a grant with no subject; cannot establish identity'` on
every grant. Consent succeeds, the code exchanges, the tokens are valid and were
used successfully against `/mcp` — and the adapter refuses them.

BattleGrid is plain OAuth 2.1, not OIDC: `/.well-known/openid-configuration` is
404 and the authorization-server metadata advertises no `userinfo_endpoint`.
`sub` was never going to be there. Filed as
[[oauth-cannot-complete-without-a-subject]].

## What that does to this item

The two checklist lines above that this walk touched both hold — registration is
open and secretless, the callback handles `error=`. What changed is the
conclusion drawn from them.

This is no longer *keep or delete a working-but-unused path*. It is:

1. **Fix it, then decide** — one authenticated read after the exchange
   establishes identity honestly. A `/propose`, not a patch.
2. **Delete it** — now a cleaner call than it was, because the thing being
   deleted has never completed a single connection, so no use can be lost.
3. **Keep it as-is** — no longer defensible. Keeping code that ships, is
   audited, and cannot succeed is the opposite of what this item was filed to
   prevent.

"A few weeks of real use never touching `/connect`" is also no longer the test
it was written to be: nothing *could* touch `/connect` successfully, so silence
there proves nothing about demand.

## What survives unchanged

The two arguments on the other side still stand and are untouched by this:

- BattleGrid deploying a full delegated stack is still the reason the brief
  believes third-party clients are permitted — and the walk *strengthens* that,
  because the stack turned out to be more complete than assumed (open dynamic
  registration, working revocation, enforced PKCE).
- A multi-tenant version would still need this capability, and rebuilding it
  correctly is still expensive.

So the case for keeping the *capability* is intact. The case for keeping the
*current code* is not.

---

# 2026-08-13 — the decision gets a working path to be made about

`the-connection-asks-who-it-is` is open (full track) and takes option 1: identity
established by an authenticated read after the exchange, refusal releasing the
grant it was just given. It fixes
[[oauth-cannot-complete-without-a-subject]] (#203).

**This item stays open, and deliberately.** The change is explicit that the
keep-or-delete decision is out of its scope. What it removes is the reason the
decision could not be made honestly: until now it was being made about code that
had never run to completion, so "a few weeks of real use never touching
`/connect`" measured nothing.

Once one delegated connection has completed live, the original test becomes the
test it was written to be, and this item can be answered on use rather than on
argument.

---

# 2026-08-13 (later) — the decision is now a real one

`the-connection-asks-who-it-is` archived and **the delegated path completed live
for the first time**. This item can finally be answered the way it was written to
be answered: on use.

What changed for this decision:

- "A few weeks of real use never touching `/connect`" is a meaningful test again.
  Until today it measured nothing, because nothing *could* touch it successfully.
- The cost of keeping is now known rather than assumed: the path works, and it is
  covered by the walk plus `tests/architecture/granted-scopes.test.ts`.
- The cost of deleting is higher than it was this morning — the capability is
  proven, not merely audited.

Still open, still the operator's call, and no longer urgent.

---

# ANSWERED 2026-08-13 — keep the delegated path

**Decision: keep it.** Made by the operator, on the day the path first worked.

This item was filed so the decision would be *made* rather than drifted into. It
is now made, and the item closes on an answer rather than on neglect.

## Why

**Grid-Commander is a third-party multi-tenant client for BattleGrid** — that is
`CLAUDE.md`'s own first sentence about the domain, and the delegated path *is*
that capability. Deleting it would leave the product describing itself as
something it could no longer be.

The two standing arguments were never weakened and are now stronger:

- It is the only demonstration behind the brief's belief that third-party clients
  are permitted. BattleGrid deploys a full delegated-authorization stack — open
  dynamic registration, a secretless public client, enforced PKCE, working
  revocation — all re-confirmed live on 2026-08-13. That argument used to rest on
  a stack nobody here had completed. It no longer does.
- Rebuilding it correctly is expensive: the guard sequence, single-use state, and
  the one-identity-per-account uniqueness are each tested against a real
  database, and the walk added a defect class nobody would have re-derived (see
  `granted-scopes`).

And the thing that made deletion cheap this morning is gone: *"code that ships,
is audited, and cannot succeed"* was the strongest case against keeping it, and
`the-connection-asks-who-it-is` removed it. What would have been deleted is now a
working, live-proven capability.

## What this closes, and what it does not

Closed: the keep-or-delete question, and with it the standing instruction to
watch `/connect` usage for evidence of disuse. Real use is no longer the test,
because the answer no longer depends on it.

Not closed, and deliberately left alone: nothing here commits the product to
*serving* other users. Keeping the capability is not the same as opening the
door, and the multi-tenant surface has its own unaddressed questions — session
hardening, and [[a-refresh-is-trusted-to-be-the-same-account]] (#206) among them.
