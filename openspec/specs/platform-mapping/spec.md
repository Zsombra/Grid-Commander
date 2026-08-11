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

### Requirement: The Freshness Check Is A Named Gate In The Verification Run

The project's verification entry point SHALL report the surface record's
freshness as a gate of its own, listed by name in its summary alongside every
other gate.

When the check cannot run, the summary SHALL say so and say why. A check that
disappears from the summary when it cannot run is indistinguishable from one
that ran and passed, and the record it guards is the input to every conformance
check the product has.

When the check can run and the record disagrees with the live server, the
verification run SHALL fail.

#### Scenario: The check can run and the record is current
- **GIVEN** a credential is available to the verification run
- **AND** the recorded server version matches the live server
- **WHEN** the run completes
- **THEN** the freshness gate is listed as having passed

#### Scenario: The check can run and the record is stale
- **GIVEN** a credential is available to the verification run
- **AND** the recorded server version differs from the live server
- **WHEN** the run completes
- **THEN** the verification run fails
- **AND** the failure identifies the freshness gate

#### Scenario: The check cannot run
- **GIVEN** no credential is available to the verification run
- **WHEN** the run completes
- **THEN** the freshness gate is listed as skipped, with the reason
- **AND** the run is not reported as having verified the record's age

#### Scenario: The gate measures without repairing
- **WHEN** the freshness gate runs
- **THEN** it does not regenerate the surface record
- **AND** a stale record stays stale until it is deliberately re-probed

### Requirement: The Record Describes Every Shape A Union Declares

Where the platform declares a path as a union of object shapes, the recorded
surface SHALL describe every one of those shapes, including shapes declared
inside a further union at that path.

The record SHALL NOT describe one branch of a union as though it were the whole
path. A record that closes an accepted set around a single branch reports every
other branch's own fields as violations — it invents a refusal the platform does
not make, which is the more damaging direction of error, because a guard that
fails against correct code gets switched off rather than repaired.

#### Scenario: A union nested inside a union

- **GIVEN** a path whose declared union holds one plain object and one further
  union of five more
- **WHEN** the surface record is derived
- **THEN** all six shapes are described at that path
- **AND** no shape's fields are recorded as outside the accepted set

#### Scenario: A path reachable only through a nested branch

- **GIVEN** an object declared only inside a branch of a nested union
- **WHEN** the surface record is derived
- **THEN** that object's own path is recorded, with what it accepts

#### Scenario: A shape that refers back to the union that holds it

- **GIVEN** a union whose member list refers back to the union itself
- **WHEN** the surface record is derived
- **THEN** the record terminates, describing the union at the first depth it is
  reachable and not repeating it without end

### Requirement: No Two Recorded Variants Match One Payload

Every variant the record describes at a path SHALL be distinguishable from every
other variant at that path, so that a payload identifies exactly one.

Where the values pinned to single constants cannot distinguish two branches, the
record SHALL use the values pinned to a fixed set of alternatives on a property
the branch demands. A constant is a set of one, and treating one as identifying
while the other is invisible is a distinction of how the declaration is written
rather than of what it permits.

Where nothing the declaration pins can distinguish two branches, the record SHALL
describe them as a single variant which accepts what either accepts, demands only
what both demand, and is treated as closed only if both are closed. Such a record
may fail to report a violation; it SHALL NOT report one the platform would not
make.

The record SHALL NOT describe a variant that a payload belonging to it cannot
match, and SHALL NOT rely on the order variants are written in to resolve which
one a payload belongs to.

#### Scenario: Branches sharing a discriminating value

- **GIVEN** four branches that all pin the same value on one property
- **AND** three of them pin a second property to a single value, while the fourth
  pins that property to a set of alternatives
- **WHEN** the surface record is derived
- **THEN** each of the four is described separately
- **AND** a payload belonging to any one of them matches only that one

#### Scenario: Branches nothing distinguishes

- **GIVEN** two branches that pin no value at all, differing only in which fields
  they demand
- **WHEN** the surface record is derived
- **THEN** they are described as one variant accepting the fields of both and
  demanding the fields of neither alone
- **AND** a payload belonging to either is not reported as violating the other

#### Scenario: A distinguishable union is left alone

- **GIVEN** a union whose branches are already told apart by their pinned
  constants
- **WHEN** the surface record is derived
- **THEN** each variant is identified by those constants and by nothing further

### Requirement: The Payload Sweep Holds Every Payload The Product Constructs

