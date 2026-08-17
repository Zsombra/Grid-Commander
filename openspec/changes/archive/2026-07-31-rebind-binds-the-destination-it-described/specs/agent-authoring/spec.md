## MODIFIED Requirements

### Requirement: Rebinding States That It Replaces, Not Merges
Rebinding an agent to a different strategy SHALL be treated as destructive.
Before it is attempted, Grid-Commander MUST state that the agent's inherited
configuration will be replaced in full, and MUST NOT describe it as a change of
strategy alone. The destination named in the consequence SHALL be read from
the platform — its name and its revision — never taken from the caller, and
the confirmation SHALL be bound to the agent, the destination, and the
destination's revision as described.

#### Scenario: Rebinding is requested
- **WHEN** a user asks to rebind an agent to a different strategy
- **THEN** they are told that the agent's context, signal rules, prose and
  timeframe will be replaced by the new strategy's, not merged with them
- **AND** the agent being rebound and the strategy it will be bound to are both
  named, with the destination's name and revision read from the platform
- **AND** the rebind is not attempted until they confirm that specific operation

#### Scenario: Confirmation is withheld
- **WHEN** a user does not confirm a rebind
- **THEN** nothing about the agent changes
- **AND** no attempt is made against BattleGrid

#### Scenario: A confirmation is reused for a different rebind
- **WHEN** a confirmation issued for one agent, one target strategy, or one
  destination revision is presented for another
- **THEN** it is refused
- **AND** the user is asked to confirm the operation actually being performed

#### Scenario: The destination moved between reading and confirming
- **WHEN** the destination strategy's revision at perform time differs from
  the revision the consequence described
- **THEN** nothing is attempted against BattleGrid
- **AND** the user is told the destination changed while they were reading,
  and is offered a fresh proposal

#### Scenario: A destination that cannot be read
- **WHEN** the destination strategy cannot be read or does not exist
- **THEN** no proposal is made and no token minted
- **AND** the reason reaches the user on the surface they acted from
