# Battlegrid Connection Specification

## Purpose

How Grid-Commander obtains, holds, scopes, and relinquishes authority over a
user's BattleGrid account. This capability owns the trust boundary: every other
capability reaches BattleGrid through it, and the safety rules it enforces are
the ones that cannot be delegated to a caller's good intentions.

## Requirements

### Requirement: Users Connect By Authorization, Never By Credential
Grid-Commander SHALL obtain access to a user's BattleGrid account through an
authorization flow conducted with BattleGrid. It MUST NOT ask a user to supply,
paste, or upload a BattleGrid credential, and MUST NOT accept one if offered.

#### Scenario: Connecting an account
- **WHEN** a user chooses to connect their BattleGrid account
- **THEN** they are sent to BattleGrid to authorize Grid-Commander
- **AND** on return, Grid-Commander can act within the granted scope
- **AND** at no point is the user asked for a credential

#### Scenario: The user declines
- **WHEN** the user declines authorization at BattleGrid
- **THEN** no connection is stored
- **AND** they are returned with an explanation and the option to retry

#### Scenario: The authorization response cannot be trusted
- **WHEN** a response arrives that does not correspond to a pending request
  initiated by this user
- **THEN** it is rejected
- **AND** no connection is stored

#### Scenario: BattleGrid is unreachable mid-flow
- **WHEN** authorization cannot be completed because BattleGrid does not respond
- **THEN** no partial connection is left behind
- **AND** retrying starts a fresh authorization

### Requirement: The Connection Is The Identity
A connection to BattleGrid SHALL be the identity Grid-Commander acts under, and
the product SHALL NOT invent an identity of its own to act with.

**The local identifier and BattleGrid's are distinct, and SHALL NOT be
interchanged.** `users.id` names a row in this product's database; the subject
BattleGrid issues names an account on the platform. They are stored as separate
columns precisely because they are different facts — one is minted here, the other
is given to us — and a value the platform issued MUST be compared only against the
platform's own.

Every comparison against a platform-issued claim SHALL be typed so that supplying
the local identifier is not possible, rather than guarded by convention. A
convention was in force and produced a check that could never pass: BattleGrid's
account id compared against a random sixteen-byte local id in one mode and the
string `'owner'` in the other.

**Where the platform's identity for the acting account is unknown, it SHALL be
represented as unknown** rather than substituted. A substituted identity reads as
a mismatch, and a mismatch reads as a refusal the user cannot act on.

#### Scenario: Acting under a delegated connection
- **WHEN** the product acts for a user who connected by authorization
- **THEN** the identity it presents to a platform-issued check is the subject
  BattleGrid issued, not the local row id

#### Scenario: Acting under the owner's own credential
- **WHEN** the deployment holds the owner's own key
- **THEN** the platform's identity for that account is established from the
  platform, or reported as unknown

#### Scenario: The two identifiers are not interchangeable
- **WHEN** code compares a platform-issued claim about an account
- **THEN** the local identifier cannot be supplied in its place

### Requirement: Read Scope Is Requested And Wager Scope Is Not
Grid-Commander SHALL request only the scope required to read and configure. It
MUST NOT request authority to commit funds. The authority an operation is
measured against SHALL be the authority recorded on the user's connection, never
an assumption about what was granted.

#### Scenario: Connecting
- **WHEN** a user authorizes Grid-Commander
- **THEN** the request covers reading and configuration only
- **AND** authority to commit funds is not requested

#### Scenario: A tool requiring wager authority is reached
- **WHEN** any operation would require authority the connection does not hold
- **THEN** the operation is refused before it is attempted
- **AND** the user is told which authority would be needed and that
  Grid-Commander does not currently request it

#### Scenario: The grant is narrower than what was asked for
- **WHEN** BattleGrid returns a grant carrying less authority than was requested
- **THEN** operations are measured against what was actually granted
- **AND** an operation the grant does not cover is refused before it is
  attempted, in the same way as one requiring wager authority

