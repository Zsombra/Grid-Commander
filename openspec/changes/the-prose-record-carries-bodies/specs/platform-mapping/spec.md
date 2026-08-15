## ADDED Requirements

### Requirement: The Record Carries The Prose Surfaces The Server Declares

The committed capabilities record SHALL carry, beside the tool list, every
prose surface the server's handshake and discovery declare: the server
instructions, the body of every listed prompt, and the content of every
listed resource — verbatim, as the server returned them.

A body the server refuses or fails to return SHALL be recorded as a named
failure on that entry. It SHALL NOT be recorded as absent, because an
absent body and a never-fetched body are different facts and only one of
them is a finding. A failed entry SHALL NOT abort the capture of the
others.

#### Scenario: The capture writes the record

- **GIVEN** a keyed capture against the live BattleGrid MCP server
- **WHEN** the capabilities record is written
- **THEN** it carries the server instructions
- **AND** a body for every prompt the server lists
- **AND** a content for every resource the server lists

#### Scenario: A body the server would not return

- **GIVEN** a prompt or resource whose fetch is refused
- **WHEN** the capabilities record is written
- **THEN** that entry carries the failure, named
- **AND** every other entry still carries its body

#### Scenario: A record missing a prose surface

- **GIVEN** a capabilities record carrying tools but missing the
  instructions, a listed prompt's body, or a listed resource's content
- **WHEN** the offline record check runs
- **THEN** it fails, naming the regeneration command

### Requirement: Prose Surface Drift Fails The Live Freshness Guard

The live freshness guard SHALL compare a digest of each recorded prose
surface — the instructions, each prompt body, each resource content —
against the running server, and SHALL fail on any difference, naming
which surface moved.

The instructions are addressed to the connected account by name, so the
comparison SHALL normalise the addressee before digesting. Two operators
holding the same record MUST NOT see different verdicts because the
platform greeted them differently.

#### Scenario: A prompt body changed under an unchanged version

- **GIVEN** a record whose prose was captured at the live server's version
- **AND** the live server now returns that prompt with a different body
- **WHEN** the live guard runs
- **THEN** it fails, naming the prompt

#### Scenario: The same record under a different account

- **GIVEN** a record taken by one account
- **AND** a live server greeting a different account in its instructions
- **WHEN** the live guard compares instructions
- **THEN** the greeting difference alone does not fail the comparison

#### Scenario: No credential is available

- **GIVEN** no BattleGrid credential in the environment
- **WHEN** the suite runs
- **THEN** the live prose comparison is skipped rather than passing
- **AND** the offline check that the record carries the surfaces still
  runs

### Requirement: The Reference Renders What The Record Carries

The human-readable reference SHALL include the server instructions
verbatim, and the body of every recorded prompt and resource, so that the
platform's prose contract is readable in the repository rather than only
over a live connection.

#### Scenario: The reference is regenerated

- **WHEN** the reference is regenerated from a capture
- **THEN** it contains the server instructions in full
- **AND** a body section for every recorded prompt and resource

#### Scenario: The reference and the record disagree

- **GIVEN** a reference missing the instructions or any recorded body
- **WHEN** the offline record check runs
- **THEN** it fails, naming what the reference dropped
