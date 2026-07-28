## MODIFIED Requirements

### Requirement: The Connection Is The Identity
A user's BattleGrid connection SHALL be their Grid-Commander identity. The
system MUST NOT maintain a separate password for a Grid-Commander account. One
BattleGrid account MUST resolve to exactly one Grid-Commander identity, however
many times its authorization is completed.

#### Scenario: Returning user
- **WHEN** a user who has connected before returns
- **THEN** authorizing with BattleGrid signs them in to their existing workspace

#### Scenario: A connection is removed
- **WHEN** a user disconnects their BattleGrid account
- **THEN** they can no longer act on that account through Grid-Commander
- **AND** their recorded history remains readable to them

#### Scenario: One authorization completed twice at once
- **WHEN** two authorization callbacks for the same BattleGrid account complete
  at the same time, and that account has never connected before
- **THEN** one identity exists for it afterwards
- **AND** both callbacks resolve to that identity
- **AND** neither reports a storage-level failure to the user
