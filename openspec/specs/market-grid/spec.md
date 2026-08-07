# Market Grid Specification

## Purpose

Watching BattleGrid's Market Grid arena: which sessions exist, their
schedule and coin pool, whether this account has entered, and results once
a session settles. Reads only — playing carries a real stake and is not
this capability.

## Requirements

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
