## MODIFIED Requirements

### Requirement: Read Scope Is Requested And Wager Scope Is Not
Grid-Commander SHALL request only the scope required to read and configure. It
MUST NOT request authority to commit funds. The authority an operation is
measured against SHALL be the authority recorded on the user's connection, never
an assumption about what was granted.

#### Scenario: Connecting
- **WHEN** a user authorizes Grid-Commander
- **THEN** the request covers reading and configuration only
- **AND** authority to commit funds is not requested

#### Scenario: A tool requiring wager authority is reached
- **WHEN** any operation would require authority the connection does not hold
- **THEN** the operation is refused before it is attempted
- **AND** the user is told which authority would be needed and that
  Grid-Commander does not currently request it

#### Scenario: The grant is narrower than what was asked for
- **WHEN** BattleGrid returns a grant carrying less authority than was requested
- **THEN** operations are measured against what was actually granted
- **AND** an operation the grant does not cover is refused before it is
  attempted, in the same way as one requiring wager authority
