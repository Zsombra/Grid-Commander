## ADDED Requirements

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
