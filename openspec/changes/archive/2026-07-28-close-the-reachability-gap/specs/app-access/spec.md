## ADDED Requirements

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

## MODIFIED Requirements

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