Every payload this product sends to BattleGrid SHALL be held against the recorded
surface, including both condition payloads: a strategy's own conditions travelling
to a report preview, and a condition drafted beside them.

No payload SHALL be exempted from the sweep by a note in the code that sends it.
An exemption is a claim about the code, and claims about the code belong in
checks — the one exemption this sweep ever carried is where the apply path's
missing required fields stayed invisible.

Where a recorded path is known to have been derived before a defect in the
derivation was repaired, the sweep MAY allow what that defect must report, on two
conditions: the allowance SHALL be derived from the record's own content rather
than from the text of a message, and it SHALL disappear on its own when the record
is regenerated. Everything the record says about the payload beyond that allowance
SHALL still be checked.

#### Scenario: A condition payload against a current record

- **GIVEN** a recorded surface describing every branch of the condition grammar
- **WHEN** a strategy's own conditions, or a drafted condition composed beside
  them, are held against it
- **THEN** no violation is reported

#### Scenario: A condition payload against a record derived before the repair

- **GIVEN** a recorded surface describing only one branch of the condition grammar
- **WHEN** a condition payload is held against it
- **THEN** the only violations allowed are the ones that record's own accepted set
  must produce
- **AND** a payload defect outside that allowance still fails

#### Scenario: The allowance ends without an edit

- **GIVEN** a recorded surface that describes every branch at those paths
- **WHEN** the same payloads are held against it
- **THEN** the allowance is empty and the payloads are checked in full

### Requirement: Live Probes Are Named Gates, Never Silent Passengers
The project's verification entry point SHALL NOT reach the live probes through
a gate that also reports on offline tests, and SHALL report the live suite by
name — as run, or as skipped with the reason.

The rule is the freshness gate's own, applied to the rest of the probes: a check
that disappears from a summary when it cannot run is indistinguishable from one
that ran and passed. Thirty probe files sitting inside the ordinary suite
disappear that way without a credential, inside a gate that then reports
success.

**Where the probes run, they SHALL run under the configuration that paces
them.** The live suite is pinned to run one file at a time because the platform
rate-limits, established after a concurrent run produced nine failures that a
serial re-run reduced to two. A verification entry point that reaches those same
files through a different configuration re-creates the sweep the pinning exists
to prevent — and does it against a real trading account, since a credential is
the only thing that makes the probes run at all.

Excluding the probes from the offline suite SHALL NOT be the only thing that
compiles them. Where a probe stops parsing, some gate SHALL still fail.

#### Scenario: No credential is available
- **GIVEN** the verification run has no BattleGrid credential
- **WHEN** it completes
- **THEN** the live suite is listed as skipped, with the reason
- **AND** no gate reports success on account of probes that did not run

#### Scenario: The live suite runs
- **GIVEN** the live suite is enabled for the run
- **WHEN** it runs
- **THEN** it runs one probe file at a time
- **AND** it is listed in the summary by name

#### Scenario: The offline suite does not reach the probes
- **WHEN** the offline suite runs, with or without a credential
- **THEN** it selects no live probe file

#### Scenario: A probe that stops parsing
- **GIVEN** a live probe file that no longer compiles
- **WHEN** the verification run completes
- **THEN** the run fails
- **AND** the failure is not conditional on a credential being present

### Requirement: A Recording Verifiable Without A Credential Is Verified
Where a recorded platform artifact can be re-fetched without any credential, the
verification entry point SHALL re-fetch it, and SHALL distinguish *could not
reach the source* from *the recording disagrees with it*.

The OAuth discovery document is public, and the offline OAuth conformance check
runs entirely against the recording of it. A recording nothing re-fetches can
quietly stop describing the platform, and then the guard built on it passes
while a user is sent to an endpoint that has moved. That this check needs no
authority is the reason to run it, not a reason to leave it optional.

Unreachability SHALL be reported as unchecked rather than as a failure. A gate
that goes red because a network call did not complete teaches its readers to
disregard red, which costs more than the check earns.

#### Scenario: The source answers and the recording matches
- **WHEN** the discovery document is reachable and agrees with the recording
- **THEN** the gate is listed as having passed

#### Scenario: The source answers and the recording disagrees
- **WHEN** the discovery document is reachable and differs from the recording
- **THEN** the verification run fails
- **AND** the failure identifies the gate

#### Scenario: The source cannot be reached
- **WHEN** the discovery document cannot be reached
- **THEN** the gate is listed as skipped, with the reason
- **AND** the run is not reported as having verified the recording
- **AND** the run does not fail on the unreachability

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
