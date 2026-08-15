# Mcp Control Specification

## Purpose

Letting a language model the operator chooses drive Grid-Commander.

The product is exposed as an MCP server over its own use-cases, so any
MCP-speaking client — and therefore any model the operator runs — can ask
the questions the web surfaces answer. What crosses that boundary is the
product's understanding of BattleGrid, not BattleGrid's raw surface: the
derived figures, the distinctions the platform blurs, and the refusals.

Nothing here mutates. The confirmation ceremony assumes a human reads the
consequence before agreeing, and a model occupying that seat is not a human
reading it.

## Requirements

### Requirement: The Product Is Reachable As An MCP Server

The product SHALL expose its read use-cases as MCP tools over a transport
that requires no hosted service, so that any MCP client can drive it.

Each tool SHALL be named and described for the question an operator asks,
and SHALL call the same use-case the web surface calls rather than
reaching the platform directly.

**A description SHALL NOT state a count of things the platform owns.** A tool
description is a static string served to a language model, which will repeat it
to an operator with the tool's own authority — while the tool returns the live
list. Nothing checks a sentence, so a tally written into one is true on the day
it is written and silently wrong afterwards. The list is the count.

#### Scenario: A model lists the tools
- **GIVEN** an MCP client connected to the server
- **WHEN** it lists tools
- **THEN** the read surfaces of the product are offered
- **AND** each carries a description of what it answers

#### Scenario: A description that would go stale
- **WHEN** a tool answers with a set the platform defines — signals, metrics,
  tools, modules
- **THEN** its description names what the set contains
- **AND** does not state how many there are

#### Scenario: A model reads the roster
- **GIVEN** a connected account
- **WHEN** the model calls the roster tool
- **THEN** it receives the same agents the web roster shows

### Requirement: No Tool Mutates

The MCP surface SHALL contain no tool that changes anything on the operator's
BattleGrid account — not an agent, a strategy, a deployment, or a connection.
No tool SHALL reach the step that performs a write, and this SHALL be enforced
by a check derived from the application's own use-case table rather than by a
maintained list.

A tool MAY record a proposal in this product's own store, because recording
what was suggested changes nothing about the account and confers no authority
to change it. The distinction the check enforces is reaching the platform's
write path, not writing at all.

Where a model asks for something that would change the account, the surface
SHALL make clear that agreeing to it happens elsewhere, and where.

#### Scenario: The performing use-cases are absent
- **GIVEN** the application's use-cases, some of which perform writes
- **WHEN** the MCP tool table is checked against them
- **THEN** no tool reaches a use-case that writes to BattleGrid

#### Scenario: Recording a proposal is not mutating
- **GIVEN** a tool that records a proposal
- **WHEN** the check runs
- **THEN** it passes
- **AND** the tool is confirmed to reach no BattleGrid write

#### Scenario: A model is told where agreement happens
- **GIVEN** a model inspecting the server
- **WHEN** it reads what the server offers
- **THEN** it learns that changes are agreed to in the web app, and where

### Requirement: A Refusal Crosses The Boundary As A Refusal

Where a use-case reports that something could not be read, the tool SHALL
return that state as data naming itself, not as a tool failure. A state
meaning "nothing exists" and a state meaning "we could not ask" SHALL
remain distinguishable to the caller.

#### Scenario: The platform cannot be reached
- **GIVEN** a read whose result is unreadable
- **WHEN** the tool returns
- **THEN** the result says it could not be read, and why
- **AND** it is not reported as an empty result

#### Scenario: Nothing exists to report
- **GIVEN** a read whose result is genuinely empty
- **WHEN** the tool returns
- **THEN** the result says so
- **AND** is distinguishable from a failure to read

### Requirement: The Server Refuses To Start Without Authority

The server SHALL resolve the operator's BattleGrid authority when it
starts, and SHALL refuse to start without it rather than serving tools
that will fail on every call.

#### Scenario: No credential is configured
- **GIVEN** no BattleGrid authority is available
- **WHEN** the server starts
- **THEN** it refuses to start and says what is missing

