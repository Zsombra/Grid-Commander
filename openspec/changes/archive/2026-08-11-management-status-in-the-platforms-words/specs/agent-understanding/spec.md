# Agent Understanding — Delta

## ADDED Requirements

### Requirement: A Position Says What Its Management Engine Reports

Where the platform reports a position's break-even or trailing status,
Grid-Commander SHALL show those statuses beside the position, in the
platform's own words, labelled as the platform's. A status value this
product has never seen SHALL render as itself, never mapped to a nearest
known state.

Where the platform reports neither, the surface SHALL show nothing for
them — not a default state, not "inactive". A platform that said nothing
and an engine that is idle are different facts.

#### Scenario: Statuses reported
- **GIVEN** an open position carrying break-even and trailing statuses
- **WHEN** the exposure surface renders it
- **THEN** both statuses appear verbatim, attributed to BattleGrid

#### Scenario: An unseen value
- **GIVEN** a status value this product has never observed
- **WHEN** the position renders
- **THEN** the value appears as itself

#### Scenario: Nothing reported
- **GIVEN** a position row without the status fields
- **WHEN** the position renders
- **THEN** no management-status line appears
- **AND** no state is claimed for the engine
