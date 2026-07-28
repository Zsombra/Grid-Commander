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
