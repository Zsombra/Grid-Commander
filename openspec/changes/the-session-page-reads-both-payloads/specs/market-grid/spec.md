# market-grid — delta

## MODIFIED Requirements

### Requirement: A Session Can Be Opened On Its Own
Grid-Commander SHALL let any listed session be opened on a surface of its own,
which names the session and shows its status and schedule, whether this
account entered it, and the state of its results.

The page SHALL read the session from **both** Market Grid reads — the
per-session detail, and the session's own row off the list the arena already
calls — because the two payloads overlap and neither contains the other
(measured live 2026-08-06). From the list row the page SHALL show the facts
only the list carries: how many more players the session needs and the minimum
it runs on, who hosts it (or that the platform names no host), what entering
costs and what the pool holds, and how the money is split — the platform's
in-the-money percent and paid-place count, its per-entry fee breakdown, and
its payout curve with the curve's own parameter. Money figures SHALL be shown
as the platform states them and SHALL NOT be derived, summed, or
reconstructed. A fee the list did not carry SHALL render as not stated, never
as zero or free.

Those are **separate reads and any of them can fail alone**, on the same terms
the arena list already follows: a failure of one SHALL NOT blank the others. A
session that could not be read SHALL NOT be reported as a session that does
not exist — Grid-Commander cannot tell an id the platform does not know from a
platform that did not answer, and only one of those is the reader's mistake.

A session absent from a list that answered SHALL be its own named state —
distinct from an unreadable list, not an error, and never silently nothing:
the page SHALL say the arena's list no longer carries the session, and the
facts only the list holds are therefore unavailable, while everything the
detail read answered still renders.

Shapes the platform has never sent populated SHALL NOT be interpreted. The
crowd percentages have only ever been null and the pick rows have never had an
entry, so the page MAY state the observed roster fact — how many coins are on
offer and that nobody has picked — and SHALL NOT render a crowd panel or any
figure from inside a pick row. If the platform reports that picks exist, the
page SHALL say so and say they are not read, the same treatment the settled
results payload receives.

Results SHALL NOT be read once per session from the arena list. A list of fifty
sessions is where the platform's rate limit is met, and the question is asked
about the session a user opened.

#### Scenario: Opening a session
- **WHEN** a user opens a session from the arena
- **THEN** the surface names it and shows its status, its schedule and whether
  this account entered it
- **AND** shows, from the session's list row, the players it still needs
  against its minimum, its host or that none is named, its entry fee and prize
  pool, and the platform's own money split

#### Scenario: A session that did not answer
- **GIVEN** a session whose detail read fails
- **WHEN** it is opened
- **THEN** the surface says the session could not be read, with the reason
- **AND** does NOT say that no such session exists
- **AND** the reads that did answer are still shown, including everything the
  list row carries

#### Scenario: A list that did not answer
- **GIVEN** a session whose detail read answered while the session list could
  not be read
- **WHEN** it is opened
- **THEN** the schedule from the detail still renders
- **AND** the surface says the facts the list carries could not be read, with
  the reason
- **AND** does NOT render the missing money figures as zero or absent-silently

#### Scenario: A session the list no longer carries
- **GIVEN** a session whose detail read answers while the list, which answered,
  has no row for it
- **WHEN** it is opened
- **THEN** the surface says the arena's list does not carry this session, as a
  state rather than an error
- **AND** everything the detail read answered still renders

#### Scenario: The crowd is not guessed
- **GIVEN** a session whose list row reports a populated coin roster and no
  picks
- **WHEN** it is opened
- **THEN** the surface states the roster fact — coins on offer, nobody has
  picked
- **AND** renders no crowd percentages and nothing from inside a pick row
