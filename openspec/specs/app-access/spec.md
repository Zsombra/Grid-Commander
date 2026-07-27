# App Access Specification

## Purpose

How a request in Grid-Commander comes to act for a particular user, with a
particular authority, and what happens when it cannot.

Every other capability assumes an answer to "which user, which token". This one
provides it, and it is the layer at which those capabilities' guarantees are
finally exercised rather than merely implemented.

## Requirements

### Requirement: A Request Acts For Exactly One Identified User
Grid-Commander SHALL determine, for every request that reaches a capability,
which user it acts for. It MUST NOT act for a user it cannot identify, and MUST
NOT allow a request to act for a user other than the one it identified.

#### Scenario: A request from a connected user
- **WHEN** a request arrives carrying a valid session
- **THEN** it acts for the user that session identifies
- **AND** the authority it uses is that user's connection

#### Scenario: A request with no session
- **WHEN** a request arrives with no session
- **THEN** it is refused
- **AND** the user is offered the path to connect

#### Scenario: A session naming a user who does not exist
- **WHEN** a session identifies a user with no record
- **THEN** the request is refused and the session discarded
- **AND** it is not treated as a new user

#### Scenario: A session that was not issued by Grid-Commander
- **WHEN** a session value arrives that this product did not issue
- **THEN** it is refused
- **AND** no user is identified from it

### Requirement: A Session Is Not A BattleGrid Credential
The value that identifies a request's user SHALL NOT be, contain, or be derived
from a BattleGrid token. A session MUST NOT be usable to act on BattleGrid
outside Grid-Commander.

#### Scenario: What the session carries
- **WHEN** a session is issued
- **THEN** it identifies the user and nothing more
- **AND** the BattleGrid authority remains where it was stored, reachable only
  by the server

#### Scenario: A session is disclosed
- **WHEN** a session value is obtained by someone else
- **THEN** they cannot use it to reach BattleGrid directly
- **AND** revoking the connection ends what they can reach through
  Grid-Commander

### Requirement: Authority Is Refreshed Before Use, Not After Failure
Where a connection's access token has expired or is about to, Grid-Commander
SHALL refresh it before making a call. It MUST NOT discover expiry by failing a
call the user was waiting on.

#### Scenario: A token near expiry
- **WHEN** a request needs authority whose token expires imminently
- **THEN** the token is refreshed first
- **AND** the request proceeds with the refreshed authority

#### Scenario: Refresh is not possible
- **WHEN** a token has expired and cannot be refreshed
- **THEN** the request is refused as disconnected
- **AND** the user is invited to reconnect, not shown a failure they cannot act
  on

#### Scenario: The stored authority is updated
- **WHEN** a refresh succeeds
- **THEN** the refreshed authority replaces what was stored
- **AND** a subsequent request does not refresh again unnecessarily

### Requirement: Losing Authority Is One Outcome, However It Was Lost
A request that cannot act because the connection is absent, revoked, expired
beyond recovery, or rejected by BattleGrid SHALL be reported to the user in one
consistent way.

#### Scenario: The connection was revoked here
- **WHEN** a user disconnected through Grid-Commander and then makes a request
- **THEN** they are told they are not connected and offered to reconnect

#### Scenario: The connection was revoked at BattleGrid
- **WHEN** authority was withdrawn at BattleGrid rather than here
- **THEN** the same outcome is reported, in the same terms
- **AND** the difference is not surfaced as a different kind of error

### Requirement: Every Capability Is Reachable
Each behaviour delivered by a capability of this product SHALL be reachable by a
user through the interface. A capability that exists only as an internal
interface MUST NOT be described as delivered.

#### Scenario: Connecting and disconnecting
- **WHEN** a user wants to connect or disconnect their BattleGrid account
- **THEN** both are reachable from the interface

#### Scenario: Reading the record of what was done
- **WHEN** a user wants to see what Grid-Commander did on their account
- **THEN** the audit log is reachable

#### Scenario: Authoring agents
- **WHEN** a user wants to view, create, edit, rebind, archive or reactivate an
  agent, or read its journal
- **THEN** each is reachable

### Requirement: The Composed Application Is Assembled Once, From Configuration
Grid-Commander SHALL construct the adapters that reach BattleGrid and the
database in one place, from configuration read at startup. A request MUST NOT
construct its own route to BattleGrid.

#### Scenario: A request reaching BattleGrid
- **WHEN** any request causes a BattleGrid call
- **THEN** it goes through the single composed adapter
- **AND** the guard sequence applies to it

#### Scenario: Configuration is missing
- **WHEN** required configuration is absent
- **THEN** the application does not start
- **AND** it does not run with a value it invented