### Requirement: A Model Can Record A Proposal And Nothing More

The MCP surface SHALL let a model record, on the operator's behalf, an intent
to make a change: which change, against which target, with which values.
Recording SHALL work on every deployment mode the server starts under —
in particular a personal-key deployment, where no delegated identity row
exists, because that is the mode the stdio server is most run in.

Recording a proposal SHALL NOT read a consequence, mint a confirmation, reserve
anything, or contact BattleGrid. The response SHALL identify the proposal and
say where a human can act on it.

#### Scenario: A model proposes a change
- **GIVEN** a connected account
- **WHEN** a model records a proposal
- **THEN** it receives a reference to the proposal and where to review it
- **AND** the operator's BattleGrid account is unchanged

#### Scenario: On a personal deployment
- **GIVEN** a personal-key deployment, whose acting identity has no stored
  user row
- **WHEN** a model records a proposal
- **THEN** it is recorded and listed for the operator
- **AND** it is not refused on the strength of an identity table only the
  delegated path writes

#### Scenario: A proposal the product cannot express
- **GIVEN** a proposal naming a change this product does not offer
- **WHEN** it is recorded
- **THEN** it is refused, naming what is not offered
- **AND** nothing is stored

#### Scenario: The model does not receive a confirmation
- **WHEN** any proposal is recorded
- **THEN** the response carries no confirmation token
- **AND** no confirmation exists to be carried

### Requirement: A Proposal Is Agreed To Against The World As It Is Then

When an operator opens a recorded proposal, the product SHALL describe the
change **at that moment** — reading the target fresh and rendering the
consequence and confirmation it renders for a change begun in the web app.

A proposal SHALL NOT carry a consequence computed when it was recorded. What
the operator agrees to MUST be bound to the values in force when they agree.

#### Scenario: Opening a proposal
- **GIVEN** a recorded proposal
- **WHEN** the operator opens it
- **THEN** the consequence is computed from the target as it is now
- **AND** the operator sees the same confirmation a web-initiated change shows

#### Scenario: The world moved since the proposal
- **GIVEN** a proposal recorded against a target that has since changed
- **WHEN** the operator opens it
- **THEN** the consequence describes the change against the current values
- **AND** the difference from what was proposed is stated

#### Scenario: The change is no longer possible
- **GIVEN** a proposal whose target has been archived or no longer exists
- **WHEN** the operator opens it
- **THEN** they are told the change can no longer be made, and why
- **AND** no confirmation is offered

#### Scenario: Agreeing performs exactly the ordinary write
- **GIVEN** an operator agreeing to an opened proposal
- **WHEN** the change is performed
- **THEN** it goes through the same confirm-and-perform path as a web-initiated
  change
- **AND** it is recorded in the audit as a write made on the operator's behalf

#### Scenario: A refused agree returns with the reason
- **GIVEN** an operator agreeing to an opened proposal
- **WHEN** the ordinary write refuses the change
- **THEN** the operator is returned to the proposal with the refusal's reason
  shown
- **AND** the proposal is not closed

#### Scenario: The change was made but the proposal was already closed
- **GIVEN** an agree whose write succeeded
- **WHEN** closing the proposal finds it already resolved
- **THEN** the operator is told the change was made, and where to verify it
- **AND** the message is never dropped in a silent redirect

### Requirement: A Proposal Confers No Authority And Expires Unagreed

A recorded proposal SHALL never cause a change on its own. It SHALL NOT be
performed by the passage of time, by the model that recorded it, by a repeat
call, or by any setting.

A proposal that is not agreed to SHALL become stale and SHALL NOT remain
actionable indefinitely.

#### Scenario: Nothing performs itself
- **GIVEN** a recorded proposal that no human has opened
- **WHEN** any amount of time passes
- **THEN** the operator's account is unchanged

