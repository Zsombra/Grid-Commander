# market-grid — delta

## MODIFIED Requirements

### Requirement: The Arena Is Watchable Without Being Played
Grid-Commander SHALL show the Market Grid sessions the platform lists —
each with its name, status, lock and settle times, player count and coin
pool — and, per session, whether this account has submitted an entry. What
cannot be read SHALL render as unknown, never as an empty arena.

A session's status, schedule and player count SHALL be read from the session
list, which carries all four on every row. They SHALL NOT be re-read one call
per session: fifty sessions is fifty calls for data already in hand, and it is
where the platform's rate limit was met. A surface SHALL NOT report a field
unreadable while the payload that rendered the row carries it.

What a row says about results SHALL follow the session's status, and the
promise that results arrive after settlement SHALL be made only where the
status warrants it. A `PENDING` session is promised results after settlement.
A `CANCELLED` session SHALL be told plainly that it was cancelled, will not
settle, and will publish no results — cancellation is terminal, and "wait for
settlement" sends a reader back for something that will never exist; on
2026-08-06 that was 48 of the 50 sessions the list returned, the surface's
ordinary case rather than an edge. A `SETTLED` session repeats no promise,
because what was promised has arrived and its state is read on the opened
session. Any other status SHALL render as the platform's own word with no
claim about results attached: the declared vocabulary is wider than the
observed one and has moved under this product before, and bespoke prose for a
state never seen is a guess in the product's voice. A session whose status the
list did not state SHALL claim nothing about results either way.

Whether this account entered a session is the arena's **only per-session
read** — it is asked about an account, and no list of sessions can answer it.
It can fail on its own, and a failure SHALL NOT remove the session from the
surface, SHALL NOT remove any other session, and SHALL NOT blank what the list
already said. The session list is the exception: with no list there is nothing
to show, so a list that cannot be read leaves the whole arena unreadable.

Whether this account entered a session SHALL be able to be **unknown**. A
submission check that could not be read SHALL NOT render as not having entered
— that is a definite claim produced by a read that returned nothing, and it is
the same error as reporting an unreadable roster as an empty one.

The per-session detail read SHALL remain available for a session opened on its
own, where it is one call about one session and the platform declares more than
the list carries.

#### Scenario: Watching the arena
- **WHEN** a user opens the arena surface
- **THEN** the listed sessions render with name, status, lock/settle times,
  player count and coin pool, all from the session list itself
- **AND** each shows whether this account has entered

#### Scenario: The schedule is not re-read per session
- **GIVEN** the session list carried each session's status, lock and settle
  times and player count
- **WHEN** the arena renders
- **THEN** those fields are shown from the list
- **AND** no per-session detail read is made to obtain them

#### Scenario: A pending session is promised results
- **GIVEN** a listed session whose status is `PENDING`
- **WHEN** the arena renders
- **THEN** the session says results arrive after settlement

#### Scenario: A cancelled session is promised nothing
- **GIVEN** a listed session whose status is `CANCELLED`
- **WHEN** the arena renders
- **THEN** the session says it was cancelled, will not settle, and will
  publish no results
- **AND** does NOT say results arrive after settlement

#### Scenario: A settled session repeats no promise
- **GIVEN** a listed session whose status is `SETTLED`
- **WHEN** the arena renders
- **THEN** the session does not say results arrive after settlement

#### Scenario: A status with no prose of its own makes no claim
- **GIVEN** a listed session whose status is a value the surface has no
  bespoke sentence for
- **WHEN** the arena renders
- **THEN** the status renders as the platform's own word, stated as the
  platform's word and not interpreted
- **AND** the session neither promises results nor rules them out

#### Scenario: A session with no stated status claims nothing about results
- **GIVEN** a listed session whose status the list did not carry
- **WHEN** the arena renders
- **THEN** its status reads as not stated
- **AND** the session neither promises results nor denies them

#### Scenario: The played state is read only from the submission check
- **WHEN** whether this account has played is rendered
- **THEN** the answer comes from the submission check alone — the
  player-grid read answers a server error for "not played" (established
  live 2026-08-01) and is never interpreted as an answer

#### Scenario: An arena that cannot be read
- **WHEN** the session list cannot be read
- **THEN** the surface says so with the reason, and claims nothing about
  what is or is not running

#### Scenario: A submission check that did not answer
- **GIVEN** a session whose submission check could not be read
- **WHEN** the session renders
- **THEN** the surface says whether this account entered is unknown, with the
  reason
- **AND** does NOT state that this account has not entered
- **AND** the session still shows its status, schedule, player count, coin pool
  and price, because the list carried them

#### Scenario: The platform rate-limits the per-session check
- **GIVEN** the platform refuses the per-session submission checks for being
  asked too often
- **WHEN** the arena renders
- **THEN** every session is still listed with everything the list carried,
  including its status and schedule
- **AND** no read failure propagates as an error to the surface
