# battlegrid-connection (delta)

## ADDED Requirements

### Requirement: A Credential In The Environment Is Not Consent To Mutate

An automated check that can reach a mutating BattleGrid tool SHALL require an
explicit instruction to perform writes, separate from the credential that makes
them possible. The presence of a credential SHALL NOT by itself be sufficient.

Authority and intent are different things. A credential exported so that a
read-only check can run is not an agreement to fork, archive, or create
anything on the account it belongs to, and a check that treats it as one
performs writes nobody asked for.

Which tools count as mutating SHALL be derived from BattleGrid's own
classification rather than from a list held in this repository, because a list
goes stale exactly when the platform changes and that is when it matters.

#### Scenario: A credential is present and nothing asked for writes
- **GIVEN** a BattleGrid credential in the environment
- **AND** no explicit instruction to perform live writes
- **WHEN** the verification suite runs
- **THEN** no check reaches a mutating tool
- **AND** the checks that would have are reported as not run

#### Scenario: Writes are asked for explicitly
- **GIVEN** a BattleGrid credential in the environment
- **AND** an explicit instruction to perform live writes
- **WHEN** a mutating check is run
- **THEN** it runs

#### Scenario: A check that only expects a refusal
- **GIVEN** a check that reaches a mutating tool expecting the platform to
  refuse it
- **WHEN** the gating is decided
- **THEN** it requires the same explicit instruction as any other mutating
  check
- **AND** the expectation of refusal does not exempt it, because whether the
  platform still refuses is a claim about the platform

#### Scenario: A new mutating check added later
- **GIVEN** a check is added that reaches a mutating tool without the explicit
  instruction
- **WHEN** the guards run
- **THEN** they fail and name the check and the tool it can reach
