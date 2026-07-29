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
A user's BattleGrid connection SHALL be their Grid-Commander identity. The
system MUST NOT maintain a separate password for a Grid-Commander account. One
BattleGrid account MUST resolve to exactly one Grid-Commander identity, however
many times its authorization is completed.

#### Scenario: Returning user
- **WHEN** a user who has connected before returns
- **THEN** authorizing with BattleGrid signs them in to their existing workspace

#### Scenario: A connection is removed
- **WHEN** a user disconnects their BattleGrid account
- **THEN** they can no longer act on that account through Grid-Commander
- **AND** their recorded history remains readable to them

#### Scenario: One authorization completed twice at once
- **WHEN** two authorization callbacks for the same BattleGrid account complete
  at the same time, and that account has never connected before
- **THEN** one identity exists for it afterwards
- **AND** both callbacks resolve to that identity
- **AND** neither reports a storage-level failure to the user

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

#### Scenario: A destructive operation is requested
- **WHEN** a user asks for something classified as destructive
- **THEN** they are shown what it will change or remove before it happens
- **AND** it proceeds only after they confirm

#### Scenario: Confirmation is withheld
- **WHEN** the user does not confirm
- **THEN** nothing is changed

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

#### Scenario: Offering to connect where there is nothing to connect
- **WHEN** a user reaches the page that begins an authorization, on a deployment
  acting with a configured credential
- **THEN** they are told this deployment acts with a configured credential
- **AND** no authorization can be started from it

#### Scenario: Which remedy applies is not decided per request
- **WHEN** the product is assembled
- **THEN** the remedy its failures will name is fixed for that deployment
- **AND** no request chooses it

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
