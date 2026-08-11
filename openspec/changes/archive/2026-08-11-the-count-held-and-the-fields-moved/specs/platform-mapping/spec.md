# Platform Mapping — Delta

## ADDED Requirements

### Requirement: The Vocabulary's Values Are Recorded Verbatim

The strategy vocabulary SHALL be recorded in a committed artifact carrying
the payload's values verbatim, together with the server name, server
version and probe time — not the shape of the payload alone.

This is the stated carve-out from the shape-only rule, and the carve-out's
condition is part of the requirement: the vocabulary is platform-owned and
account-independent, so nothing in it is anyone's private data. The
shape-only rule exists because account data must not be committed, and it
remains right everywhere else.

The vocabulary payload is the authoring contract, and it is almost
entirely values: condition budgets, enabled timeframes, transform ids,
per-metric legal transforms. A record that reduces `strategyConditions: 16`
to `"int"` records that a budget exists while losing what it permits —
and anything composed against the reduced record can over-commit fourfold
without any gate noticing.

#### Scenario: The vocabulary is recorded
- **WHEN** the vocabulary artifact is written
- **THEN** it carries the payload's own values — budgets as numbers,
  timeframes and transform ids as the strings the platform enumerated
- **AND** it carries the server name and version reported by `initialize`,
  and the time the probe ran

#### Scenario: A record that cannot be compared
- **GIVEN** a vocabulary artifact missing its server version
- **WHEN** the record is checked
- **THEN** the check fails and says the record cannot be compared
- **AND** it is not reported as matching

#### Scenario: The carve-out does not widen
- **WHEN** the vocabulary artifact is written
- **THEN** it contains only what `list_strategy_vocabulary` answered —
  no account identity, holdings, agents or any other account-derived value

### Requirement: A Values-Only Deployment Fails A Named Gate

The live freshness suite SHALL compare the recorded vocabulary against the
live platform's answer — at least the transform ids, the budget values and
the enabled timeframes — and SHALL fail when they differ, naming the
command that regenerates the record.

The version comparison alone cannot see this class of change. A deployment
that moves budget numbers, retires a timeframe or adds a transform while
leaving the version string alone passes every version gate green — and
v17.2.0 demonstrated the sibling pattern live: a tool count that held at
114 while seventeen tools changed underneath it.

#### Scenario: The values moved
- **GIVEN** a recorded vocabulary whose budgets, timeframes or transform
  ids differ from the live platform's answer
- **WHEN** the vocabulary gate runs against the live server
- **THEN** it fails, naming what differed and the regeneration command

#### Scenario: The values match
- **GIVEN** a recorded vocabulary agreeing with the live platform on
  transform ids, budget values and enabled timeframes
- **WHEN** the vocabulary gate runs
- **THEN** it passes

#### Scenario: No credential is available
- **GIVEN** no BattleGrid credential in the environment
- **WHEN** the suite runs
- **THEN** the live vocabulary comparison is skipped rather than passing
- **AND** the structural check that the artifact names a server still runs
