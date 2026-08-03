# agent-comparison (delta)

## ADDED Requirements

### Requirement: One Evaluation's Scorecard Is Legible

The product SHALL show, for one public evaluation, every signal the agent
consulted — not only those that fired — with, for each: the module it
belongs to, whether it triggered, its score, its bias and direction,
whether it was primary or required, and the platform's own written
description of what it saw. Signals SHALL be grouped by module, and those
that triggered SHALL be distinguishable from those that did not.

The product SHALL also show how the aggregate score was composed, where
the platform attributes it, and the chain the candidate followed from gate
through attempt, decision, execution and outcome.

#### Scenario: An evaluation is opened
- **GIVEN** a public evaluation with signals the agent consulted
- **WHEN** the user opens it
- **THEN** every consulted signal is shown, grouped by module
- **AND** each shows the platform's own description of what it saw

#### Scenario: Signals that did not fire
- **GIVEN** an evaluation in which most consulted signals did not trigger
- **WHEN** it renders
- **THEN** the untriggered signals are shown alongside the triggered ones
- **AND** the two are distinguishable

#### Scenario: How the score was built
- **GIVEN** an evaluation whose platform attributes its aggregate score
- **WHEN** it renders
- **THEN** each contributing signal's share is shown

#### Scenario: The chain a candidate followed
- **GIVEN** an evaluation that reached a decision
- **WHEN** it renders
- **THEN** the attempt's result, the decision, and any execution and
  outcome are shown in that order
- **AND** a stage the platform did not record is omitted rather than shown
  as an empty one

### Requirement: An Evaluation Without Published Detail Says So

Where the platform lists an evaluation but publishes no detail for it, the
product SHALL say that no detail is published, distinctly from a failure to
read. It SHALL NOT hide the link on a prediction about which evaluations
will resolve.

#### Scenario: A listed evaluation with no detail
- **GIVEN** an evaluation the platform lists but returns no detail for
- **WHEN** the user opens it
- **THEN** the page says BattleGrid publishes no detail for it
- **AND** does not report it as unreadable

#### Scenario: Every listed evaluation is openable
- **GIVEN** a competitor's list of evaluations
- **WHEN** the list renders
- **THEN** every evaluation offers a way to open it

### Requirement: Owner-Private Telemetry Is Never Rendered

The product SHALL NOT read or display the owner-only fields the platform
nulls on a public evaluation, and SHALL NOT render a placeholder in their
place.

#### Scenario: Owner-only reasoning is withheld
- **GIVEN** a public evaluation whose owner-only telemetry is nulled
- **WHEN** it renders
- **THEN** no empty reasoning slot is shown
