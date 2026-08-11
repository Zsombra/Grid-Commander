## ADDED Requirements

### Requirement: The Fleet's Model Spend Renders Where The Fleet Is
The agents roster SHALL show the platform's own total of the fleet's model
spend over the last 24 hours, labelled as the platform's figure, beside the
number of active agents it covers.

The total is the platform's and only the platform's: it is published by one
tool and totalled by BattleGrid, and Grid-Commander SHALL NOT sum per-agent
figures into a rival total or render a per-agent spend on this surface — the
per-agent figure has its own home on the agent's limits page, and two
renderings of one fact are two things that can disagree.

The read fails independently: an unreadable spend read costs the line alone,
and an unreadable roster does not silence the spend line.

#### Scenario: The fleet line renders
- **WHEN** the roster page renders and the hub read answers
- **THEN** the fleet's 24-hour model spend renders as the platform's own total
- **AND** the number of active agents it covers renders beside it

#### Scenario: The platform reports no total
- **WHEN** the hub answers without a readable total
- **THEN** the line says the platform reported no figure
- **AND** renders no substitute arithmetic

#### Scenario: The spend read fails and the roster does not
- **WHEN** the hub read cannot be served
- **THEN** the line says why, using the shared explanation
- **AND** the roster and its create affordance still render

#### Scenario: The roster read fails and the spend line does not
- **WHEN** the roster read cannot be served and the hub read answers
- **THEN** the fleet spend line still renders