#### Scenario: A model cannot agree to its own proposal
- **GIVEN** a model that recorded a proposal
- **WHEN** it calls every tool the surface offers
- **THEN** none of them agrees to it

#### Scenario: A stale proposal
- **GIVEN** a proposal older than the product's staleness horizon
- **WHEN** the operator views their proposals
- **THEN** it is shown as stale rather than actionable

#### Scenario: The operator declines
- **GIVEN** an opened proposal
- **WHEN** the operator declines it
- **THEN** it is closed and cannot be agreed to afterwards
- **AND** the account is unchanged

### Requirement: The Operator Can See What Has Been Proposed For Them

The product SHALL show the operator every proposal recorded on their behalf
that has not been resolved, with what each would change and when it was
recorded.

A proposal that exists and is not visible is a change waiting to happen that
nobody knows about.

#### Scenario: Reviewing what a model suggested
- **WHEN** the operator opens their proposals
- **THEN** each unresolved proposal is listed with its target and what it would
  change

#### Scenario: No proposals
- **WHEN** the operator opens their proposals and none exist
- **THEN** they are told none exist
- **AND** this is distinguished from proposals that could not be read

#### Scenario: Proposals belong to one account
- **GIVEN** proposals recorded for another account
- **WHEN** the operator views theirs
- **THEN** the other account's proposals are not shown

### Requirement: A Model Can Ask Whether An Agent Would Take A Coin

The MCP surface SHALL let a model ask, for one of the operator's own agents,
whether that agent's gates would admit a trade on a set of coins **right now** —
and where they would not, which gate stops it and by how much.

Every other read on this surface explains something that already happened. A
model asked why an agent is not trading can otherwise only reason forward from
backward evidence, and the answer it needs is one the platform will state
directly, without the agent acting and without spending a decision.

**The answer SHALL state where the screened coins came from, and SHALL state it
as prominently as the verdicts themselves.** The model MAY name the coins; where
it does not, the product chooses them, and which of those happened changes what
the answer means. "None of these qualify" is a finding about the agent when the
agent's owner or the agent's own deployments chose the subject, and a finding
about this product's fallback when it did not. A model that reports the verdicts
without the provenance reports a stuck agent to its owner.

Where the product had to choose, the answer SHALL also say **why** it fell back.
An agent deployed nowhere and an agent whose deployments could not be read
produce the same coins and mean opposite things, and only one of them is a
finding about the agent.

Where no coins could be chosen at all, the tool SHALL say so, and SHALL NOT
answer with a screening of nothing — an empty verdict list reads as "this agent
would take none of them", which is a claim about the agent made on the strength
of a subject that was never chosen.

#### Scenario: A model screens an agent's own coins
- **GIVEN** an agent deployed on coins
- **WHEN** a model calls the screening tool without naming any
- **THEN** it receives a verdict per coin, with each gate as a measured value
  against the threshold it is judged on
- **AND** the answer states that the coins are the agent's own deployments

#### Scenario: The product chose the coins
- **GIVEN** an agent that is deployed nowhere
- **WHEN** a model calls the screening tool without naming any coins
- **THEN** coins from the platform's ranked list are screened
- **AND** the answer states that the product chose them, and that the agent is
  deployed nowhere
- **AND** it names the ranking the coins were taken from

#### Scenario: A fallback that means something else
- **GIVEN** an agent whose deployments could not be read
- **WHEN** the screening falls back to the ranked list
- **THEN** the answer states that the deployments could not be read
- **AND** it does not state that the agent is deployed nowhere

#### Scenario: The model names the coins
- **GIVEN** a model that names the coins to screen
- **WHEN** the tool answers
- **THEN** those coins are screened rather than any the product would have chosen
- **AND** the answer states that they were the ones asked about

#### Scenario: No coins could be chosen
- **GIVEN** neither the agent's deployments nor a ranked list can be read
- **WHEN** the tool answers
- **THEN** it says which coins to screen could not be determined
- **AND** it does not report that no coin qualifies

