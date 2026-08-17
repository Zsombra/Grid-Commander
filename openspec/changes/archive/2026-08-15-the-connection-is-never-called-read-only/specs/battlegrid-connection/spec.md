## MODIFIED Requirements

### Requirement: Configuration Authority Is Described Honestly
Where Grid-Commander describes the access a user is granting or has granted,
it SHALL state that the access permits creating and modifying agents and
strategies. It MUST NOT describe that access as read-only or view-only — on
the consent flow or on any other surface. A surface that names authority the
connection lacks SHALL not imply the connection is thereby harmless: where
the missing wager scope is stated, the held write authority is stated beside
it.

#### Scenario: Presenting what is being granted
- **WHEN** the user is shown what they are about to authorize
- **THEN** the description says the access can create and change agents and
  strategies
- **AND** it distinguishes that from the ability to commit funds, which is not
  being requested

#### Scenario: A surface describes the standing connection
- **WHEN** any surface describes what the connected authority can or cannot do
- **THEN** the access is not called read-only or view-only
- **AND** where the absent wager scope is named, the description also names
  the write authority the connection does hold
