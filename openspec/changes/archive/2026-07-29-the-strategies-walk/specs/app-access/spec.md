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
