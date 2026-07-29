# Agent Understanding Specification

## Purpose

Show what an agent thought, and why it did or did not act.

Grid-Commander is a workbench for building, tuning and **understanding**
BattleGrid agents. The first two are about changing an agent; this capability is
about reading one — its decision cycles, the market it saw, the reasoning it
wrote, the confidence it had against the bar it set itself, and what followed.

It is a read-only capability by construction. Nothing under it mutates anything,
which is what makes it safe to grow quickly: 28 of BattleGrid's tools carry an
agent's internals and none of them can change one.

The standard it holds itself to is that a decision the agent declined to act on
is as visible as one it acted on. A log of only the trades placed describes half
the behaviour, and hides the half an operator most often needs explained.

## Requirements

### Requirement: An Agent's Decisions Are Readable, Including The Ones It Declined
Grid-Commander SHALL show an agent's decision cycles — what it saw, what it
concluded, and what followed — including the cycles in which it decided to do
nothing.

A log of only the trades an agent placed describes half its behaviour. An agent
that evaluated a setup and declined it made a decision, and it is the decision an
operator most often wants explained: the platform records it as
`SKIPPED_LOW_CONFIDENCE`, and until this existed the product could not show that
it had happened.

#### Scenario: Reading an agent's decisions
- **WHEN** a user opens an agent's reasoning
- **THEN** its decision cycles are shown, newest first
- **AND** each carries what the agent saw and the reasoning it wrote

#### Scenario: A cycle in which the agent acted on nothing
- **WHEN** a cycle ended without action
- **THEN** it is shown alongside the others rather than omitted
- **AND** the reason it ended that way is stated

#### Scenario: An agent that has not reasoned yet
- **WHEN** an agent has no recorded decisions
- **THEN** the user is told there are none
- **AND** this is distinguished from the log being unreadable

### Requirement: Confidence Is Shown Against The Bar It Had To Clear
Where a decision carries a confidence and the threshold it was measured against,
Grid-Commander SHALL show both, and SHALL state whether the bar was cleared.

A confidence of 0.35 means nothing alone. Against a threshold of 0.35 it means
the agent only just acted; against 0.7 it means the agent stood down and was
right to. Showing the number without the bar invites the reader to invent one.

#### Scenario: A decision with a threshold
- **WHEN** a decision records both a confidence and a threshold
- **THEN** both are shown
- **AND** whether the confidence cleared the threshold is stated rather than
  left to be worked out

#### Scenario: A decision with no threshold recorded
- **WHEN** no threshold was recorded
- **THEN** the confidence is shown without one
- **AND** no bar is implied or invented

### Requirement: An Outcome The Platform Adds Is Shown, Not Dropped
Where BattleGrid reports an outcome Grid-Commander does not recognise, the
product SHALL show it rather than discarding it or presenting it as something
else.

Four outcomes were observed on a live account. The set is BattleGrid's and it
grows; this repository has twice hard-coded a list that was already stale — the
position-management presets, and the brain presets the schema pins at eleven
against ten in the adapter. A reasoning log that silently drops the entries it
does not understand is worse than one that shows them plainly.

#### Scenario: A recognised outcome
- **WHEN** a decision carries an outcome the product has copy for
- **THEN** that copy is shown

#### Scenario: An outcome the product has never seen
- **WHEN** a decision carries an unrecognised outcome
- **THEN** the entry is still shown, with the outcome as the platform named it
- **AND** it is not counted as, or rendered as, a recognised outcome

### Requirement: A Limit Nobody Set Is Not A Limit Of Zero
Where BattleGrid reports a risk gauge as unconfigured, Grid-Commander SHALL
present it as having no ceiling, and MUST NOT render its `remaining` as a
quantity.

The platform reports an unconfigured gauge with `remaining: 0`. Shown as a
number that reads *no headroom left* — the exact inverse of the truth, which is
that nothing will stop the agent on that limit at all. On the account this was
built against, the two unconfigured gauges were **drawdown** and **daily loss**:
the two that govern how much can be lost.

Where a gauge has no ceiling, Grid-Commander SHALL say that no limit is set
rather than reporting a distance to one.

#### Scenario: A gauge with a ceiling
- **WHEN** a limit is configured
- **THEN** how much is used and how much remains are both shown

#### Scenario: A gauge with no ceiling
- **WHEN** a limit is not configured
- **THEN** the user is told no limit is set
- **AND** no remaining quantity is shown for it

#### Scenario: Usage without a ceiling
- **WHEN** an unconfigured gauge reports usage anyway
- **THEN** the usage is still shown
- **AND** it is not presented as progress toward anything

### Requirement: What Would Stop This Agent Is Stated, Including Nothing
Grid-Commander SHALL state which of an agent's limits could halt it, and which
could not because no ceiling was set.

An agent with every gauge unconfigured is not an agent operating safely within
its limits. It is an agent with no limits, and a surface that shows four calm
rows says the first when the truth is the second. Where the platform reports its
own warnings — an over-subscribed budget, a stop below a single trade's loss, a
stop that is effectively unbounded — those SHALL be carried as the platform
states them rather than recomputed.

#### Scenario: An agent with ceilings that bind
- **WHEN** an agent has configured limits
- **THEN** the user is told which ones would halt it

#### Scenario: An agent with nothing that would stop it
- **WHEN** no limit is configured
- **THEN** the user is told that nothing will halt this agent on those limits

#### Scenario: The platform raises its own warning
- **WHEN** BattleGrid reports the budget over-subscribed, the stop below a
  single trade's loss, or the stop effectively unbounded
- **THEN** that warning is shown as the platform stated it

#### Scenario: An agent the platform has already halted
- **WHEN** an agent is halted
- **THEN** that is shown before any gauge, with the reason the platform gave
