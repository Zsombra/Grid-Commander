# mcp-control — delta

## MODIFIED Requirements

### Requirement: A Proposal Is Agreed To Against The World As It Is Then

When an operator opens a recorded proposal, the product SHALL describe the
change **at that moment** — reading the target fresh and rendering the
consequence and confirmation it renders for a change begun in the web app.

A proposal SHALL NOT carry a consequence computed when it was recorded. What
the operator agrees to MUST be bound to the values in force when they agree.

#### Scenario: Opening a proposal
- **GIVEN** a recorded proposal
- **WHEN** the operator opens it
- **THEN** the consequence is computed from the target as it is now
- **AND** the operator sees the same confirmation a web-initiated change shows

#### Scenario: The world moved since the proposal
- **GIVEN** a proposal recorded against a target that has since changed
- **WHEN** the operator opens it
- **THEN** the consequence describes the change against the current values
- **AND** the difference from what was proposed is stated

#### Scenario: The change is no longer possible
- **GIVEN** a proposal whose target has been archived or no longer exists
- **WHEN** the operator opens it
- **THEN** they are told the change can no longer be made, and why
- **AND** no confirmation is offered

#### Scenario: Agreeing performs exactly the ordinary write
- **GIVEN** an operator agreeing to an opened proposal
- **WHEN** the change is performed
- **THEN** it goes through the same confirm-and-perform path as a web-initiated
  change
- **AND** it is recorded in the audit as a write made on the operator's behalf

#### Scenario: A refused agree returns with the reason
- **GIVEN** an operator agreeing to an opened proposal
- **WHEN** the ordinary write refuses the change
- **THEN** the operator is returned to the proposal with the refusal's reason
  shown
- **AND** the proposal is not closed

#### Scenario: The change was made but the proposal was already closed
- **GIVEN** an agree whose write succeeded
- **WHEN** closing the proposal finds it already resolved
- **THEN** the operator is told the change was made, and where to verify it
- **AND** the message is never dropped in a silent redirect