### Requirement: Configuration Authority Is Described Honestly
Where Grid-Commander describes the access a user is granting, it SHALL state
that the access permits creating and modifying agents and strategies. It MUST
NOT describe that access as read-only or view-only.

#### Scenario: Presenting what is being granted
- **WHEN** the user is shown what they are about to authorize
- **THEN** the description says the access can create and change agents and
  strategies
- **AND** it distinguishes that from the ability to commit funds, which is not
  being requested

### Requirement: Capabilities Are Discovered From The Live Connection
Grid-Commander SHALL determine which operations exist, and how each is
classified, from the connected BattleGrid server at the start of a session. It
MUST NOT rely on a list fixed at build time.

#### Scenario: Session start
- **WHEN** a user's session begins
- **THEN** the available operations and their classifications are read from the
  live connection

#### Scenario: The platform has changed since last time
- **WHEN** the discovered operations differ from those previously seen
- **THEN** the newly discovered set governs behavior for that session

#### Scenario: Discovery fails
- **WHEN** capabilities cannot be discovered
- **THEN** Grid-Commander permits only operations it can still confirm are
  read-only
- **AND** the user is told that configuration changes are unavailable until
  discovery succeeds

### Requirement: Unrecognised Operations Are Treated As Dangerous
An operation whose classification cannot be established SHALL be treated as
both modifying and destructive.

#### Scenario: An operation with no known classification
- **WHEN** an operation is available but its classification cannot be determined
- **THEN** it is treated as destructive
- **AND** it is not performed without the confirmation a destructive operation
  requires

### Requirement: Destructive Operations Require Confirmation Naming The Consequence
Before performing an operation classified as destructive, Grid-Commander SHALL
obtain confirmation from the user that names what will be changed or lost.

**A confirmation SHALL authorise the operation it described, and no other.**
Where the operation carries values — an amount, a destination, a configuration —
those values are part of what was agreed to, and a confirmation issued against
one set of values MUST NOT authorise a submission carrying different ones.

Matching the user, the tool and the entity is not sufficient. A token issued
against *"sets the most it may lose in a day to $25"* and a submission carrying
$25,000 are the same user, the same tool and the same agent. The consequence is
stored, so such a mismatch is **recorded** in the audit log; recording it is not
preventing it, and the audit log is what this product offers in place of trust.

**The binding SHALL be checked before a request is built**, not after the platform
answers. A refusal that arrives from BattleGrid has already sent the tampered
values.

**One mechanism, in one place.** Where several flows bind values into a
confirmation, they SHALL do so through a single shared construction rather than
each composing the same string by hand. Three flows building it independently is
how the fourth came to be written without it.

#### Scenario: A destructive operation is requested
- **WHEN** a user asks for something classified as destructive
- **THEN** they are shown what it will change or remove before it happens
- **AND** it proceeds only after they confirm

#### Scenario: Confirmation is withheld
- **WHEN** the user does not confirm
- **THEN** nothing is changed

#### Scenario: The submitted values differ from the agreed ones
- **WHEN** an operation is submitted carrying values other than those the
  confirmation was issued against
- **THEN** the confirmation does not authorise it
- **AND** no request is built

#### Scenario: The values are the ones that were agreed
- **WHEN** an operation is submitted carrying exactly the values described
- **THEN** the confirmation authorises it, once

### Requirement: Every Modifying Operation Is Recorded
Grid-Commander SHALL record every operation that modifies a user's BattleGrid
account. The record MUST be written before the operation is attempted and
updated with its outcome, and MUST be readable by that user.

#### Scenario: A successful change
- **WHEN** a modifying operation succeeds
- **THEN** the record shows what was attempted, when, and that it succeeded

#### Scenario: A failed change
- **WHEN** a modifying operation fails
- **THEN** the record shows what was attempted and that it failed

#### Scenario: Grid-Commander stops mid-operation
- **WHEN** the system stops between attempting an operation and learning its
  outcome
- **THEN** the record still shows that the operation was attempted
- **AND** its outcome is shown as unknown rather than assumed

#### Scenario: Reading the record
- **WHEN** a user reviews their history
- **THEN** they see every modifying operation Grid-Commander performed on their
  account, newest first

