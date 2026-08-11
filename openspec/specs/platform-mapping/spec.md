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

### Requirement: The Record Carries Every Surface The Server Declares

The recorded surface SHALL carry every capability surface the server's
`initialize` handshake declares — the tool list, the server instructions, the
prompt list with each prompt's fetched body, and the resource list with each
resource's fetched content — not the tool list alone.

Each prose surface SHALL be recorded with a content digest, so that two
records, or a record and a live server, can be compared without comparing
whole texts.

A body the server refuses or fails to return SHALL be recorded as a named
failure on that entry. It SHALL NOT be recorded as absent, because an absent
body and a never-fetched body are different facts and only one of them is a
finding.

#### Scenario: The probe writes a record

- **GIVEN** a live probe of the BattleGrid MCP server
- **WHEN** the surface record is written
- **THEN** it carries the server instructions with their digest
- **AND** every prompt the server lists, each with its fetched body and digest
- **AND** every resource the server lists, each with its fetched content and
  digest

#### Scenario: A body the server would not return

- **GIVEN** a prompt or resource whose fetch fails
- **WHEN** the surface record is written
- **THEN** that entry carries the failure reason
- **AND** the record does not present the surface as complete

#### Scenario: A record missing a prose surface

- **GIVEN** a surface record carrying tools but no instructions, prompts, or
  resources
- **WHEN** the offline record check runs
- **THEN** it fails, naming the regeneration command

### Requirement: Prose Surface Drift Fails The Live Freshness Guard

The live freshness guard SHALL compare the recorded digests of the server
instructions, each prompt body, and each resource content against the running
server, and SHALL fail on any difference, naming which surface moved.

The instructions are addressed to the connected account by name, so the
comparison SHALL normalise the addressee before digesting. Two operators
holding the same record MUST NOT see different verdicts because the platform
greeted them differently.

#### Scenario: A prompt body changed under an unchanged version

- **GIVEN** a record whose digests were taken at the live server's version
- **AND** the live server now returns a prompt body with a different digest
- **WHEN** the live guard runs
- **THEN** it fails, naming the prompt and the regeneration command

#### Scenario: The same record under a different account

- **GIVEN** a record taken by one account
- **AND** a live server greeting a different account in its instructions
- **WHEN** the live guard compares instructions
- **THEN** the greeting difference alone does not fail the comparison

#### Scenario: No credential is available

- **GIVEN** no BattleGrid credential in the environment
- **WHEN** the suite runs
- **THEN** the prose comparison is skipped rather than passing
- **AND** the offline check that the record carries the surfaces still runs

### Requirement: The Reference Renders What The Record Carries

The human-readable reference SHALL include the server instructions verbatim,
and the body of every recorded prompt and resource, so that the platform's
prose contract is readable in the repository rather than only over a live
connection.

Regenerating the reference from the committed record SHALL be possible with
no input other than the repository itself, and the live re-probe SHALL be one
command needing only the credential.

#### Scenario: The reference is regenerated

- **WHEN** the reference is regenerated from the committed record
- **THEN** it contains the recorded server instructions in full
- **AND** a body section for every recorded prompt and resource

#### Scenario: The reference and the record disagree

- **GIVEN** a reference missing the instructions or any recorded body
- **WHEN** the offline record check runs
- **THEN** it fails, naming what the reference dropped

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
