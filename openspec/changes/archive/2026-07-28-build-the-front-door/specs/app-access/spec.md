## ADDED Requirements

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

A capability that exists only as an internal interface, only in source that
cannot be built, only behind an affordance that leads nowhere, or only at an
address no link points to, MUST NOT be described as delivered.

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

#### Scenario: Moving between capabilities
- **WHEN** a user is anywhere inside the product
- **THEN** every other top-level capability is reachable from where they are
- **AND** they do not have to know an address to get there

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

#### Scenario: A destination nothing points at
- **WHEN** the application serves a route that no link the interface renders
  can reach
- **THEN** that route is not reachable, however well it renders
- **AND** this fails a check that gates a change

#### Scenario: Checking the direction that was missed
- **WHEN** reachability is checked by confirming every rendered link resolves
- **THEN** that check is not sufficient on its own
- **AND** the check that decides the requirement also starts at the root and
  walks outward
