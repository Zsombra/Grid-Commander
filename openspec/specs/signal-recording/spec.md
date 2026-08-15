# Signal Recording Specification

## Purpose

The forward record of what BattleGrid's signals said.

The platform serves current signal readings only, so evidence about signal
behavior can accumulate solely from the day recording starts. This capability
captures what every signal said for a set of coins at a moment — with the
price at that moment and the platform generation that said it — persists it in
the product's own store, states its own coverage honestly, and makes the
history readable. It performs no write on any BattleGrid account: recording is
observation.

## Requirements

### Requirement: A Capture Records What Every Signal Said

A capture SHALL record, for each covered coin at a stated signal interval,
every signal the platform evaluated — including its triggered state, bias,
direction, score, allocation, primary and required flags, raw indicator
readings, and the platform's own written interpretation — together with the
coin's price at that moment, the aggregate score, the dominant bias, and
whether signals conflicted. Each capture SHALL be stamped with the time of
capture and the platform server version observed.

A capture SHALL call only read-annotated tools, SHALL NOT require wager
scope, and SHALL change nothing on any BattleGrid account. No confirmation is
requested because nothing is agreed to: recording is observation, not action.

#### Scenario: A capture on a connected account
- **GIVEN** a connected account and a coin the platform serves
- **WHEN** a capture runs for that coin at an interval
- **THEN** every evaluated signal is recorded with its verdict, scores,
  raw readings, and the platform's sentence
- **AND** the coin's price at capture time is recorded beside them
- **AND** the capture carries its capture time and the platform server
  version that answered

#### Scenario: The account is untouched
- **WHEN** any capture runs, however scheduled
- **THEN** no agent, strategy, deployment, or balance on the BattleGrid
  account changes
- **AND** no confirmation was requested or consumed

### Requirement: The Platform's Answer Is Kept Whole

The record SHALL preserve the platform's complete answer for each captured
coin, beyond the fields the product currently reads, so that a field unread
today remains recoverable from already-recorded history rather than being
lost with the moment.

#### Scenario: A field the product does not yet read
- **GIVEN** captures recorded while the product read only part of the answer
- **WHEN** a later version of the product learns to read a further field
- **THEN** that field is recoverable from the already-recorded captures
- **AND** no re-capture of the past is required

#### Scenario: The whole answer is retrievable
- **GIVEN** a recorded capture
- **WHEN** its stored platform answer is retrieved
- **THEN** it is the answer as the platform gave it, not a reconstruction
  from the fields the product read

### Requirement: A Failed Read Is A Recorded Gap, Not Silence

Where one coin's read fails during a capture, the remaining coins SHALL
still be captured, and the failure SHALL be recorded as a gap naming the coin
and the reason. Where the platform cannot be reached at all, the attempted
capture SHALL itself be recorded as failed with its reason. A failure to
record SHALL remain distinguishable from a moment when recording was not
attempted, and both SHALL remain distinguishable from a recorded moment.

#### Scenario: One coin fails, the rest record
- **GIVEN** a capture covering several coins
- **WHEN** the platform refuses one coin's read
- **THEN** the other coins' readings are recorded
- **AND** the failed coin is recorded as unreadable with the platform's
  reason, not omitted

#### Scenario: The platform is down
- **GIVEN** a capture attempted while the platform does not answer
- **WHEN** the capture completes
- **THEN** a failed capture is recorded with its reason
- **AND** the record shows an attempt that failed, not an absence of
  attempts

### Requirement: The Record States Its Own Coverage

The record SHALL state, for each recorded coin and interval, when recording
started, when it last captured, how many captures it holds, and where the
gaps are. The record SHALL NOT present itself as more continuous than it is,
and an absence of recordings SHALL never be rendered as an absence of signal
activity.

#### Scenario: A gap is visible
- **GIVEN** a coin recorded daily with a three-day hole
- **WHEN** the coverage is read
- **THEN** the hole is stated as a gap in recording
- **AND** nothing suggests the signals were quiet during it

#### Scenario: Nothing recorded yet
- **GIVEN** an account that has never captured
- **WHEN** the record is opened
- **THEN** it says recording has not started and how to start it
- **AND** this is distinguishable from a record that could not be read

### Requirement: Recorded History Is Readable By Coin And By Signal

The product SHALL show recorded history two ways: per coin — each capture in
time order with its aggregate score, dominant bias, conflict flag, and price —
and per signal — what one signal said for a coin across captures. Every
reading SHOWN anywhere SHALL carry its capture time; a recorded reading
SHALL NOT be presented as current.

