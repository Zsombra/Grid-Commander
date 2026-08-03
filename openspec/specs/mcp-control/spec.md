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

The MCP surface SHALL contain no tool that changes anything — not an
agent, a strategy, a deployment, or a connection. A tool SHALL NOT reach a
use-case that mutates, and this SHALL be enforced by a check derived from
the application's own use-case table rather than by a maintained list.

Where a model asks for something that would mutate, the surface SHALL make
clear that this is not offered here and where it does happen.

#### Scenario: The write use-cases are absent
- **GIVEN** the application's use-cases, some of which mutate
- **WHEN** the MCP tool table is checked against them
- **THEN** no tool reaches a mutating use-case

#### Scenario: A model is told where writes happen
- **GIVEN** a model inspecting the server
- **WHEN** it reads what the server offers
- **THEN** it learns that changes are not made here, and where they are

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
