# battlegrid-connection — delta

## ADDED Requirements

### Requirement: The Authorization Server's Own Description Is Checked, Not Assumed
Where BattleGrid publishes the location of an endpoint Grid-Commander depends
on, the product's value SHALL be checked against that publication rather than
trusted because it was once correct.

The project's stated lesson is that the tool list goes stale after a platform
deployment and must never be hard-coded. Four OAuth URLs were hard-coded and
compared to nothing, on the one path whose failure mode is sending a user to a
consent screen that does not exist. They agree today — which is the difference
between correct and *known* to be correct, and only the second survives a
deployment nobody told us about.

**The URLs SHALL remain pinned rather than read at request time.** This is not
the tool list and must not be treated like it. Tools change weekly and carry
annotations the product must obey; an issuer's endpoints are meant to be stable,
and a client that resolves its authorization endpoint from the network on each
request will follow a redirect an attacker controls the first time discovery is
poisoned. Pin, and check.

**What the product assumes of the protocol SHALL be checked the same way** — the
scopes it may request, the grant and response types it uses, and the PKCE method
it sends. Each is a claim about the server, and each is published.

#### Scenario: An endpoint the platform moved
- **WHEN** BattleGrid publishes an endpoint at a location the product does not use
- **THEN** the mismatch fails a check rather than a user's connection

#### Scenario: A capability the product assumes
- **WHEN** the product depends on a scope, grant type, response type or challenge
  method
- **THEN** it is confirmed present in what the platform publishes

#### Scenario: The published description changes
- **WHEN** the platform's description differs from what was recorded
- **THEN** that is detectable by re-fetching it and comparing
- **AND** the recording is what offline checks run against, so a stale recording
  cannot silently pass

### Requirement: The Client Registration Is Bounded At Registration
Grid-Commander SHALL register its OAuth client with the narrowest scope the
product needs, so authority it does not use is unrequestable rather than merely
unrequested.

BattleGrid's registration is open and unauthenticated, issues no
`client_secret` whatever authentication method is asked for, and returns no
management token — so a registration cannot be edited or revoked afterwards.
All security therefore rests on PKCE and exact redirect-URI matching, and the
registration itself is write-once.

That makes the scope requested at registration a ceiling worth using. Omitting
wager authority from each authorization request is one line of code away from
being added back; registering without it means stepping up is a deliberate act
of registering again.

#### Scenario: Registering the client
- **WHEN** an OAuth client is registered for a deployment
- **THEN** it requests only the scope the product uses
- **AND** it declares itself a public client, because no secret is issued

#### Scenario: Authority beyond the registration
- **WHEN** an authorization requests a scope the registration did not include
- **THEN** the product does not depend on the platform allowing it

## MODIFIED Requirements

### Requirement: What The Platform Returns Is Observed Wherever It Can Be
Where a read tool's required arguments can be satisfied from what the platform
has already returned, Grid-Commander's surface probe SHALL call it and record
the response shape. Where they cannot, it SHALL record which argument was
missing rather than reporting the tool as merely skipped.

A declared schema is what a server says; an observed response is what it does.
Every defect this product has found came from the second, and the tools that
could only be modelled from the first are where the next one is waiting. A probe
that reaches a fifth of the surface leaves four fifths to be built on
declarations.

The probe SHALL call only tools the server annotates as read-only, and that
filter MUST be applied in code before a request is built rather than by the
care of whoever runs it. Supplying arguments widens what can be observed; it
MUST NOT widen what can be called.

**This holds beyond the tool surface.** BattleGrid is also an OAuth
authorization server that describes itself, and what it says about its own
endpoints and capabilities is observable without any credential at all. A
boundary the product depends on and has never called is a boundary it has
assumed, whether or not a tool is involved.

#### Scenario: A read whose arguments can be discovered
- **WHEN** a read tool requires an argument the probe can take from a response
  it already holds
- **THEN** the tool is called and its observed shape recorded

#### Scenario: A read whose arguments cannot be discovered
- **WHEN** a required argument cannot be satisfied from what the platform
  returned
- **THEN** the tool is not called
- **AND** the record names the argument that was missing

#### Scenario: A tool that changes things
- **WHEN** a tool is not annotated read-only
- **THEN** it is never called, whatever arguments could be supplied
- **AND** this holds as a property of the code rather than of the operator

#### Scenario: A boundary that is not a tool
- **WHEN** the product depends on a platform boundary reachable without a tool call
- **THEN** it is observed and recorded rather than assumed
