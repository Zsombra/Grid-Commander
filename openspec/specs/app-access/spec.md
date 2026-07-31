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
- **THEN** the request is refused, and no user is created from it
- **AND** the page still renders — refusing is a read, and a read does not
  mutate cookies; the stale cookie is left to its TTL and is replaced or
  cleared only by the flows that may write cookies (completing a
  connection, disconnecting)

#### Scenario: A session that was not issued by Grid-Commander
- **WHEN** a session value arrives that this product did not issue
- **THEN** it is refused
- **AND** no user is identified from it

#### Scenario: A signed-in request can reach the database
- **WHEN** a request carrying a valid signed session reaches a
  session-resolving route in a served deployment
- **THEN** the route answers without a server error
- **AND** the serving check proves the application's own pool committed a
  transaction while answering — a database that boots but cannot be queried
  is a failed check, not a quiet gap

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

Reachability SHALL be measured by **walking from the application's root**,
following the links the interface renders. A route is reachable when that walk
arrives at it. Enumerating the routes the application defines, confirming each
one renders, and confirming each rendered link resolves are each necessary and
none of them — nor all of them together — is sufficient: they establish that
every path *out* of a page leads somewhere, and say nothing about whether
anything leads *in*.

**The walk MUST NOT pass through an operation that changes anything.** A route
reachable only from inside an edit, rebind, archive or other mutation flow is
not reachable: getting to it means opening a form the user did not come to
submit. A destructive page is a destination, never a corridor.

**A page about one of several things SHALL name which one, and offer a way back
to it.** Where a route is scoped to an entity the user owns more than one of,
the page states which entity it is showing and how to return to it. A heading
that says "this agent" on an account with eleven agents identifies nothing, and
a page that reports something is wrong without naming the subject or offering a
way to act on it leaves the user further from a fix than when they arrived.

**Getting back is a third property, and the first two checks do not imply it.**
One asks whether a route can be reached at all; another whether a list offers
the thing it lists. Neither notices a page with no way out. This was written
down for agents, fixed for agents, and left unenforced — `/strategies/[id]/edit`
rendered four links, all of them the global navigation, and stayed green.

**Where an operation offers a way to decline, that way SHALL NOT lead to a
list.** Returning to the form or to the entity are both what the operation was
about; the roster is the one destination that discards the operation *and* the
user's place. This is a fourth property, independent of the third: a page may
carry a correct way back in one branch while the control beside its submit button
goes elsewhere.

**A destination SHALL be judged by where it resolves, not by how it is written.**
A relative `..` from `/strategies/<id>/edit` resolves to `/strategies` — not to
the page above it. The control reading *"Go back and change it"* was written that
way and landed on the roster, discarding the composed change, and every check
that read hrefs as literal text was blind to it.

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

#### Scenario: Opening an entity from its list
- **WHEN** a user is looking at a list of things they own
- **THEN** each thing's own page is reachable directly
- **AND** reaching it does not require opening a form that would change it

#### Scenario: A page scoped to one entity
- **WHEN** a user opens a page about a single agent or strategy
- **THEN** the page names it
- **AND** offers a way back to it

#### Scenario: Declining an operation
- **WHEN** a user opens a confirmation and decides against it
- **THEN** they are returned to what the operation was about
- **AND** not to a list of everything they own

#### Scenario: A destination written relatively
- **WHEN** a control's destination is a relative address
- **THEN** it is judged by where it resolves from the page rendering it

#### Scenario: Authoring strategies
- **WHEN** a user wants to list, edit, fork, archive or restore a strategy, or
  apply a compiled plan
- **THEN** each is reachable
- **AND** each can be carried out, not merely opened

#### Scenario: Moving between capabilities
- **WHEN** a user is anywhere inside the product
- **THEN** every other top-level capability is reachable from where they are
- **AND** they do not have to know an address to get there

### Requirement: The Composed Application Is Assembled Once, From Configuration
Grid-Commander SHALL construct the adapters that reach BattleGrid and the
database in one place, from configuration read at startup. A request MUST NOT
construct its own route to BattleGrid.

**The application SHALL reach BattleGrid and nothing else.** This product exists
to control BattleGrid agents over MCP. A second outbound destination is a second
place a user's data can go, a second credential to hold, and a second reason a
deployment can fail — and it must therefore be a decision someone makes on
purpose, not something that accumulates.

The one that had accumulated was a model API behind an assistant, which could
never be exercised: no credential for it existed in any environment this product
was built in, so the surface shipped saying it was unavailable. It was removed
rather than carried.

