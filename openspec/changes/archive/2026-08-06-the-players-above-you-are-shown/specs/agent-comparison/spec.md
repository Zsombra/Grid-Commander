# agent-comparison

## MODIFIED Requirements

### Requirement: Where This Account Stands Is Shown First

The product SHALL show this account's own standing — its rank and
percentile among all players, and the rank of each of its own agents
within the field — before the rest of the field, and SHALL say plainly
when the platform places none of its agents in the field.

The product SHALL also show the ranked players the platform returns
alongside that standing, and SHALL mark which of those rows is this
account's own — identified by the platform's own `userId` and by nothing
else. Where the platform returns no ranked players, the product SHALL say
that nobody is ranked, and SHALL NOT let that read as a failed read.

#### Scenario: The account is ranked
- **GIVEN** the platform reports a rank and percentile for this account
- **WHEN** the field renders
- **THEN** that rank and percentile are shown before the field list
- **AND** each of this account's ranked agents is named with its rank

#### Scenario: The account has no ranked agents
- **GIVEN** the platform returns no agents for this account
- **WHEN** the field renders
- **THEN** the page says none of this account's agents are ranked
- **AND** the rest of the field is still shown

#### Scenario: The ranked players are shown
- **GIVEN** the platform returns ranked players on the leaderboard
- **WHEN** the field renders
- **THEN** each player's rank, name and value is shown

#### Scenario: This account appears among the ranked players
- **GIVEN** the leaderboard contains a row whose `userId` is this account's
- **WHEN** the field renders
- **THEN** that row is marked as this account's
- **AND** no other row is marked

#### Scenario: This account is ranked but outside the returned rows
- **GIVEN** the platform reports a standing for this account
- **AND** no returned row carries this account's `userId`
- **WHEN** the field renders
- **THEN** the standing is still shown
- **AND** no row is marked

#### Scenario: The platform identifies nobody
- **GIVEN** the returned rows carry no `userId`
- **WHEN** the field renders
- **THEN** every row is still shown
- **AND** no row is marked

#### Scenario: Nobody is ranked
- **GIVEN** the platform returns no ranked players
- **WHEN** the field renders
- **THEN** the page says the platform ranks no players
- **AND** that reads as a statement about the platform, not as a failed read

#### Scenario: The leaderboard cannot be read
- **GIVEN** the leaderboard read does not answer
- **WHEN** the field renders
- **THEN** the page says the standing could not be read, and why
- **AND** no ranked players are shown, and none are claimed to be absent