### Requirement: Conflicting Changes Are Surfaced, Never Silently Retried
When a change is refused because the underlying state moved on, Grid-Commander
SHALL report the conflict to the user. It MUST NOT re-attempt the change
automatically.

#### Scenario: The state changed underneath a pending edit
- **WHEN** a change is refused because it was formed against an older state
- **THEN** the user is told the state changed and their change was not applied
- **AND** no attempt is made to apply it against the newer state

### Requirement: A User Can Revoke Access
A user SHALL be able to disconnect their BattleGrid account, and doing so MUST
relinquish Grid-Commander's authority at BattleGrid, not merely locally.

#### Scenario: Disconnecting
- **WHEN** a user disconnects their account
- **THEN** Grid-Commander's authority is relinquished at BattleGrid
- **AND** stored authority is discarded
- **AND** no further operations can be performed on that account

#### Scenario: Revoked at BattleGrid instead
- **WHEN** authority is withdrawn at BattleGrid rather than through
  Grid-Commander
- **THEN** the next operation fails cleanly and the connection is shown as
  disconnected
- **AND** the user is invited to reconnect

### Requirement: A Deployment May Hold The Owner's Own Credential
Where a deployment is configured with a credential belonging to the person using
it, the product SHALL act with that credential directly and MUST NOT require a
delegated authorization it does not need.

A personal tool obtaining a grant to act on its own operator's behalf is
ceremony that protects nobody: the operator already holds the credential the
grant would produce.

#### Scenario: Configured with the owner's credential
- **WHEN** a deployment is given the owner's BattleGrid credential
- **THEN** requests act with it
- **AND** no authorization flow is required before the product can be used

#### Scenario: Not configured with one
- **WHEN** no owner credential is configured
- **THEN** the product behaves exactly as it does for a delegated connection
- **AND** nothing about the delegated path changes

#### Scenario: The credential stops working
- **WHEN** the platform refuses the owner's credential
- **THEN** the product reports the loss of authority in the same terms it
  reports a lost connection
- **AND** names the remedy that applies to a configured credential
- **AND** does not present the account as readable

#### Scenario: The owner is never turned away for lacking a session
- **WHEN** a deployment is configured with the owner's credential
- **THEN** no request is refused for having no session
- **AND** the page that reports a missing session is unreachable

### Requirement: A Declared Scope Is Not A Granted One
Where the authority a credential holds cannot be verified, the product SHALL
treat what it was told as a declaration, and MUST NOT present it as a
restriction the platform enforces.

A delegated grant is registered for named scopes, so authority beyond them is
unobtainable. A credential the operator supplies carries whatever the platform
gave it, which may be more. Presenting the second as though it were the first
would claim a boundary that does not exist.

#### Scenario: Acting with a declared scope
- **WHEN** the product acts with a credential whose scopes were declared rather
  than granted
- **THEN** the declaration is used to decide what may be attempted
- **AND** it is not described to the user as a limit the platform imposes

#### Scenario: What still decides
- **WHEN** an operation would change or destroy something
- **THEN** it is decided by what the platform says the operation does, and by
  confirmation
- **AND** not by the declared scope alone

#### Scenario: Declaring less than the credential holds
- **WHEN** a declaration names fewer scopes than the credential actually carries
- **THEN** the product still refuses what the declaration excludes
- **AND** this is understood as the product's own restraint, not the platform's

### Requirement: A Deployment Without A Login Says So
Where the product acts as the owner without authenticating anyone, it SHALL
disclose that on the pages it serves.

Anyone who can reach such a deployment acts as the account owner. That is
correct on one person's machine and wrong the moment it is reachable from
anywhere else, and the difference is invisible from the screen.

#### Scenario: Using a deployment that authenticates nobody
- **WHEN** a user is on any page of a deployment acting as the owner
- **THEN** they are told that it authenticates nobody
- **AND** told what that means for anyone else who can reach it

#### Scenario: A deployment that does authenticate
- **WHEN** the product resolves a session before acting
- **THEN** no such disclosure is shown