#### Scenario: A coin's timeline
- **GIVEN** a coin with recorded captures
- **WHEN** its history is opened
- **THEN** captures render in time order with aggregate score, dominant
  bias, conflict flag, and the price at each capture

#### Scenario: One signal across time
- **GIVEN** a signal that has been captured for a coin more than once
- **WHEN** that signal's history is opened
- **THEN** its readings render across captures — triggered state, bias,
  score, and raw values — each with its capture time

#### Scenario: A reading is never passed off as now
- **GIVEN** any recorded reading on any surface
- **WHEN** it is rendered
- **THEN** the time it was captured is stated with it

#### Scenario: The store cannot be read
- **GIVEN** the product's own store does not answer
- **WHEN** history is opened
- **THEN** the surface says the record could not be read
- **AND** this is distinguishable from an empty record

### Requirement: A Capture Runs Unattended And Refuses Without Authority

A capture SHALL be invocable without a browser session, so an operator's own
scheduler can run it. Invoked without BattleGrid authority, it SHALL refuse
and name what is missing rather than record nothing quietly. Its exit status
SHALL state whether the capture succeeded, so an external scheduler can tell
a working recorder from a dead one; a capture that recorded nothing SHALL NOT
exit as success.

#### Scenario: No credential
- **GIVEN** no BattleGrid authority is available
- **WHEN** a capture is invoked headlessly
- **THEN** it refuses, names the missing authority, and exits nonzero
- **AND** no empty capture is recorded

#### Scenario: A scheduler can tell success from failure
- **GIVEN** a capture invoked by a scheduler
- **WHEN** it records readings for at least one covered coin
- **THEN** it exits zero, reporting what it recorded and what failed
- **WHEN** it records readings for no coin at all
- **THEN** it exits nonzero

### Requirement: The Coins Captured And Why Are Recorded

A capture SHALL cover the coins it was given, or — given none — the coins of
the account's own radar deployments, at the timeframes those deployments
watch. Which of these happened SHALL be recorded with the capture and shown
with the history, because a record of named coins and a record of whatever
was deployed at the time mean different things. Where no coins were given
and no deployments exist or they cannot be read, the capture SHALL record
that nothing could be covered and why, and SHALL NOT record an empty capture
that reads as a market with no signals.

#### Scenario: Named coins
- **GIVEN** a capture invoked with coins named
- **WHEN** it records
- **THEN** those coins are captured
- **AND** the record states they were named

#### Scenario: Defaulting to the deployments
- **GIVEN** a capture invoked with no coins named, on an account with radar
  deployments
- **WHEN** it records
- **THEN** the deployed coins are captured at their deployed timeframes
- **AND** the record states the coins came from the deployments as they were
  at capture time

#### Scenario: Nothing to cover
- **GIVEN** no coins named and no readable deployments
- **WHEN** the capture completes
- **THEN** it records that nothing could be covered, with the reason
- **AND** exits nonzero

### Requirement: The Record Belongs To The Account That Captured It

Recorded history SHALL be scoped to the account whose authority captured it.
A user SHALL see only their own account's record, on every surface that
serves it.

#### Scenario: Another account's record is not shown
- **GIVEN** captures recorded under two different accounts
- **WHEN** one user reads their history or coverage
- **THEN** only their own account's captures are served

### Requirement: The Record Is Trimmed By Run, With Ceremony, Stating What Becomes Unknowable
Grid-Commander SHALL offer an age-based trim of the signal record that removes
whole runs — every capture, failure and reading belonging to runs started
before a chosen moment — through the same describe→confirm→perform ceremony as
its other destructive acts. The description SHALL state what becomes
unknowable: how many runs, captures and failed attempts go, across which
coins, spanning which dates, and that nothing trimmed can ever be re-recorded.

The boundary is the run, not the row, because coverage derives gaps from runs:
rows deleted out from under a surviving run would leave the record claiming
attempts whose findings are invisible.

The trim SHALL be scoped to the acting account, and the confirmation SHALL be
bound to the boundary and the described extent, so agreement to one trim
cannot authorise a different one.

#### Scenario: The trim is described before it is offered
- **WHEN** an operator chooses a boundary date
- **THEN** the page states the runs, captures, failed attempts, coins and date
  span that would go
- **AND** states that the trimmed span re-widens every gap it covered and can
  never be re-recorded

