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
user through the interface, in a build of the application that serves.
Reachability SHALL be measured from what the interface offers, not from what the
application contains: a route that exists, a page that renders, and a build that
succeeds are each necessary and none of them is sufficient. A capability that
exists only as an internal interface, only in source that cannot be built, or
only behind an affordance that leads nowhere, MUST NOT be described as
delivered.

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
- **AND** each can be carried out, not merely opened

#### Scenario: Authoring strategies
- **WHEN** a user wants to list, edit, fork, archive or restore a strategy, or
  apply a compiled plan
- **THEN** each is reachable
- **AND** each can be carried out, not merely opened

#### Scenario: Reachable in a served build
- **WHEN** a capability is described as reachable
- **THEN** its route is present in a build of the application
- **AND** requesting that route from the served application returns a page

#### Scenario: A route table is not the interface
- **WHEN** reachability is checked by enumerating the routes the application
  defines
- **THEN** that check is not sufficient
- **AND** the check that decides the requirement starts from what the interface
  renders

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

### Requirement: The Application Builds Into A Servable Artifact
Grid-Commander SHALL be buildable into an artifact that serves every route it
declares. A route that exists in source but cannot be built MUST NOT be counted
as reachable, and the build MUST be checked on every change rather than at
release time.

#### Scenario: The production build
- **WHEN** the application is built for production
- **THEN** the build succeeds
- **AND** every route declared in the source appears in the build output

#### Scenario: A route that cannot be assembled
- **WHEN** a source route cannot be built into the artifact
- **THEN** the build fails
- **AND** the failure is reported by the same checks that gate a change, not
  discovered at deploy time

#### Scenario: A type check is not a build
- **WHEN** every source file type-checks but the application cannot be assembled
- **THEN** the checks that gate a change still fail
- **AND** the passing type check is not reported as evidence the product builds

#### Scenario: Serving a capability page without a connection
- **WHEN** the built application is served and a visitor with no connection
  opens a capability page
- **THEN** the page renders the not-connected outcome
- **AND** no call is made to BattleGrid

### Requirement: The Schema Is Created By A Committed Migration
The database schema this product reads and writes SHALL be created by migrations
committed to the repository. The application MUST NOT depend on a schema
assembled by hand, and a schema change MUST NOT reach the repositories without a
migration that produces it.

#### Scenario: A fresh database
- **WHEN** the committed migrations are applied to an empty PostgreSQL database
- **THEN** every table, index and constraint the repositories depend on exists

#### Scenario: The schema is changed without a migration
- **WHEN** the schema the code declares no longer matches the committed
  migrations
- **THEN** this is detectable from the repository alone, without a database

### Requirement: Stored-Data Behaviour Is Proven Against A Real Database
The guarantees this product makes about stored data SHALL be verified against a
real PostgreSQL instance. A test double MUST NOT be the only evidence for a
behaviour the database is responsible for enforcing.

#### Scenario: Single-use tokens
- **WHEN** a confirmation token or an OAuth state is presented twice
- **THEN** the second presentation is refused by the database, not by a check
  the application performs afterwards

#### Scenario: Two requests presenting one token at the same instant
- **WHEN** two concurrent requests present the same unspent confirmation token
- **THEN** exactly one of them succeeds

#### Scenario: Uniqueness the code relies on
- **WHEN** a second record is written that the code assumes cannot exist
- **THEN** the database rejects it

#### Scenario: A guarantee the fake cannot show
- **WHEN** a stored-data behaviour is verified only against a test double
- **THEN** it is not treated as proven

### Requirement: Every Affordance The Interface Offers Resolves
Where the interface offers a user a way to reach something, that way SHALL
resolve to a route the application serves. An affordance that the product
decides a user is entitled to use MUST NOT lead nowhere.

#### Scenario: A link the interface renders
- **WHEN** the interface renders a link to somewhere in this product
- **THEN** requesting it returns a page rather than a not-found

#### Scenario: An affordance gated on permission
- **WHEN** the product decides a user may edit, rebind, archive, reactivate,
  fork or restore, and renders the affordance for it
- **THEN** following that affordance reaches the thing it offered

#### Scenario: An affordance with no destination
- **WHEN** the interface can render a link to a route that does not exist
- **THEN** this fails a check that gates a change, rather than being found by a
  user

### Requirement: Every Form The Interface Renders Can Be Submitted
A form the user is shown SHALL be connected to the operation it describes.
Submitting it MUST reach that operation, and an operation that no form reaches
MUST NOT be described as delivered.

#### Scenario: Submitting a rendered form
- **WHEN** a user submits a form the interface rendered
- **THEN** the operation it describes is performed

#### Scenario: A form bound to nothing
- **WHEN** a form is rendered whose submission would reach no operation
- **THEN** this fails a check that gates a change

#### Scenario: An operation nothing submits to
- **WHEN** an operation exists that no rendered form reaches
- **THEN** this fails a check that gates a change
- **AND** it is not counted as reachable merely because its page renders

#### Scenario: A form that renders correctly and does nothing
- **WHEN** a form displays its fields and its button, and submitting it performs
  no operation
- **THEN** this is a failure of reachability, not of presentation
