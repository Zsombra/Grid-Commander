## MODIFIED Requirements

### Requirement: A Request Acts For Exactly One Identified User
Grid-Commander SHALL determine, for every request that reaches a capability,
which user it acts for. It MUST NOT act for a user it cannot identify, and MUST
NOT allow a request to act for a user other than the one it identified.

#### Scenario: A request from a connected user
- **WHEN** a request arrives carrying a valid session
- **THEN** it acts for the user that session identifies
- **AND** the authority it uses is that user's connection

#### Scenario: A request with no session
- **WHEN** a request arrives with no session
- **THEN** it is refused
- **AND** the user is offered the path to connect

#### Scenario: A session naming a user who does not exist
- **WHEN** a session identifies a user with no record
- **THEN** the request is refused, and no user is created from it
- **AND** the page still renders — refusing is a read, and a read does not
  mutate cookies; the stale cookie is left to its TTL and is replaced or
  cleared only by the flows that may write cookies (completing a
  connection, disconnecting)

#### Scenario: A session that was not issued by Grid-Commander
- **WHEN** a session value arrives that this product did not issue
- **THEN** it is refused
- **AND** no user is identified from it

#### Scenario: A signed-in request can reach the database
- **WHEN** a request carrying a valid signed session reaches a
  session-resolving route in a served deployment
- **THEN** the route answers without a server error
- **AND** the serving check proves the application's own pool committed a
  transaction while answering — a database that boots but cannot be queried
  is a failed check, not a quiet gap