#### Scenario: The perform requires the minted confirmation
- **WHEN** the trim is submitted without a confirmation, or with one minted
  for a different boundary or extent
- **THEN** nothing is deleted and the refusal says why

#### Scenario: Only the described span goes
- **WHEN** a confirmed trim runs
- **THEN** runs started before the boundary are removed with their captures,
  failures and readings
- **AND** every run started at or after the boundary survives untouched
- **AND** the trim returns to its caller what was removed — how many runs,
  captures, failed attempts and readings — which is a value the caller
  receives, not a claim any surface makes about the past

#### Scenario: Another account's record is out of reach
- **WHEN** a trim runs for one account
- **THEN** rows belonging to any other account are untouched, enforced in the
  query's own scope rather than checked afterwards

#### Scenario: A describe is never a perform
- **WHEN** the trim page renders its description
- **THEN** nothing is deleted, however many times it renders

### Requirement: The Trim Receipt States What The Record Now Holds
After a trim completes, Grid-Commander SHALL state what the signal record
**now holds** — where its surviving coverage begins and how much of it there
is — derived from the record when the receipt is rendered.

The receipt SHALL NOT assert what was removed, and SHALL NOT render any claim
about the trim taken from the request URL. A receipt for an irreversible act
must be checkable when it is read: the operator was already told what would go,
in the description they confirmed, so the receipt's job is to confirm the record
is now what they asked for.

#### Scenario: The receipt states surviving coverage
- **WHEN** a confirmed trim completes and the operator lands on the receipt
- **THEN** the page states that the record was trimmed
- **AND** states what the record now holds, read from the record at that moment

#### Scenario: A re-opened receipt is still true
- **WHEN** the receipt address is re-opened later, after further recording or
  a further trim
- **THEN** it states the record's coverage as it stands at that moment
- **AND** never restates a removal as though it had just happened

#### Scenario: An altered address cannot fabricate a removal
- **WHEN** the receipt address is opened carrying an altered or invented
  payload
- **THEN** no figure describing a removal is rendered from it

#### Scenario: The record cannot be read while the receipt renders
- **WHEN** the record does not answer as the receipt is rendered
- **THEN** the page states that the trim completed and that the record's
  coverage could not be read, naming the reason
- **AND** claims neither that the record is empty nor that any particular
  extent survives

### Requirement: Forward Returns Are Derived From The Record, With Their Sample Sizes

The product SHALL derive, at read time and never as a stored summary, the
forward return between consecutive recorded captures of a series — the price
change from one capture to the next, attributed to the states at the earlier
capture: each triggered signal, the dominant bias, and the
conflicting-signals flag — beside the unconditional baseline over the same
pairs. Every figure SHALL carry the sample size it is computed from, and no
ordering of the figures SHALL rank by the return itself — small samples must
not be promoted by sorting, the same rule the trading record applies to win
rates.

A pair of captures whose spacing the record's own coverage derivation calls
a gap SHALL NOT be paired — a return across a hole is not a return over one
cadence step — and the count of pairs excluded that way SHALL be stated
beside the figures. A failed capture carries no price and SHALL never be
paired. An account whose record holds too few valid pairs to compute
anything SHALL be told so as a fact about depth, distinctly from a record
that could not be read and from an account that never recorded.

#### Scenario: A figure never renders without its sample size

- **GIVEN** a record deep enough to pair
- **WHEN** the analysis renders
- **THEN** every per-signal, per-bias, per-conflict and baseline figure
  carries the number of pairs it is computed from
- **AND** the tables order by sample size, never by the return

#### Scenario: A gap is not a forward return

- **GIVEN** a series whose captures include a spacing the coverage
  derivation reports as a gap
- **WHEN** forward returns are derived
- **THEN** no pair spans that gap
- **AND** the analysis states how many pairs were excluded over gaps

#### Scenario: Too shallow is a fact, not an error

- **GIVEN** a record with fewer than two pairable captures in every series
- **WHEN** the analysis is read
- **THEN** it states that the record is not yet deep enough to pair, and how
  deep it is
- **AND** this is distinguishable from an unreadable record and from an
  account that never recorded

#### Scenario: Attribution is to the earlier capture

- **GIVEN** a pair of consecutive captures where a signal triggered at the
  earlier and not at the later
- **WHEN** forward returns are attributed
- **THEN** the pair's return counts toward that signal's figures
- **AND** a signal triggered only at the later capture gains nothing from
  the pair
