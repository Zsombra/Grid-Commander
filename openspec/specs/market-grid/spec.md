# Market Grid Specification

## Purpose

Watching BattleGrid's Market Grid arena: which sessions exist, their
schedule and coin pool, whether this account has entered, and results once
a session settles. Reads only — playing carries a real stake and is not
this capability.

## Requirements

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

### Requirement: The Game States Its Price And Its Rules
Grid-Commander SHALL show BattleGrid's own game presets — the grid and how
many coins a game calls, the window it is scored over, the entry fee, what a
right call multiplies, what the captain pick is worth and costs, what any
other wrong call costs, whether a jackpot rides on the game, and how many
players it needs — and SHALL show, per listed session, what entering that
session would cost and what its pool holds.

A price that could not be read SHALL render as unknown and SHALL NOT render as
zero or free. A rulebook that could not be read SHALL say so and SHALL NOT
remove the sessions from the surface: what a session costs and whether one is
running are separate facts from separate reads.

The rules SHALL be shown as the platform lists them. A preset belonging to
another game SHALL be shown rather than filtered away, and a flag the platform
did not set SHALL NOT be rendered as a denial — "no jackpot" is a claim, and
an absent field is not one.

#### Scenario: Reading the rules before playing
- **WHEN** a user opens the arena
- **THEN** each game preset renders with its grid, how many coins it calls,
  its window, its entry fee and its scoring multipliers

#### Scenario: The price is stated on the session too
- **GIVEN** the arena lists sessions
- **WHEN** it renders
- **THEN** each session states what entering it costs and what its pool holds
- **AND** a session whose per-session reads failed still states them, because
  they come off the list itself

#### Scenario: A price that could not be read
- **GIVEN** a session whose entry fee the list did not carry
- **WHEN** it renders
- **THEN** the surface says the fee is not stated
- **AND** does NOT render it as zero

#### Scenario: Rules that could not be read
- **WHEN** the game presets cannot be read
- **THEN** the surface says so with the reason
- **AND** the sessions still list

#### Scenario: A flag the platform did not set
- **GIVEN** a preset that says nothing about a jackpot
- **WHEN** the rules render
- **THEN** the surface claims neither that a jackpot rides on the game nor
  that none does

### Requirement: A Session Can Be Opened On Its Own
Grid-Commander SHALL let any listed session be opened on a surface of its own,
which names the session and shows its status and schedule, whether this
account entered it, and the state of its results.

Those are **separate reads and either can fail alone**, on the same terms the
arena list already follows: a failure of one SHALL NOT blank the others. A
session that could not be read SHALL NOT be reported as a session that does not
exist — Grid-Commander cannot tell an id the platform does not know from a
platform that did not answer, and only one of those is the reader's mistake.

Results SHALL NOT be read once per session from the arena list. A list of fifty
sessions is where the platform's rate limit is met, and the question is asked
about the session a user opened.

#### Scenario: Opening a session
- **WHEN** a user opens a session from the arena
- **THEN** the surface names it and shows its status, its schedule and whether
  this account entered it

#### Scenario: A session that did not answer
- **GIVEN** a session whose detail read fails
- **WHEN** it is opened
- **THEN** the surface says the session could not be read, with the reason
- **AND** does NOT say that no such session exists
- **AND** the reads that did answer are still shown

### Requirement: Results Are A State, And An Unseen Payload Is Not Reported
Grid-Commander SHALL treat a session's results as a state rather than a
payload. Before settlement the platform refuses the read with "results are
published after the session settles"; that refusal SHALL render as the state
it is and never as an error.

Once a session has settled, the surface SHALL say that BattleGrid published
results and SHALL NOT report any figure from them. The settled payload has
never been observed on this account, and a shape that is only declared is not
a shape that is known.

A results read that failed SHALL render as unreadable with its reason, and
SHALL NOT be reported as "not settled yet" — that would send a player back
later for results that may already be published.

#### Scenario: A session read before it settles
- **GIVEN** a session that has not settled
- **WHEN** its results are read
- **THEN** the surface says results are published after settlement, as a state
- **AND** the platform's refusal is not shown as an error

#### Scenario: A settled session reports nothing it has not seen
- **GIVEN** a session BattleGrid has settled
- **WHEN** it is opened
- **THEN** the surface says results have been published
- **AND** says Grid-Commander does not read them yet
- **AND** reports no figure taken from inside that payload

#### Scenario: A results read that failed
- **GIVEN** a session whose results read did not answer
- **WHEN** it is opened
- **THEN** the surface says the results could not be read, with the reason
- **AND** does NOT say the session has not settled
