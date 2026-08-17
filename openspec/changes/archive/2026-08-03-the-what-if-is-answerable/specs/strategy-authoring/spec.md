# strategy-authoring (delta)

## ADDED Requirements

### Requirement: A Weighting Change Can Be Scored Before It Is Saved

The product SHALL let a user change the allocation of the signals that
fired on a real evaluation and see the resulting aggregate score, the
per-signal attribution, and whether the result would cross the gate that
was in force — without saving anything.

The signals offered SHALL be those the evaluation actually fired, at the
allocations actually in force, so the unchanged form reproduces the
evaluation's own score.

#### Scenario: Re-weighting a signal
- **GIVEN** an evaluation whose signals fired at known allocations
- **WHEN** the user changes an allocation and asks for the result
- **THEN** the recomputed aggregate is shown
- **AND** whether it would cross the gate is shown
- **AND** nothing about the strategy or the agent is changed

#### Scenario: The unchanged form reproduces reality
- **GIVEN** an evaluation the user has not re-weighted
- **WHEN** the what-if is offered
- **THEN** the allocations shown are those that were in force

### Requirement: A Simulated Result Is Never Shown As What Happened

Where the product shows a simulated score, it SHALL state that the result
did not occur, and SHALL show it alongside the real score it departs from.
A simulated figure SHALL NOT be rendered in a way that could be read as the
evaluation's own outcome.

#### Scenario: A simulation is labelled
- **GIVEN** a recomputed aggregate
- **WHEN** it renders
- **THEN** it is stated not to have happened
- **AND** the evaluation's real score is shown beside it

### Requirement: An Evaluation The Simulator Cannot Take Says So

Where an evaluation fired more signals than the platform's simulator
accepts, the product SHALL say the evaluation cannot be simulated and why.
It SHALL NOT drop signals to fit.

#### Scenario: Too many signals fired
- **GIVEN** an evaluation that fired more signals than the simulator accepts
- **WHEN** the page renders
- **THEN** it says the evaluation cannot be re-scored, and why
- **AND** no partial simulation is offered

#### Scenario: The platform refuses a simulation
- **GIVEN** the platform refuses a simulation request
- **WHEN** the result renders
- **THEN** the refusal is shown
- **AND** no score is invented in its place
