# App Access — Delta

## ADDED Requirements

### Requirement: A Health Check That Checks The Database

The product SHALL answer an unauthenticated health probe that resolves no
session and performs one trivial database round trip: 200 with
`{"status":"ok"}` when the database answers, 503 with
`{"status":"unavailable"}` when it does not. The response MUST NOT carry
version, schema, or configuration detail.

#### Scenario: Healthy
- **WHEN** `/api/health` is requested and the database answers
- **THEN** the response is 200 `{"status":"ok"}` with nothing else in it

#### Scenario: The database has gone away
- **GIVEN** the database is unreachable
- **WHEN** `/api/health` is requested
- **THEN** the response is 503 `{"status":"unavailable"}`
- **AND** no session is resolved on the way

#### Scenario: No cookie required
- **WHEN** `/api/health` is requested with no cookies at all
- **THEN** the answer is the same as with any cookie