This does not constrain what a *BattleGrid agent* runs on. An agent's brain is
chosen from BattleGrid's own catalogue of approved models, and those model
identifiers name someone else's inference — reached by the platform, never by
this product.

#### Scenario: A request reaching BattleGrid
- **WHEN** any request causes a BattleGrid call
- **THEN** it goes through the single composed adapter
- **AND** the guard sequence applies to it

#### Scenario: An outbound destination that is not BattleGrid
- **WHEN** the application is inspected for the hosts it can reach
- **THEN** BattleGrid's MCP endpoint is the only one

#### Scenario: Configuration is missing
- **WHEN** required configuration is absent
- **THEN** the application does not start
- **AND** it does not run with a value it invented

#### Scenario: Credentials a deployment must hold
- **WHEN** a deployment is configured from the documented variables
- **THEN** the only third-party credential it needs is for BattleGrid

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
Grid-Commander SHALL render no link to a route it does not serve, and SHALL
serve no route the interface never offers.

Both directions, because only one was ever checked. Five rendered links returned
404 through three production gates; the check written to catch that compared
offered paths against servable routes and stopped there. A route built and
linked from nowhere passed every gate afterwards — and two did, in the same
afternoon they were written.

A page nobody can navigate to is capability the operator does not have. It is
the same failure as a link to nothing, seen from the other side.

#### Scenario: A link to a route that is not served
- **WHEN** the interface renders a link to a path no route serves
- **THEN** this fails a check that gates a change

#### Scenario: A route nothing links to
- **WHEN** the application serves a route the interface never offers
- **THEN** this fails a check that gates a change, naming the route

#### Scenario: Reading an agent whatever its state
- **WHEN** an agent cannot be edited, rebound or archived
- **THEN** what it decided and what would stop it are still offered

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

### Requirement: The Product Answers At Its Own Address
Requesting the root of the application SHALL return something a user can act
from. It MUST NOT return a not-found.

This is the only URL a user is ever given. Everything else in this capability
describes what happens once they are inside.

#### Scenario: Arriving with no session
- **WHEN** someone requests the root of the application and is not connected
- **THEN** they reach the place where connecting begins

#### Scenario: Arriving connected
- **WHEN** a connected user requests the root of the application
- **THEN** they reach the product rather than being asked to connect again

#### Scenario: The address a user is given
- **WHEN** the application is deployed and someone is told where it is
- **THEN** what they were told resolves without them being given a path

### Requirement: A Deployment Serves Only Against A Schema It Recognises
Before serving any request, a deployment SHALL confirm that the database it is
configured against has applied every migration this version of the product
carries. Where it has not, the deployment MUST refuse to serve and MUST say what
is missing.

The application already refuses to start without the configuration it was given.
This extends that to the database it was pointed at, and for the same reason: a
product that starts against a state it does not understand fails later, somewhere
else, in a way that reads as a defect rather than a missing step.

#### Scenario: The database is up to date
- **WHEN** a deployment starts against a database that has applied every
  migration the product carries
- **THEN** it serves

#### Scenario: A migration has not been applied
- **WHEN** a deployment starts against a database missing one or more of them
- **THEN** it refuses to serve
- **AND** it reports which migrations are missing
- **AND** it exits in a way the platform reports as a failed start

#### Scenario: The database has never been migrated
- **WHEN** a deployment starts against a database with no schema at all
- **THEN** it refuses to serve rather than reporting an error on first use

#### Scenario: A database ahead of the product
- **WHEN** a deployment starts against a database carrying migrations this
  version does not know about
- **THEN** it serves
- **AND** this is reported, because it means an older version is running against
  a newer schema

#### Scenario: Applying the migrations
- **WHEN** an operator needs to bring a database up to date
- **THEN** the deployable artifact can do it as its own operation
- **AND** that operation is separate from serving, so it can run once rather
  than once per replica

### Requirement: The Deployable Artifact Carries No Secret
An artifact built from this repository SHALL contain no credential, and no
configuration specific to one deployment.

#### Scenario: Building the artifact
- **WHEN** the deployable artifact is built
- **THEN** it contains no value from a `.env` file
- **AND** it contains no token, key, or client identifier

#### Scenario: Running it
- **WHEN** the artifact runs
- **THEN** every deployment-specific value is supplied to it at run time
- **AND** absent required configuration, it refuses to start, as it does anywhere
  else
