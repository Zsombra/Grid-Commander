## ADDED Requirements

### Requirement: The User Is Told Where Their Question Goes
Before asking, the user SHALL be told whether answering sends what the assistant
reads outside this product, and to whom. Where it does, the recipient MUST be
named. Where it does not, the product MUST NOT imply that it does.

Everything else this capability guarantees concerns what the assistant may
*read*. This is the first about what it *emits*, and it is the only outbound
path in the product the user did not authorise by name — a BattleGrid
connection is granted through a screen that names BattleGrid.

#### Scenario: A deployment that sends questions to a third party
- **WHEN** a user opens the page where questions are asked
- **THEN** they are told that answering sends what the assistant reads outside
  this product
- **AND** the recipient is named

#### Scenario: A deployment that sends nothing
- **WHEN** no model is configured, so no question can leave
- **THEN** the user is not told that their data goes anywhere
- **AND** they are still told that the assistant cannot answer

#### Scenario: Where the disclosure appears
- **WHEN** the disclosure is shown
- **THEN** it is presented with the means of asking, not separately from it
- **AND** it does not depend on the user having asked something first

#### Scenario: A deployment changing what answers
- **WHEN** the deployment changes which model answers, or removes it
- **THEN** what the user is told changes with it
- **AND** it is not restated anywhere that could disagree with it
