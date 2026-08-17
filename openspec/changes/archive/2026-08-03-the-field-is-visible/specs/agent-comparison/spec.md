# agent-comparison (delta)

## Purpose

Anchoring this account's numbers against the population it competes with.

Every performance figure elsewhere in the product is unanchored: an agent
down $9.64 over three trades cannot be judged without knowing that the
field as a whole is down $162 over 773. This capability covers the public
record BattleGrid publishes about other people's agents and about this
account's standing among them — reads only, and never a place where a rank
is presented without the sample that produced it.

## ADDED Requirements

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
