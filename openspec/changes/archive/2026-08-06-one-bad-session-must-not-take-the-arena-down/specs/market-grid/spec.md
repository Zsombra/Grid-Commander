# market-grid — delta

## MODIFIED Requirements

### Requirement: The Arena Is Watchable Without Being Played
Grid-Commander SHALL show the Market Grid sessions the platform lists —
each with its name, status, lock and settle times, and coin pool — and,
per session, whether this account has submitted an entry. What cannot be
read SHALL render as unknown, never as an empty arena.

Reading a session's detail and reading whether this account entered it are
**separate reads per session**, and either can fail on its own. A failure of
one SHALL NOT remove the session from the surface, and SHALL NOT remove any
other session. The session list is the exception: with no list there is nothing
to show, so a list that cannot be read leaves the whole arena unreadable.

Whether this account entered a session SHALL be able to be **unknown**. A
submission check that could not be read SHALL NOT render as not having entered
— that is a definite claim produced by a read that returned nothing, and it is
the same error as reporting an unreadable roster as an empty one.

#### Scenario: Watching the arena
- **WHEN** a user opens the arena surface
- **THEN** the listed sessions render with name, status, lock/settle times
  and coin pool
- **AND** each shows whether this account has entered

#### Scenario: Results before settle
- **WHEN** a session has not settled
- **THEN** the surface says results arrive after settlement, as a state —
  the platform's refusal is not shown as an error

#### Scenario: The played state is read only from the submission check
- **WHEN** whether this account has played is rendered
- **THEN** the answer comes from the submission check alone — the
  player-grid read answers a server error for "not played" (established
  live 2026-08-01) and is never interpreted as an answer

#### Scenario: An arena that cannot be read
- **WHEN** the session list cannot be read
- **THEN** the surface says so with the reason, and claims nothing about
  what is or is not running

#### Scenario: One session's detail cannot be read
- **GIVEN** several listed sessions, one whose detail read fails
- **WHEN** the arena renders
- **THEN** that session is still shown, with the name and coin pool the list
  carried
- **AND** it says its schedule could not be read
- **AND** every other session renders in full

#### Scenario: A submission check that did not answer
- **GIVEN** a session whose submission check could not be read
- **WHEN** the session renders
- **THEN** the surface says whether this account entered is unknown
- **AND** does NOT state that this account has not entered

#### Scenario: The platform rate-limits the fan-out
- **GIVEN** the platform refuses the per-session reads for being asked too
  often
- **WHEN** the arena renders
- **THEN** the sessions are still listed with what the list carried
- **AND** no read failure propagates as an error to the surface