#### Scenario: The screening cannot be read
- **GIVEN** the platform does not answer the screening call
- **WHEN** the tool returns
- **THEN** the result says it could not be read, as data naming itself rather
  than as a tool failure
- **AND** where the coins came from is still stated

### Requirement: The Recorded Signal History Is Readable By A Model

The MCP surface SHALL let a model read the recorded signal history — per
coin and per signal — and the record's coverage. Every answer serving
recorded readings SHALL carry the capture times and the coverage facts a
human surface shows, so a model reasons over the record as it is, not as a
continuous feed.

An answer covering a window with a recording gap SHALL state the gap, so the
model cannot mistake a hole in recording for a quiet market. An account that
has never captured SHALL be told recording has not started and where it
starts, distinctly from a record that could not be read.

These tools read this product's own store and SHALL follow the surface's
standing rule: nothing here mutates, on BattleGrid or in the record.

#### Scenario: A model reads a coin's recorded history
- **GIVEN** an account with recorded captures
- **WHEN** a model asks for a coin's signal history
- **THEN** it receives the recorded captures with their capture times and
  the platform version each observed

#### Scenario: A gap crosses the boundary as a gap
- **GIVEN** a window containing a recording gap
- **WHEN** a model reads history over that window
- **THEN** the answer states the gap
- **AND** absence of readings is not presented as absence of signal activity

#### Scenario: Recording has not started
- **GIVEN** an account that has never captured
- **WHEN** a model asks for recorded history
- **THEN** it is told recording has not started and how it is started
- **AND** this is distinguishable from a record that could not be read

### Requirement: A Trade's Story Is Readable By A Model

The MCP surface SHALL let a model read the story of one completed trade on
an owned agent: the frozen chart facts and the position's order-lifecycle
trail, in the same states the human surface holds. An evaluation that never
became a trade, an evaluation that does not exist, an unreadable story and
an unreadable trail SHALL each be answered as themselves — a model must
not be told a trade does not exist because a read failed, nor that a trail
is empty because the chart named no position to ask about.

The tool reads the platform through the same guarded path as every other
read on this surface and mutates nothing.

#### Scenario: A model reads a settled trade's story

- **GIVEN** an agent with a charted settled trade
- **WHEN** a model calls the trade-story tool with the agent and
  evaluation ids
- **THEN** it receives the chart facts, the levels and markers as the
  platform labelled them, and the audit trail's events in the platform's
  order

#### Scenario: The states stay apart over MCP

- **GIVEN** an evaluation that never filled, and separately a failing
  platform read
- **WHEN** a model asks for each story
- **THEN** the first answer says the evaluation never became a trade
- **AND** the second says the story could not be read
- **AND** the two answers are distinguishable

### Requirement: How The Loss Arrived Is Readable By A Model

The MCP surface SHALL let a model read how an owned agent's loss behind its
stop arrived: the cumulative realized P&L measured since the agent's budget
baseline and the per-settlement curve, in the same states the human surface
holds. The tool's description SHALL name the span as the budget baseline
and distinguish the reading from the trading record, and an empty curve
SHALL be answered as no settlements yet, distinctly from a reading that
could not be read. The tool reads the platform through the same guarded
path as every other read on this surface and mutates nothing.

#### Scenario: A model reads the loss shape

- **GIVEN** an agent whose performance read answers a signed figure and a
  curve with points
- **WHEN** a model calls the loss-shape tool with the agent id
- **THEN** it receives the realized figure, the curve oldest-first, and the
  settlement count

#### Scenario: Empty and unreadable stay apart over MCP

- **GIVEN** an agent that has settled nothing, and separately a failing
  platform read
- **WHEN** a model asks for each loss shape
- **THEN** the first answer is a loss shape with zero settlements
- **AND** the second says the reading could not be read, with its cause
- **AND** the two answers are distinguishable

#### Scenario: The span is stated where a model reads it

- **WHEN** a model lists the surface's tools
- **THEN** the loss-shape tool's description names the budget baseline as
  the span and points the lifetime question at the trading record
