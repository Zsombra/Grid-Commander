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

#### Scenario: A model lists the tools
- **GIVEN** an MCP client connected to the server
- **WHEN** it lists tools
- **THEN** the read surfaces of the product are offered
- **AND** each carries a description of what it answers

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

Recording a proposal SHALL NOT read a consequence, mint a confirmation, reserve
anything, or contact BattleGrid. The response SHALL identify the proposal and
say where a human can act on it.

#### Scenario: A model proposes a change
- **GIVEN** a connected account
- **WHEN** a model records a proposal
- **THEN** it receives a reference to the proposal and where to review it
- **AND** the operator's BattleGrid account is unchanged

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
