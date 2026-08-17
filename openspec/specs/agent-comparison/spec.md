# Agent Comparison Specification

## Purpose

Anchoring this account's numbers against the population it competes with.

Every performance figure elsewhere in the product is unanchored: an agent
down $9.64 over three trades cannot be judged without knowing that the
field as a whole is down $162 over 773. This capability covers the public
record BattleGrid publishes about other people's agents and about this
account's standing among them — reads only, and never a place where a rank
is presented without the sample that produced it.

## Requirements

### Requirement: The Field Is Readable

The product SHALL show the population of agents this account competes
against: the field's own totals (how many agents it counts, its win rate,
its total and average net P&L), and a ranked list of agents with, for
each, its rank, model, owner, tenure, net P&L, win rate, trade count, ROI,
best and worst trade, and the platform's own subtitle and objective.

The ranked list SHALL be presented over the platform's own windows
(daily, weekly, monthly, all-time) and sort keys (net P&L, win rate, trade
count), and SHALL NOT invent a sort or a window the platform does not
offer.

#### Scenario: The field answers
- **GIVEN** a connected account
- **WHEN** the user opens the field
- **THEN** the field's agent count, win rate and net P&L are shown
- **AND** each listed agent shows its rank, model, net P&L, win rate and
  trade count

#### Scenario: The field cannot be read
- **GIVEN** the platform fails to answer
- **WHEN** the field renders
- **THEN** the page says it could not be read and why
- **AND** does not render an empty field as a field with no agents

### Requirement: A Partial List Says It Is Partial

Where the platform returns fewer agents than the field it reports, the
product SHALL state both numbers and SHALL NOT present the returned rows
as the whole field. The count shown SHALL be the number of rows actually
rendered, never the field total.

The two counts SHALL be carried as separate values rather than reconciled,
because the platform's truncation is intermittent: the same request has
answered both partially and completely within one hour, so there is no
condition under which the list may be assumed whole.

#### Scenario: Fewer rows than agents
- **GIVEN** the platform reports 37 agents and returns 5 rows
- **WHEN** the list renders
- **THEN** the page says 5 of 37 are shown
- **AND** does not describe the 5 as the field

#### Scenario: Every agent returned
- **GIVEN** the platform returns as many rows as the field it reports
- **WHEN** the list renders
- **THEN** no partial-list caveat is shown

### Requirement: A Rank Is Shown With Its Sample

Where the product ranks agents by a rate, it SHALL show the number of
observations that rate was computed from next to it, so a rank earned on
one trade cannot be read as a rank earned on fifty.

#### Scenario: A perfect record on one trade
- **GIVEN** an agent ranked first by win rate with a single trade
- **WHEN** the list renders sorted by win rate
- **THEN** its trade count is shown alongside its win rate
- **AND** the page says that rates over few trades are not comparable

### Requirement: An Unmeasured Rate Is Not Zero

Where the platform reports a rate or an average as absent, the product
SHALL say it is not measured rather than render it as zero. This applies
to the field's own totals and to any per-vendor or per-agent breakdown.

#### Scenario: A vendor with no trades
- **GIVEN** a model vendor whose agents have made no trades
- **WHEN** the breakdown renders
- **THEN** its win rate is shown as not measured
- **AND** is not shown as 0%

#### Scenario: A window in which nobody traded
- **GIVEN** a window whose field win rate the platform reports as absent
- **WHEN** the field renders
- **THEN** the win rate is shown as not measured

### Requirement: Where This Account Stands Is Shown First

The product SHALL show this account's own standing — its rank and
percentile among all players, and the rank of each of its own agents
within the field — before the rest of the field, and SHALL say plainly
when the platform places none of its agents in the field.

The product SHALL also show the ranked players the platform returns
alongside that standing, and SHALL mark which of those rows is this
account's own — identified by the platform's own `userId` and by nothing
else. Where the platform returns no ranked players, the product SHALL say
that nobody is ranked, and SHALL NOT let that read as a failed read.

#### Scenario: The account is ranked
- **GIVEN** the platform reports a rank and percentile for this account
- **WHEN** the field renders
- **THEN** that rank and percentile are shown before the field list
- **AND** each of this account's ranked agents is named with its rank

#### Scenario: The account has no ranked agents
- **GIVEN** the platform returns no agents for this account
- **WHEN** the field renders
- **THEN** the page says none of this account's agents are ranked
- **AND** the rest of the field is still shown

#### Scenario: The ranked players are shown
- **GIVEN** the platform returns ranked players on the leaderboard
- **WHEN** the field renders
- **THEN** each player's rank, name and value is shown

#### Scenario: This account appears among the ranked players
- **GIVEN** the leaderboard contains a row whose `userId` is this account's
- **WHEN** the field renders
- **THEN** that row is marked as this account's
- **AND** no other row is marked

#### Scenario: This account is ranked but outside the returned rows
- **GIVEN** the platform reports a standing for this account
- **AND** no returned row carries this account's `userId`
- **WHEN** the field renders
- **THEN** the standing is still shown
- **AND** no row is marked

#### Scenario: The platform identifies nobody
- **GIVEN** the returned rows carry no `userId`
- **WHEN** the field renders
- **THEN** every row is still shown
- **AND** no row is marked

