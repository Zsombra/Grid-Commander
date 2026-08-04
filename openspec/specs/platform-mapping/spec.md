# Platform Mapping Specification

## Purpose

The recorded model of BattleGrid's MCP surface, and the guarantee that it
announces its own age.

This product does not call BattleGrid from a hand-written list. It records
what the live server declared — tools, schemas, enums, observed responses —
and gates what it puts on the wire against that record. The record is
therefore load-bearing: a stale one does not fail loudly, it passes quietly
against a platform that has moved.

BattleGrid's own instructions say cached capability lists are not
authoritative after a deployment. This capability is how that warning is
enforced rather than repeated.

## Requirements

### Requirement: The Surface Record Names The Server It Was Taken From

The recorded surface SHALL carry the identity and version of the server that
produced it, and the time it was taken.

A record that does not name its server SHALL be treated as unusable for
staleness comparison rather than as current.

#### Scenario: The probe writes a record
- **GIVEN** a live probe of the BattleGrid MCP server
- **WHEN** the surface record is written
- **THEN** it carries the server name and version reported by `initialize`
- **AND** it carries the time the probe ran

#### Scenario: A record with no server named
- **GIVEN** a surface record missing its server version
- **WHEN** the record is checked
- **THEN** the check fails and says the record cannot be compared
- **AND** it is not reported as matching

### Requirement: A Guard Fails When The Record Disagrees With The Live Server

A check SHALL compare the recorded server version against the live server's
reported version and SHALL fail when they differ.

The failure SHALL name the command that regenerates the record, so that
discovering the drift and repairing it are one step apart.

#### Scenario: The platform has been redeployed
- **GIVEN** a surface record taken at one server version
- **AND** the live server now reports a different version
- **WHEN** the guard runs against the live server
- **THEN** it fails, naming both versions and the regeneration command

#### Scenario: The record is current
- **GIVEN** a surface record whose server version matches the live server
- **WHEN** the guard runs
- **THEN** it passes

#### Scenario: No credential is available
- **GIVEN** no BattleGrid credential in the environment
- **WHEN** the suite runs
- **THEN** the live comparison is skipped rather than passing
- **AND** the structural check that the record names a server still runs

### Requirement: Tool Count Is Never Treated As Evidence Of Currency

A check SHALL NOT conclude the record is current from the number of tools
agreeing with the live server.

BattleGrid moved two major versions while the tool count stayed at 110,
changing enums, required arguments and semantics underneath an unchanged
total.

#### Scenario: Same count, different surface
- **GIVEN** a live server offering the same number of tools as the record
- **AND** a different server version
- **WHEN** the guard runs
- **THEN** it fails on the version, and the matching count does not suppress it