### Requirement: A Remedy Named Must Exist In That Deployment
Where the product tells a user how to recover from a failure, it SHALL name a
remedy available in the deployment they are using, and MUST NOT name one that
exists only in another.

Diagnosis and remedy are different facts and travel differently. *What went
wrong* is the same everywhere — authority is no longer valid — and is stated in
one way for every cause, so nobody has to distinguish an expired token from a
forged cookie. *What to do about it* depends on how the deployment obtained its
authority in the first place, and there are only two answers.

Naming the wrong one is worse than naming none. A user who is told to reconnect
goes looking for a connect button; when there is none, the reasonable conclusion
is that the product is broken, not that the advice was written for a deployment
they are not running.

This is why a failure that carries a remedy is shown with the sentence it
carried, rather than being routed somewhere that composes its own. Sending an
operator whose write just failed to the page that begins an authorization is
correct on a deployment that can begin one, and on a deployment acting with a
configured credential it renders "there is nothing to connect" — a true fact
about the deployment, and an answer to a question they did not ask.

#### Scenario: A configured credential is refused
- **WHEN** the platform refuses the credential a deployment was configured with
- **THEN** the user is told the authority is no longer valid
- **AND** told to repair the configured credential
- **AND** not told to reconnect

#### Scenario: A delegated authority is lost
- **WHEN** a deployment that authenticates users loses its authority for one of
  them
- **THEN** the user is told the authority is no longer valid
- **AND** invited to reconnect

#### Scenario: A remedy carried by a failure is not replaced by a redirect
- **WHEN** a failure carries the remedy for the deployment that raised it
- **THEN** that sentence is what the operator is shown
- **AND** they are not sent instead to a page that names a different remedy or
  none

#### Scenario: Offering to connect where there is nothing to connect
- **WHEN** a user reaches the page that begins an authorization, on a deployment
  acting with a configured credential
- **THEN** they are told this deployment acts with a configured credential
- **AND** no authorization can be started from it

#### Scenario: Which remedy applies is not decided per request
- **WHEN** the product is assembled
- **THEN** the remedy its failures will name is fixed for that deployment

### Requirement: A Tool Result Is Read From Its Envelope, Or Refused
Grid-Commander SHALL extract the payload a tool returned from the transport
envelope that carries it, and MUST NOT treat an envelope it cannot read as an
empty result.

An envelope and a payload are different things. Handing the envelope to code
expecting the payload does not fail — every field it looks for is simply absent,
and absent reads as *nothing there*. That turns a broken integration into a
confident, wrong statement about the user's account: no agents, no strategies,
no capacity. It is the same class of error as reporting an unread roster as an
empty one, one layer further down, and the type system cannot see it because
both are objects.

#### Scenario: A tool returns a payload
- **WHEN** a tool call succeeds
- **THEN** the caller receives what the tool returned, not the envelope around it

#### Scenario: The envelope carries the payload in more than one encoding
- **WHEN** a result offers the payload both as structured data and as text
- **THEN** either may be read
- **AND** the caller cannot tell which was used

#### Scenario: The envelope cannot be read
- **WHEN** a result carries no payload in any encoding the product understands
- **THEN** the call fails
- **AND** it MUST NOT be reported as a successful call that returned nothing
- **AND** the user is told the platform could not be reached, rather than that
  they own nothing

### Requirement: A Refused Tool Call Is A Failure
Where the platform accepts a request and reports that the tool itself refused,
Grid-Commander SHALL treat that as a failed operation.

A tool that rejects its arguments answers over a healthy transport: the response
is well-formed and the status is success. Reading only the transport makes every
such refusal look like an operation that ran and changed nothing — which is
indistinguishable, in the record, from one that ran and did nothing.

#### Scenario: The platform reports a tool error
- **WHEN** a result is marked as an error by the platform
- **THEN** the call fails rather than returning a payload
- **AND** the failure carries what the platform said about it

#### Scenario: The record of a refused call
- **WHEN** a modifying operation is refused by the tool
- **THEN** the audit record for it shows that it failed
- **AND** does not show it as succeeded

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