#### Scenario: Nobody is ranked
- **GIVEN** the platform returns no ranked players
- **WHEN** the field renders
- **THEN** the page says the platform ranks no players
- **AND** that reads as a statement about the platform, not as a failed read

#### Scenario: The leaderboard cannot be read
- **GIVEN** the leaderboard read does not answer
- **WHEN** the field renders
- **THEN** the page says the standing could not be read, and why
- **AND** no ranked players are shown, and none are claimed to be absent

### Requirement: One Competitor's Record Is Readable

The product SHALL show, for any public agent in the field, the record
BattleGrid publishes about it: how much it evaluated and how much of that
it acted on, its entry decisions split by outcome, its average score,
conviction and risk-to-reward, its realized result, what it is holding
now, its closed trades, and the evaluations behind them.

Every competitor listed in the field SHALL be openable from the field.

Each of these reads SHALL be able to fail on its own without hiding the
others, and a read that returns nothing SHALL say what its emptiness means
rather than render blank.

#### Scenario: A competitor is opened
- **GIVEN** an agent listed in the field
- **WHEN** the user opens it from the field list
- **THEN** its evaluation and decision counts are shown
- **AND** its realized result and closed trades are shown

#### Scenario: One read fails, the others answer
- **GIVEN** the platform fails to return a competitor's trades
- **WHEN** the page renders
- **THEN** the trades section says it could not be read and why
- **AND** the funnel and evaluations are still shown

#### Scenario: A competitor with no closed trades
- **GIVEN** a competitor whose trade list comes back empty
- **WHEN** the page renders
- **THEN** the page says it has closed no trades
- **AND** does not render an empty table

### Requirement: Withheld Telemetry Is Not Shown As Absent

Where BattleGrid nulls owner-private fields on a public read, the product
SHALL NOT render them as data the agent did not produce. It SHALL either
omit them or say they are not published.

#### Scenario: Owner-only reasoning on a public read
- **GIVEN** a public evaluation whose owner-only telemetry is nulled
- **WHEN** it renders
- **THEN** no empty reasoning is shown as though the agent gave none

### Requirement: Distinct Platform Counters Stay Distinct

Where the platform reports two counters with similar names and different
meanings, the product SHALL NOT sum them, substitute one for the other, or
present them under a single label.

#### Scenario: The two skip counters
- **GIVEN** a competitor with 29 SKIP decisions and 0 SKIPPED terminal
  outcomes
- **WHEN** the funnel renders
- **THEN** the two counts are labelled distinctly
- **AND** neither is shown as the other

### Requirement: One Evaluation's Scorecard Is Legible

The product SHALL show, for one public evaluation, every signal the agent
consulted — not only those that fired — with, for each: the module it
belongs to, whether it triggered, its score, its bias and direction,
whether it was primary or required, and the platform's own written
description of what it saw. Signals SHALL be grouped by module, and those
that triggered SHALL be distinguishable from those that did not.

The product SHALL also show how the aggregate score was composed, where
the platform attributes it, and the chain the candidate followed from gate
through attempt, decision, execution and outcome.

#### Scenario: An evaluation is opened
- **GIVEN** a public evaluation with signals the agent consulted
- **WHEN** the user opens it
- **THEN** every consulted signal is shown, grouped by module
- **AND** each shows the platform's own description of what it saw

#### Scenario: Signals that did not fire
- **GIVEN** an evaluation in which most consulted signals did not trigger
- **WHEN** it renders
- **THEN** the untriggered signals are shown alongside the triggered ones
- **AND** the two are distinguishable

#### Scenario: How the score was built
- **GIVEN** an evaluation whose platform attributes its aggregate score
- **WHEN** it renders
- **THEN** each contributing signal's share is shown

#### Scenario: The chain a candidate followed
- **GIVEN** an evaluation that reached a decision
- **WHEN** it renders
- **THEN** the attempt's result, the decision, and any execution and
  outcome are shown in that order
- **AND** a stage the platform did not record is omitted rather than shown
  as an empty one

### Requirement: An Evaluation Without Published Detail Says So

Where the platform lists an evaluation but publishes no detail for it, the
product SHALL say that no detail is published, distinctly from a failure to
read. It SHALL NOT hide the link on a prediction about which evaluations
will resolve.

#### Scenario: A listed evaluation with no detail
- **GIVEN** an evaluation the platform lists but returns no detail for
- **WHEN** the user opens it
- **THEN** the page says BattleGrid publishes no detail for it
- **AND** does not report it as unreadable

#### Scenario: Every listed evaluation is openable
- **GIVEN** a competitor's list of evaluations
- **WHEN** the list renders
- **THEN** every evaluation offers a way to open it

### Requirement: Owner-Private Telemetry Is Never Rendered

The product SHALL NOT read or display the owner-only fields the platform
nulls on a public evaluation, and SHALL NOT render a placeholder in their
place.

#### Scenario: Owner-only reasoning is withheld
- **GIVEN** a public evaluation whose owner-only telemetry is nulled
- **WHEN** it renders
- **THEN** no empty reasoning slot is shown
