# platform-mapping (delta)

## ADDED Requirements

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
