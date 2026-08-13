## ADDED Requirements

### Requirement: A Truncating Suite Refuses A Database Holding Live Authority
A test suite that truncates SHALL refuse to run against a database holding an
active connection to BattleGrid, and SHALL name disconnecting through the
product as the repair.

Deleting such a row destroys the only copy of the tokens — they are held
encrypted in the row itself — while the authorization at BattleGrid survives.
The result is a grant nobody can enumerate and the product cannot revoke, which
is precisely the outcome the disconnect path exists to prevent: relinquishing
locally is not relinquishing.

**The database being disposable is a different claim, and SHALL NOT satisfy
this one.** One is about where the data sits; this is about what the data is. A
row holding a live credential is not disposable because the database around it
is, and an acknowledgement that the database may be truncated SHALL NOT stand in
for an acknowledgement about the grant.

The check SHALL read the data rather than the connection string, and SHALL run
at the point of truncation rather than at configuration time, because the fact
it protects can arrive after the suite is pointed at the database.

#### Scenario: The database holds a live connection
- **GIVEN** a disposable database holding an active BattleGrid connection
- **WHEN** the truncating suite runs
- **THEN** it refuses before truncating anything
- **AND** the refusal says the authorization would survive and become
  unrevocable
- **AND** it names disconnecting through the product as the repair

#### Scenario: The database holds none
- **GIVEN** a disposable database with no active connection
- **WHEN** the truncating suite runs
- **THEN** it proceeds

#### Scenario: A revoked connection is not live authority
- **GIVEN** a database whose only connection is already revoked
- **WHEN** the truncating suite runs
- **THEN** it proceeds, because there is no authority left to strand

#### Scenario: The database predates the schema
- **GIVEN** a database with no connections table yet
- **WHEN** the truncating suite runs
- **THEN** it proceeds, because nothing can be held in a table that does not
  exist
- **AND** a failure to read the table for any other reason is not treated as
  permission