### Requirement: The Record Carries What Each Operation Requires And Accepts, At Every Depth
The record of the platform's surface SHALL carry, for every operation, each
required parameter as a full path from the argument root — not the top level
only — and, for every object the platform closes to an enumerated property
set, that path's accepted property names and the fact that it is closed. Where
an object path is a union of alternatives, each alternative SHALL be recorded
distinguishably, so a check can hold a payload against the alternative it
actually uses rather than against a merge that demands too much or accepts too
little.

A record that stops at the top level checks that a slot is filled and can never
check what fills it. A payload can satisfy every top-level requirement and omit
a required field three levels down; an object closed to twenty keys rejects a
whole payload for one unaccepted twenty-first — and the record could not say
so, which is how an edit path shipped that could never succeed.

#### Scenario: A required field below the top level
- **WHEN** an operation's declaration requires a field nested inside an object
  or an array
- **THEN** the record carries that requirement as a full path
- **AND** a check can ask whether a payload satisfies it without reading the
  declaration itself

#### Scenario: An object closed to enumerated properties
- **WHEN** an operation's declaration closes an object to an enumerated
  property set
- **THEN** the record carries, at that path, the accepted names and the fact
  that the object is closed

#### Scenario: An object that is a union of alternatives
- **WHEN** an object path is declared as a union of alternative shapes
- **THEN** each alternative's required paths and accepted set are recorded
  distinguishably
- **AND** a check can select the alternative a payload uses by the value that
  discriminates them

#### Scenario: The declared record is refreshed without a live call
- **WHEN** the declared portions of the record are regenerated from the
  committed record of what the server declares
- **THEN** every observed response in the record is left exactly as it was
- **AND** nothing is recorded as observed for an operation that was never
  called

### Requirement: A Constructed Payload Is Checked Against Required Paths And Accepted Sets
For every payload Grid-Commander constructs for a platform operation, a check
that gates a change SHALL verify that every required path in the operation's
declaration is present and that no key appears, at any path the declaration
closes, outside that path's accepted set. Where a payload carries an object the
platform itself supplied and Grid-Commander passes through unaltered, the check
SHALL exempt that object's internals explicitly — named as pass-through in the
check — rather than by silently skipping it.

#### Scenario: A required field is missing below the top level
- **WHEN** a constructed payload satisfies every top-level requirement and
  omits a required field nested deeper
- **THEN** the gating check fails
- **AND** it names the missing path

#### Scenario: A key outside a closed accepted set
- **WHEN** a constructed payload carries a key an enclosing closed object does
  not accept
- **THEN** the gating check fails and names the path
- **AND** the failure states that the platform rejects the whole payload for
  it, not just the key

#### Scenario: A server-round-tripped object
- **WHEN** a payload includes an object handed back from the platform rather
  than built by Grid-Commander
- **THEN** the check does not demand Grid-Commander supply that object's
  internals
- **AND** the exemption is visible in the check as a named pass-through, so
  removing it is a decision rather than an accident

### Requirement: A Credential In The Environment Is Not Consent To Mutate

An automated check that can reach a mutating BattleGrid tool SHALL require an
explicit instruction to perform writes, separate from the credential that makes
them possible. The presence of a credential SHALL NOT by itself be sufficient.

Authority and intent are different things. A credential exported so that a
read-only check can run is not an agreement to fork, archive, or create
anything on the account it belongs to, and a check that treats it as one
performs writes nobody asked for.

Which tools count as mutating SHALL be derived from BattleGrid's own
classification rather than from a list held in this repository, because a list
goes stale exactly when the platform changes and that is when it matters.

#### Scenario: A credential is present and nothing asked for writes
- **GIVEN** a BattleGrid credential in the environment
- **AND** no explicit instruction to perform live writes
- **WHEN** the verification suite runs
- **THEN** no check reaches a mutating tool
- **AND** the checks that would have are reported as not run

#### Scenario: Writes are asked for explicitly
- **GIVEN** a BattleGrid credential in the environment
- **AND** an explicit instruction to perform live writes
- **WHEN** a mutating check is run
- **THEN** it runs

