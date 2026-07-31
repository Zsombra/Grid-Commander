## ADDED Requirements

### Requirement: Whether An Agent Is Acting Is Stated Where The Agent Is Read
Where the platform can say which markets an agent is deployed to scan,
Grid-Commander SHALL state it on the agent's own page: each deployment's
market and timeframe, and whether the agent is holding the position, on duty,
or in the rotation. An agent deployed nowhere SHALL be described as configured
but not acting, naming where deployment happens. Where the deployment state
cannot be read, the page MUST say so rather than render either certainty.

An agent's lifecycle status says "ACTIVE" while the platform's own radar
counts only deployed agents as active. Two agents on the operator's account
held that status with zero positions, absent from every slot — configured,
waiting, and nothing in this product would ever have said so.

#### Scenario: A deployed agent
- **WHEN** the platform lists the agent in a radar deployment
- **THEN** the agent's page shows the market and timeframe
- **AND** whether the agent is holding the position, on duty, or in the
  rotation awaiting its turn

#### Scenario: An agent deployed nowhere
- **WHEN** the platform lists the agent in no radar deployment
- **THEN** the agent's page says plainly that it is configured but not
  scanning any market
- **AND** names where deployment happens

#### Scenario: The radar cannot be read
- **WHEN** the deployment state cannot be read
- **THEN** the page says the deployment state is unknown, with the cause
- **AND** does not claim the agent is deployed, nor that it is not
