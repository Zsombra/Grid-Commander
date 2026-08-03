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
Where BattleGrid names something this product has no copy for, Grid-Commander
SHALL show the platform's own name rather than omitting the entry or
substituting a fallback that asserts something untrue.

There is no tool that enumerates outcomes or event kinds, so any list held here
is a snapshot of one account on one afternoon. This has been demonstrated twice:
a second, older account produced eight names the first account was too young to
contain, and every one reached the surface readable because nothing was narrowed
to a union.

**A sentence the platform wrote SHALL be found wherever it puts it.** The key
carrying an explanation is not fixed — a cost limit reports under `error` where a
skipped round reports under `reason` — and a reader looking in one place will
silently miss the other. What is at stake is the single line explaining why an
agent stopped.

**Detail that identifies the thing being read SHALL NOT be printed back at the
reader.** Identifiers for the agent, session or record already in view carry no
information on that surface, and a list of them buries the sentence beside it.

#### Scenario: An unrecognised name
- **WHEN** BattleGrid reports an outcome or event kind this product has no copy for
- **THEN** it is shown under the platform's own name

#### Scenario: An explanation under an unexpected key
- **WHEN** the platform explains an event under a key other than the usual one
- **THEN** the explanation is still shown as prose

#### Scenario: Detail that is only identifiers
- **WHEN** an event's detail is identifiers for what the reader is already looking at
- **THEN** none of it is shown

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

### Requirement: How An Agent Has Done Is Shown From What The Platform Already Sent
Grid-Commander SHALL show an agent's record — how many games it played, how
often it won, how accurate it was, what it earned, and how its trades went —
where BattleGrid reports them.

**A figure the product already receives SHALL NOT be discarded.** The agent
payload carries a performance block on every read, and the product parsed it and
threw it away for its whole life. A field excluded from a domain type because it
governs no rule is not thereby excluded from the interface; understanding is a
purpose of this product, not a side effect of authoring.

**Where a tool's name and its contents disagree, the contents decide.** The tool
called `get_agent_performance` returned no populated figure on any agent
observed, while the roster read carries the full record. Nothing is presented
from a source that has only ever answered with zeros.

**A number the platform sends twice SHALL be kept once.** A rate arrives as both
a fraction and a whole-number percent; the product keeps one and derives
nothing, so the two can never disagree on a surface.

#### Scenario: An agent that has played
- **WHEN** a user opens an agent BattleGrid has a record for
- **THEN** they see what it played, how it did, and what it earned

#### Scenario: An agent that has never played
- **WHEN** BattleGrid reports no games and no trades for an agent
- **THEN** the surface says so
- **AND** does not present zeroes as a result

#### Scenario: A record that could not be read
- **WHEN** the agent's record is absent from the response
- **THEN** that is distinguished from an agent that has done nothing

#### Scenario: Games and trades are not merged
- **WHEN** an agent has both a game record and a trade record
- **THEN** each is shown as its own, and no combined figure is invented

### Requirement: Whether An Agent Is Acting Is Stated Where The Agent Is Read
Where the platform can say which markets an agent is deployed to scan,
Grid-Commander SHALL state it on the agent's own page and on the roster: each
deployment's market and timeframe, and whether the agent is holding the
position, on duty, or in the rotation. An agent deployed nowhere SHALL be
described as configured but not acting, naming where deployment happens.
Where the deployment state cannot be read, the surface MUST say so rather
than render either certainty, and the roster MUST NOT make a per-agent claim
it cannot back.

An agent's lifecycle status says "ACTIVE" while the platform's own radar
counts only deployed agents as active. Two agents on the operator's account
held that status with zero positions, absent from every slot — configured,
waiting, and nothing in this product would ever have said so.

#### Scenario: A deployed agent
- **WHEN** the platform lists the agent in a radar deployment
- **THEN** the agent's page shows the market and timeframe
- **AND** whether the agent is holding the position, on duty, or in the
  rotation awaiting its turn

#### Scenario: An agent deployed nowhere
- **WHEN** the platform lists the agent in no radar deployment
- **THEN** the agent's page says plainly that it is configured but not
  scanning any market
- **AND** names where deployment happens

#### Scenario: The radar cannot be read
- **WHEN** the deployment state cannot be read
- **THEN** the page says the deployment state is unknown, with the cause
- **AND** does not claim the agent is deployed, nor that it is not

#### Scenario: The roster, at a glance
- **WHEN** the roster lists agents and the deployment state is readable
- **THEN** each row states its agent's deployments or that it is not deployed
- **AND** when the state is unreadable, one notice covers the list and no row
  claims either

### Requirement: An Agent's Trading Record Is Readable

The product SHALL show, for one agent, the trades it has closed — newest
first — each with its market, direction, net profit or loss, the fees and
slippage it paid, the leverage and conviction it acted on, why and by whom
it was closed, and how long it was open. Alongside them the product SHALL
show a summary **derived from the trades shown** — how many closed, how
many won, the net total, the fees paid, and the spread of close reasons —
and SHALL label that summary as computed from those trades rather than
published by the platform. An agent with no closed trades SHALL say so; a
record that cannot be read SHALL say that instead.

#### Scenario: The record of a trading agent
- **GIVEN** an agent with closed trades
- **WHEN** the user opens its trading record
- **THEN** each trade shows its market, direction, net P&L, fees,
  slippage, leverage, conviction, close reason, and duration
- **AND** a summary derived from those trades states the count, the wins,
  the net total, and the fees paid
- **AND** the summary is marked as computed from the trades shown

#### Scenario: An agent that has never closed a trade
- **WHEN** the user opens the record of an agent with no closed trades
- **THEN** the page says it has closed none, and does not show a summary
  of zeros as if it were a result

#### Scenario: More trades than one page
- **GIVEN** the platform reports more closed trades than the page holds
- **WHEN** the record renders
- **THEN** the user is told how many there are in total and can reach the
  next page

#### Scenario: A record that cannot be read
- **GIVEN** the platform does not answer
- **WHEN** the user opens the record
- **THEN** the page says the record could not be read and why
- **AND** does not render an empty record

### Requirement: Why An Agent Did Not Trade Is Readable

The product SHALL show, for one agent, the three stages at which a trade
candidate can end: candidates blocked before signal evaluation — with the
stage, the platform's reason code, and the quantified detail behind it;
evaluations that ran — with the aggregate score against the threshold in
force, the dominant bias, and the terminal status; and decisions the agent
reached — with its direction, conviction, and the reasoning it wrote. Each
stage SHALL be able to be empty or unreadable on its own without hiding
the others, and an empty stage SHALL say what its emptiness means rather
than render as blank.

#### Scenario: A silent agent explained
- **GIVEN** an agent whose candidates were blocked before evaluation
- **WHEN** the user opens why it did not trade
- **THEN** each block shows its stage, the platform's reason code, and the
  numbers behind it
- **AND** the agent's own reasoning is shown for any decision it reached

#### Scenario: An evaluation that was skipped
- **GIVEN** a signal evaluation whose terminal status is not an entry
- **WHEN** the pipeline renders
- **THEN** its aggregate score is shown against the threshold in force
- **AND** the dominant bias and whether signals conflicted are shown

#### Scenario: One stage empty, the others not
- **GIVEN** an agent with evaluations but no gate blocks
- **WHEN** the pipeline renders
- **THEN** the blocks stage says nothing was blocked
- **AND** the evaluations are still shown

#### Scenario: One stage unreadable, the others not
- **GIVEN** the platform fails to answer one stage
- **WHEN** the pipeline renders
- **THEN** that stage says it could not be read and why
- **AND** the stages that answered are still shown
