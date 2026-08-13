## ADDED Requirements

### Requirement: Every Committed Record Of The Surface Names The Same Server
Where more than one committed artifact describes the BattleGrid MCP surface,
every one of them SHALL name the same server version, and a check SHALL fail when
they do not.

The check SHALL need no credential and no network: the artifacts are committed,
so the comparison is between two files that are already present. It therefore
runs in the default verification set rather than behind an opt-in.

**Disagreement SHALL fail rather than skip.** A recording compared against a live
source can legitimately report *unchecked* when the source is unreachable. There
is no such state here — there is no network to be down — and offering one would
reproduce the silence this exists to remove.

The failure SHALL name both versions and the command that repairs the drift, so
that finding it and fixing it are one step apart.

#### Scenario: The records agree
- **WHEN** every committed record of the surface names the same server version
- **THEN** the gate is listed as having passed

#### Scenario: The records disagree
- **GIVEN** two committed records naming different server versions
- **WHEN** the check runs
- **THEN** it fails, naming both versions and the command that regenerates the
  stale one
- **AND** it does so with no credential present

#### Scenario: A record that cannot be compared
- **GIVEN** a committed record with no server version in it
- **WHEN** the check runs
- **THEN** it fails and says the record cannot be compared
- **AND** it is not reported as agreeing

### Requirement: A Derivation Refuses A Source From Another Generation
Where one recorded artifact is computed from another, the derivation SHALL refuse
when the two name different server versions, and SHALL say that a live re-probe
is the repair rather than a merge.

Deriving from a stale source backdates the artifact it writes without changing
the version stamped on it — which produces a record that reads as current and is
not, and does so silently.

#### Scenario: The source is from another generation
- **GIVEN** a source record and a target record naming different server versions
- **WHEN** the derivation runs
- **THEN** it refuses, writes nothing, and names both versions
- **AND** it says a live re-probe is the repair

#### Scenario: The source is the same generation
- **GIVEN** a source and target naming the same server version
- **WHEN** the derivation runs
- **THEN** it proceeds

## MODIFIED Requirements

### Requirement: Tool Count Is Never Treated As Evidence Of Currency

A check SHALL NOT conclude that a record is current from tool identity agreeing
— neither the number of tools nor the set of tool names, and neither against the
live server nor against another record.

BattleGrid moved two major versions while the tool count stayed at 110,
changing enums, required arguments and semantics underneath an unchanged
total.

**It happened again, between two committed records, in a guard written against
this very rule.** `refresh_declared` refused only when two artifacts disagreed
about *which tools exist*, on the stated grounds that a differing tool set meant
snapshots of different deployments. v18 added no tools: the count held at 114,
no tool was added or removed, and the two files agreed perfectly about which
tools existed while describing generations a major version apart — hiding 188
output-schema leaves. A rule scoped to the live server did not reach the case,
and the case was the same case.

Currency SHALL be concluded from the server version and from nothing else.

#### Scenario: Same count, different surface
- **GIVEN** a live server offering the same number of tools as the record
- **AND** a different server version
- **WHEN** the guard runs
- **THEN** it fails on the version, and the matching count does not suppress it

#### Scenario: Same tools, different generation
- **GIVEN** two committed records whose tool name sets are identical
- **AND** which name different server versions
- **WHEN** they are compared
- **THEN** the agreement of the tool sets does not conclude they are current
- **AND** the version difference is reported
