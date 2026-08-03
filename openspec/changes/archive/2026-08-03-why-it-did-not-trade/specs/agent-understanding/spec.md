# Agent Understanding — Delta

## ADDED Requirements

### Requirement: Why An Agent Did Not Trade Is Readable

The product SHALL show, for one agent, the three stages at which a trade
candidate can end: candidates blocked before signal evaluation — with the
stage, the platform's reason code, and the quantified detail behind it;
evaluations that ran — with the aggregate score against the threshold in
force, the dominant bias, and the terminal status; and decisions the agent
reached — with its direction, conviction, and the reasoning it wrote. Each
stage SHALL be able to be empty or unreadable on its own without hiding
the others, and an empty stage SHALL say what its emptiness means rather
than render as blank.

#### Scenario: A silent agent explained
- **GIVEN** an agent whose candidates were blocked before evaluation
- **WHEN** the user opens why it did not trade
- **THEN** each block shows its stage, the platform's reason code, and the
  numbers behind it
- **AND** the agent's own reasoning is shown for any decision it reached

#### Scenario: An evaluation that was skipped
- **GIVEN** a signal evaluation whose terminal status is not an entry
- **WHEN** the pipeline renders
- **THEN** its aggregate score is shown against the threshold in force
- **AND** the dominant bias and whether signals conflicted are shown

#### Scenario: One stage empty, the others not
- **GIVEN** an agent with evaluations but no gate blocks
- **WHEN** the pipeline renders
- **THEN** the blocks stage says nothing was blocked
- **AND** the evaluations are still shown

#### Scenario: One stage unreadable, the others not
- **GIVEN** the platform fails to answer one stage
- **WHEN** the pipeline renders
- **THEN** that stage says it could not be read and why
- **AND** the stages that answered are still shown
