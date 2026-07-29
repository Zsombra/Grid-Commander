## ADDED Requirements

### Requirement: An Empty Catalog Says So
Where the catalog contains nothing, the product SHALL say so. It MUST NOT
present an empty catalog as though it could not be read, MUST NOT present a
failed read as though the catalog were empty, and MUST NOT offer an action
against strategies that were not returned.

The two states are indistinguishable as blank space, and only one of them is
true of the account. Telling someone their catalog is empty when the platform
simply did not answer is how they conclude their work is gone — the same reason
`agent-authoring` distinguishes them for the roster.

#### Scenario: The catalog comes back with nothing in it
- **WHEN** the platform returns no strategies
- **THEN** the user is told that nothing is listed
- **AND** this is not presented as a failure to read

#### Scenario: Told apart from a failure
- **WHEN** the catalog cannot be read from BattleGrid
- **THEN** the user is told it could not be read, not that it is empty
- **AND** nothing on the page suggests the strategies no longer exist

#### Scenario: No action is offered against what was not returned
- **WHEN** nothing is listed
- **THEN** the product does not offer to fork, edit, or archive anything
- **AND** it does not describe a next step that depends on a strategy the
  platform did not return

#### Scenario: Which case it is, is not decided by the surface
- **WHEN** the product determines that a catalog is empty
- **THEN** that is carried from where the platform was read
- **AND** a surface cannot arrive at it by counting what it was handed
