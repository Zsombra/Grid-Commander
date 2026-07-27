# Capability Tiers Specification

## Purpose

The safety boundary at the heart of Grid Commander. Every BattleGrid tool is
classified into one of three capability tiers, and the client guarantees that a
consumer cannot reach a higher tier than it was granted — so money-moving and
account-mutating tools can never be called by accident.

The tiers:
- **observe** — pure reads, no side effects (market data, regimes, performance).
- **manage** — writes that change the account but move no money (create or
  rebind agents, author or apply strategies). Some are destructive.
- **wager** — the 16 tools that commit real money or standing trading authority.

## Requirements

### Requirement: Every Tool Has A Tier, Unknown Tools Fail Safe
The client SHALL assign every tool exactly one tier — observe, manage, or
wager — and SHALL treat any tool it cannot classify as wager (the most
restricted tier).

#### Scenario: Every advertised tool is classified
- **WHEN** the client loads its tool classification
- **THEN** every tool the client can invoke has exactly one tier

#### Scenario: An unclassified tool is treated as wager
- **GIVEN** a tool that is not present in the classification
- **WHEN** a consumer attempts to invoke it
- **THEN** the client treats it as a wager tool and applies the wager restriction
- **AND** it is not treated as observe or manage

### Requirement: Wager Tools Are Unreachable Without An Explicit Wager Client
A client granted only observe or manage access SHALL NOT be able to dispatch any
wager tool, and the attempt SHALL fail before any network request is made.

#### Scenario: Wager call from a non-wager client is refused
- **GIVEN** a client granted observe and manage access only
- **WHEN** a consumer attempts to invoke a wager tool
- **THEN** the client refuses the call with an error identifying it as a wager tool
- **AND** no request is sent to the server

#### Scenario: The wager tools are absent from the default typed surface
- **GIVEN** a consumer writing against the default client
- **WHEN** they look for a wager tool as a typed method
- **THEN** no wager tool is available on the default client's typed surface

#### Scenario: A wager-capable client requires explicit construction
- **WHEN** wager access is needed
- **THEN** it is only obtainable by explicitly constructing a wager-capable client through a distinct, logged path
- **AND** that path is never the default way the client is created

### Requirement: Manage Tools Are Unreachable From Observe-Only Access
A consumer granted only observe access SHALL NOT be able to dispatch a manage
tool, so account-mutating actions (including destructive ones like rebinding an
agent) cannot be triggered from a read-only path.

#### Scenario: Manage call from an observe-only client is refused
- **GIVEN** a client granted observe access only
- **WHEN** a consumer attempts to invoke a manage tool
- **THEN** the client refuses the call with an error identifying it as a manage tool
- **AND** no request is sent to the server

#### Scenario: Observe access exposes only observe tools
- **GIVEN** a client granted observe access only
- **WHEN** it lists the tools it can invoke
- **THEN** only observe-tier tools are listed
