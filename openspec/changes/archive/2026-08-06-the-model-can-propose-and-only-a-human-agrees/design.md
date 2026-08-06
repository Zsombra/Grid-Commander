# Design

## The shape

```
model                  Grid-Commander                     BattleGrid
  │
  ├─ propose_stop_trading(agentId) ──▶ store intent
  │                                    (no read, no token, no call)
  ◀── { proposalId, url } ─────────────┘

                        … later, a human …

  operator opens /pending/<id>
                        ├─ describeEdit(...) ──────────────▶ read agent
                        ◀── consequence + token (300s) ─────┘
                        │
                        ├─ renders the same confirmation the web app
                        │  already renders for a web-initiated change
                        │
  operator agrees ──────┼─ performEdit(token) ─────────────▶ write
                        └─ audit
```

The model's call touches BattleGrid **not at all**. Everything from `describe`
rightwards is the path that exists today, unmodified.

## Decisions

**Decision: store the intent, not a minted confirmation — because a token is a
bearer capability with a 300-second life.**

Rejected: describe at proposal time and hold the token for the human. It fails
three ways. `CONFIRMATION_TTL_SECONDS = 300`, so a human arriving later than
five minutes — the normal case for reviewing a suggestion — meets an expired
token, making the common path an error. Whatever holds a token can complete the
write it was formed for, so storing one puts an unspent authorization at rest.
And the consequence would have been rendered against a world that has since
moved, which is exactly what digest-binding exists to prevent.

Rejected: MCP elicitation. Client support is uneven, and a server that silently
degrades to "no confirmation" where a client lacks it is worse than one that
refuses. Establishing it empirically remains open work
(`the-assistant-cannot-be-trusted-with-a-write`), and nothing here depends on
the answer.

**Decision: a proposal is a row, not a queue entry — because nothing consumes
it but a person.**

There is no worker, no retry, no scheduler. A proposal is inert until a human
opens it. This is why `A Proposal Confers No Authority And Expires Unagreed` can
be stated as strongly as it is: there is no code path that performs one.

**Decision: the describe runs at open time, in the web app, on the existing
route — because the confirmation must be bound to values the human saw.**

`/pending/<id>` resolves the proposal to the same describe → confirm → perform
the corresponding web surface uses. It does not reimplement the ceremony; it
enters it with the target and values pre-filled. That is the difference between
a second write path and a second doorway onto the first one.

**Decision: the proposal records the model's values verbatim and the page shows
the delta — because "what was proposed" and "what will happen" can differ.**

If the agent's revision moved, or the value already holds, the operator sees
what the model asked for beside what the fresh describe says. A page that
silently reconciled the two would be agreeing on their behalf.

**Decision: the read-only guard changes from a name prefix to reachability —
because `describe` is now a legitimate thing for a tool to reach and `perform`
never is.**

`tests/architecture/mcp-read-only.test.ts` currently derives mutating use-cases
from `/^(describe|perform|create|update|…)/`. That was right when no tool
touched any of them. It becomes: a tool may reach a use-case that touches only
this product's store; it may never reach one that calls a mutating BattleGrid
tool. Derived from the adapters, so a new write is covered without anyone
remembering to add it.

This is stricter than what it replaces. The old rule would pass a tool named
`stop_trading` that called `updateAgent`; the new one cannot.

**Decision: the domain does not learn what a proposal is for.**

A proposal names a *product operation* — the same vocabulary the web routes use
— not a BattleGrid tool. The MCP layer maps a tool call to an operation, the
web route maps an operation to its describe. Neither the domain nor the
proposal store imports the MCP client, and no BattleGrid tool name is written
into a migration.

## The store

One table. Columns: id, user id, operation, target, proposed values, recorded
at, status, resolved at. No token column, no access token column — the
`battlegrid-connection` delta forbids both and a test asserts the schema has
neither, so the guarantee survives a later migration written by someone who
has not read this file.

Uniqueness and ownership are enforced by PostgreSQL, in the pattern
`tests/db/` already establishes for confirmations and OAuth state: a fake could
only ever agree with the code.

## Staleness

A proposal has a horizon after which it shows as stale rather than actionable.
This is not the confirmation TTL and must not be confused with it — 300 seconds
is how long an *agreement* survives; the horizon is how long a *suggestion*
stays worth showing. The horizon is a product decision to be set in the plan,
and it is deliberately not "never".

## What the executor must not do

- Add a tool that performs, however guarded.
- Give the model any way to learn a confirmation token exists.
- Reconcile a moved target silently.
- Add a setting that performs proposals automatically. The design has no such
  hook and adding one undoes the argument for the whole change.
