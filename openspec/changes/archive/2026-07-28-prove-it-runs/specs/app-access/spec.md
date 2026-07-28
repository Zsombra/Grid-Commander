## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Every Capability Is Reachable
Each behaviour delivered by a capability of this product SHALL be reachable by a
user through the interface, in a build of the application that serves. A
capability that exists only as an internal interface, or only in source that
cannot be built, MUST NOT be described as delivered.

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

#### Scenario: Reachable in a served build
- **WHEN** a capability is described as reachable
- **THEN** its route is present in a build of the application
- **AND** requesting that route from the served application returns a page
