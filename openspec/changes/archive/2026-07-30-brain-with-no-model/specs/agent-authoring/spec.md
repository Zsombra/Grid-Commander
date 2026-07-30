## MODIFIED Requirements

### Requirement: Agent Fields Are Offered Only From Values The Platform Confirms

Where a field has a set of valid values or a permitted range, Grid-Commander
SHALL obtain it from BattleGrid at the time of use. It MUST NOT offer a value,
or accept one, on the basis of a list fixed at build time.

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

#### Scenario: A brain the platform did not describe
- **WHEN** BattleGrid returns an agent carrying neither a brain preset nor a
  model identifier
- **THEN** the brain is mapped as undescribed, not as a custom brain with an
  empty model
- **AND** it is shown to the user as undescribed rather than blank or
  defaulted to any particular model
