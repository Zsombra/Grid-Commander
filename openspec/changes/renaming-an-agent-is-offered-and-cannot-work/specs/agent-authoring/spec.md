# agent-authoring — delta

## ADDED Requirements

### Requirement: The Outcome Of A Write Reaches The Person Who Asked For It
Where a user performs an operation that can be refused, Grid-Commander SHALL
read the outcome and show it. A surface MUST NOT discard the result of a write
and present the page as though nothing had been attempted.

A refusal the operator cannot see is worse than a failure they can. The page
reloads, the value is unchanged, and the only available reading is that the
product ignored them. Renaming an agent did exactly this: the action awaited the
result, discarded it, and redirected, so a refusal — including one the product
itself raised — was indistinguishable from success.

Where the operation was refused, the reason given SHALL be the one the operation
returned, rather than a generic failure.

#### Scenario: A write that succeeds
- **WHEN** a user performs a write that succeeds
- **THEN** they are shown its effect

#### Scenario: A write that is refused
- **WHEN** a write is refused
- **THEN** the user is told, on the surface they acted from
- **AND** the reason given is the one the operation returned

#### Scenario: A result the surface never reads
- **WHEN** a surface performs a write and does not read its outcome
- **THEN** this fails a check that gates a change, rather than being found by an
  operator whose action silently did nothing

## MODIFIED Requirements

### Requirement: Agents The Platform Owns Are Not Presented As Editable
Where an agent cannot currently be changed, Grid-Commander SHALL show it without
offering any action that would attempt to change it, and SHALL say why.

Two things make an agent unchangeable, and they are not the same. BattleGrid may
treat an agent as immutable, which is permanent and belongs to the platform. Or
the agent may be **archived**, which the operator did and can undo. Offering a
rename box on either is an affordance with nothing behind it; offering one on an
archived agent is worse, because the operator is one action away from being able
to use it and is not told so.

Where the reason is archival, Grid-Commander SHALL name reactivation as what
makes changes possible again.

#### Scenario: A platform-owned agent in the roster
- **WHEN** an immutable agent appears in a user's roster
- **THEN** it is shown and readable
- **AND** no edit, rebind or archive action is offered for it

#### Scenario: An archived agent
- **WHEN** an archived agent is shown
- **THEN** it is readable, and its history is not hidden
- **AND** no control that would change it is offered
- **AND** the user is told it is retired and that reactivating it makes changes
  possible again

#### Scenario: Attempting to change one anyway
- **WHEN** a change is attempted against an agent that cannot be changed
- **THEN** it is refused before anything is sent to the platform
- **AND** the user is told which of the two reasons applies
