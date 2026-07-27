## Purpose

How Grid Commander establishes an authenticated session with BattleGrid's MCP
server and invokes tools over it — including confirming which account it is
connected to, and staying correct when the server's tool surface changes
between deployments.

## ADDED Requirements

### Requirement: Authenticated Connection From The Environment
The client SHALL establish an authenticated MCP session using a Bearer API key
read from the environment, and SHALL refuse to operate when the key is absent.

#### Scenario: Connects with a valid key
- **GIVEN** a valid API key in the environment
- **WHEN** a consumer starts the client
- **THEN** an authenticated session to the configured MCP endpoint is established
- **AND** the client reports the connected account identity

#### Scenario: Missing key
- **GIVEN** no API key in the environment
- **WHEN** a consumer starts the client
- **THEN** the client refuses to start
- **AND** the error names the missing environment variable and does not attempt a network call

#### Scenario: Rejected key
- **GIVEN** a key the server rejects
- **WHEN** a consumer starts the client
- **THEN** the client surfaces an authentication failure with the server's reason
- **AND** it does not present itself as connected

### Requirement: Connection Health And Identity
The client SHALL expose a health check that reports whether the session is
usable and which account it is authenticated as.

#### Scenario: Health check while connected
- **WHEN** a consumer requests a health check on a live session
- **THEN** the client reports reachable status and the authenticated account identity

#### Scenario: Health check confirms account before a consequential action
- **GIVEN** a consumer about to act on the account
- **WHEN** it checks health first
- **THEN** it can read the account identity from the result and confirm it is the intended account

### Requirement: Tool Invocation
The client SHALL invoke an available MCP tool by name with structured arguments
and return the tool's structured result to the caller.

#### Scenario: Invoke an available tool
- **GIVEN** a live session
- **WHEN** a consumer invokes an available tool with valid arguments
- **THEN** the client returns the tool's structured result

#### Scenario: Tool reports an error
- **GIVEN** a live session
- **WHEN** an invoked tool returns an error result
- **THEN** the client surfaces that error to the caller rather than discarding or masking it

### Requirement: Resilience To Tool-Surface Drift
Because the server's advertised tool set can change between deployments, the
client SHALL reject invocation of a tool it does not recognize rather than
passing an unknown call through silently.

#### Scenario: Unknown tool name
- **WHEN** a consumer invokes a tool name that is not in the client's known set
- **THEN** the client rejects the call with a clear error
- **AND** no request for that unknown tool is sent to the server

#### Scenario: Server advertises a new tool
- **GIVEN** the server now advertises a tool the client has not been regenerated to know
- **WHEN** the client lists what it can invoke
- **THEN** the unknown tool is reported as unavailable until the client is regenerated
- **AND** it is never treated as safe to call by default
