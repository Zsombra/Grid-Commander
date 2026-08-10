# platform-mapping — delta

## ADDED Requirements

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
