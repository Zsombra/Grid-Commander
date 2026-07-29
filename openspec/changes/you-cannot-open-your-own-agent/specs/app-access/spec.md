# app-access — delta

## MODIFIED Requirements

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

**A page about one of several things SHALL name which one.** Where a route is
scoped to an entity the user owns more than one of, the page states which entity
it is showing and offers a way back to it. A heading that says "this agent" on
an account with eleven agents identifies nothing, and a page that reports
something is wrong without naming the subject or offering a way to act on it
leaves the user further from a fix than when they arrived.

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

#### Scenario: Opening an agent from the list
- **WHEN** a user is looking at their agents
- **THEN** each agent's own page is reachable directly
- **AND** reaching it does not require opening a form that would change it

#### Scenario: A page scoped to one agent
- **WHEN** a user opens a page about a single agent
- **THEN** the page names that agent
- **AND** offers a way back to it

#### Scenario: Authoring strategies
- **WHEN** a user wants to list, edit, fork, archive or restore a strategy, or
  apply a compiled plan
- **THEN** each is reachable
- **AND** each can be carried out, not merely opened

#### Scenario: Moving between capabilities
- **WHEN** a user is anywhere inside the product
- **THEN** every other top-level capability is reachable from where they are
- **AND** they do not have to know an address to get there
