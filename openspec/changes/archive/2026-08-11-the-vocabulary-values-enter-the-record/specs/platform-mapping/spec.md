## ADDED Requirements

### Requirement: The Authoring Vocabulary's Values Are Recorded

The recorded surface SHALL carry the authoring vocabulary — the payload of
`list_strategy_vocabulary` for every category the platform lists — verbatim
and with a content digest per category.

This is the one stated exception to recording shapes rather than values, and
the record SHALL state the reason where it states the exception: the
vocabulary is the platform's authoring contract, identical for every
account; its values are the contract, and a shape stripped of them recorded
`strategyConditions: 16` as `"int"` while the compile schema declared
`maxItems: 64` — a fourfold over-commitment no guard could see.

The record SHALL NOT curate the payload. A category whose fetch fails SHALL
be recorded as a named failure on that category, never as absence.

#### Scenario: The probe writes a record

- **GIVEN** a live probe of the BattleGrid MCP server
- **WHEN** the surface record is written
- **THEN** it carries every listed category's vocabulary verbatim, each with
  its digest
- **AND** the recorded budget values are numbers, not type names

#### Scenario: A category the server would not answer

- **GIVEN** a category whose vocabulary fetch fails
- **WHEN** the surface record is written
- **THEN** that category carries the failure reason
- **AND** the offline record check fails, naming the category and the
  re-probe command

#### Scenario: A record without the vocabulary

- **GIVEN** a surface record carrying tools and prose surfaces but no
  authoring vocabulary
- **WHEN** the offline record check runs
- **THEN** it fails, naming the regeneration command

### Requirement: Vocabulary Drift Fails The Live Freshness Guard

The live freshness guard SHALL compare each recorded category digest against
the vocabulary the running server answers, and SHALL fail on any difference,
naming the category that moved.

A budget number, an enabled timeframe, a timeframe reference's resolution,
or a transform can change under an unchanged server version; the version
comparison SHALL NOT be treated as covering them.

#### Scenario: A budget changes under an unchanged version

- **GIVEN** a record whose digests were taken at the live server's version
- **AND** the live server now answers a category with a different digest
- **WHEN** the live guard runs
- **THEN** it fails, naming the category and the regeneration command

#### Scenario: The category list itself moves

- **GIVEN** a live server listing a category the record does not carry, or
  missing one it does
- **WHEN** the live guard runs
- **THEN** it fails, naming the categories that differ

#### Scenario: No credential is available

- **GIVEN** no BattleGrid credential in the environment
- **WHEN** the suite runs
- **THEN** the vocabulary comparison is skipped rather than passing
- **AND** the offline check that the record carries the vocabulary still runs