#### Scenario: A check that only expects a refusal
- **GIVEN** a check that reaches a mutating tool expecting the platform to
  refuse it
- **WHEN** the gating is decided
- **THEN** it requires the same explicit instruction as any other mutating
  check
- **AND** the expectation of refusal does not exempt it, because whether the
  platform still refuses is a claim about the platform

#### Scenario: A new mutating check added later
- **GIVEN** a check is added that reaches a mutating tool without the explicit
  instruction
- **WHEN** the guards run
- **THEN** they fail and name the check and the tool it can reach

### Requirement: A Failure Says What Happened, In The Operator's Terms
Where a read or an operation fails, the reason Grid-Commander shows SHALL be a
statement of what happened, not the protocol artefact that carried it.

A status line, a method name, or a tool identifier is diagnostic material. It
may accompany the reason and SHALL NOT be the whole of it — the person reading
it has to be able to tell whether the fault is theirs, their credential's, or
the platform's, and act accordingly.

Where the distinction is available, the reason SHALL distinguish a platform that
did not answer from one that answered and refused, because the two have
different remedies and one of them is "wait".

#### Scenario: The platform is unreachable
- **WHEN** the platform answers with a gateway failure
- **THEN** the reason states that the platform is not answering
- **AND** states that this is not a fault in the operator's account or credential
- **AND** carries the status alongside, rather than instead

#### Scenario: The platform refuses the request
- **WHEN** the platform answers with a client error other than a withdrawal of authority
- **THEN** the reason states that the platform refused the request
- **AND** is distinguishable from the platform being unreachable

#### Scenario: An operation is refused because its classification is unknown
- **WHEN** an operation cannot be performed because Grid-Commander could not
  establish what it does
- **THEN** the reason states that it could not be confirmed and so was not performed
- **AND** does not assert what kind of operation it was

### Requirement: A Recorded Proposal Carries No Authority

A proposal recorded on an operator's behalf SHALL hold no credential, no
confirmation, and no reservation against their BattleGrid account. It SHALL be
a statement of intent and nothing that can be spent.

The confirmation this product mints is a bearer capability: whatever holds one
can complete a write it was formed for. Storing one against a future human
decision would put an unspent authorization at rest, reachable by anything that
reaches the store, for as long as it lives.

#### Scenario: What is stored
- **WHEN** a proposal is recorded
- **THEN** no confirmation token is stored with it
- **AND** no access token is stored with it

#### Scenario: A proposal store that leaks
- **GIVEN** an attacker who can read every recorded proposal
- **WHEN** they use everything they find
- **THEN** no change can be made to any BattleGrid account

### Requirement: Authority Lost Mid-Operation Is Told Apart From A Refusal
Where an operation fails because the account's authority is no longer valid,
Grid-Commander SHALL say that, and SHALL NOT present it as a refusal of that
operation.

They are different facts with different futures. A refusal is about the thing
that was attempted — a revision moved, a value was rejected — and attempting
something else may well work. Lost authority is about the account: nothing will
work until the credential is repaired or the connection remade. An operator who
reads "Refused:" above a live confirmation form will press it again, because
that is what the screen is for.

Where authority is lost, the surface SHALL NOT offer the control that performs
the operation. A control that cannot succeed is not made honest by the sentence
above it.

The sentence shown SHALL be the one the failure carried, because it is built
with the remedy belonging to the deployment that raised it — see *A Remedy
Named Must Exist In That Deployment*.

#### Scenario: A write fails because authority is gone
- **WHEN** an operation fails because the account's authority is no longer valid
- **THEN** the operator is told the authority is no longer valid, with that
  deployment's remedy
- **AND** it is not presented as a refusal of the operation they attempted

#### Scenario: Nothing to press
- **WHEN** a surface reports that authority is no longer valid
- **THEN** it does not render the control that performs the operation

#### Scenario: A refusal is still a refusal
- **WHEN** an operation is refused for any reason other than lost authority
- **THEN** it is reported as a refusal, and the surface may still offer the
  operation
