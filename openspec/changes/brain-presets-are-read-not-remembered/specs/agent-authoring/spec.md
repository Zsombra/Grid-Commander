# agent-authoring — delta

## MODIFIED Requirements

### Requirement: Agent Fields Are Offered Only From Values The Platform Confirms

Where a field has a set of valid values or a permitted range, Grid-Commander
SHALL obtain it from BattleGrid at the time of use. It MUST NOT offer a value,
or accept one, on the basis of a list fixed at build time.

This applies to a set of values BattleGrid states only inside a tool's own
argument schema, with no catalogue call that lists it. Grid-Commander SHALL read
such a set from the declaration the session discovered, at the time of use. A
set of values BattleGrid declares is not a set this product may transcribe.

Where the platform declares a value Grid-Commander cannot describe — because the
declaration itself is ambiguous about it, naming it both as a choice for a field
and as something else in the same argument — Grid-Commander MUST NOT offer it,
and MUST NOT present any account of what it does. A choice nobody can explain is
not a choice a user can make.

Where the declaration does not answer, Grid-Commander SHALL say that BattleGrid
did not declare the values, and MUST NOT present the absence as an empty set of
choices or blame a rejected value on the user.

Where the platform returns an agent whose brain cannot be described — neither a
named preset nor a model identifier is present — Grid-Commander SHALL record
and present it as undescribed. It MUST NOT fabricate a brain variant from
absent data.

#### Scenario: Choosing a brain
- **WHEN** a user chooses the model an agent reasons with
- **THEN** the choices offered are the ones BattleGrid currently approves

#### Scenario: Setting trading configuration
- **WHEN** a user sets an agent's trading configuration
- **THEN** the presets and the permitted range of each value come from
  BattleGrid's live catalog
- **AND** a value outside the permitted range is rejected before submission,
  against that catalog rather than against a remembered bound

#### Scenario: The catalog cannot be read
- **WHEN** the approved models or the configuration catalog cannot be read
- **THEN** creation is not offered
- **AND** the user is told why, rather than shown a form whose submission will
  fail

#### Scenario: A brain preset BattleGrid has added
- **WHEN** BattleGrid declares a brain preset the product has never seen
- **THEN** it is offered when an agent is created, with no release of this
  product
- **AND** a create naming it is accepted rather than refused as unknown

#### Scenario: A brain preset BattleGrid no longer declares
- **WHEN** BattleGrid stops declaring a brain preset
- **THEN** it is no longer offered
- **AND** a create naming it is refused before it is sent

#### Scenario: A declared value the product cannot describe
- **WHEN** the declaration lists a value as a choice for a field while the same
  argument also uses that value to name something else
- **THEN** it is not offered as a choice
- **AND** no explanation of what it does is presented anywhere

#### Scenario: The declaration does not answer
- **WHEN** BattleGrid does not declare the values a field accepts
- **THEN** the user is told BattleGrid did not declare them
- **AND** the routes whose values *were* declared stay open
- **AND** a value submitted against the undeclared set is refused for that
  reason, rather than reported as not being one of them

#### Scenario: A brain the platform did not describe
- **WHEN** BattleGrid returns an agent carrying neither a brain preset nor a
  model identifier
- **THEN** the brain is mapped as undescribed, not as a custom brain with an
  empty model
- **AND** it is shown to the user as undescribed rather than blank or
  defaulted to any particular model
