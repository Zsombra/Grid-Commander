## MODIFIED Requirements

### Requirement: Why An Agent Did Not Trade Is Readable

The product SHALL show, for one agent, the three stages at which a trade
candidate can end: candidates the pipeline stopped — with the stage the
platform names, its reason code, and the quantified detail behind it;
evaluations that ran — with the aggregate score against the threshold in
force, the dominant bias, and the terminal status; and decisions the agent
reached — with its direction, conviction, the reasoning it wrote, and
**the per-signal checklist that reasoning was drawn from**. Each stage
SHALL be able to be empty or unreadable on its own without hiding the
others, and an empty stage SHALL say what its emptiness means rather than
render as blank.

Each checklist entry SHALL carry the platform's own verdict — `CONFIRM`,
`WARN`, `REJECT` or any other value it sends — without collapsing it to a
two-state pass/fail, and SHALL carry that signal's written interpretation
unparaphrased. A decision SHALL also show what it would have staked
(position size and preset), the horizon and volatility it was sized
against, and, where the platform gives them, the exchange order ids that
link the decision to what was actually placed.

**A stopped candidate SHALL NOT be described as one that was never
evaluated.** The platform's own account of this changed: what it once called
pre-signal rejections it now describes as every evaluation that ended without
a trade decision, of which some ended *after* the model was called. The
product therefore SHALL pass through the stage the platform names and SHALL
NOT assert, in prose or in a contract comment, where in the pipeline a
candidate stopped.

#### Scenario: A silent agent explained
- **GIVEN** an agent whose candidates the pipeline stopped
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

#### Scenario: The evidence behind a decision
- **GIVEN** a decision whose checklist holds signals that confirmed and
  signals that rejected
- **WHEN** the decision renders
- **THEN** each signal is shown with its own verdict and the platform's
  written interpretation of it
- **AND** a verdict that is neither confirm nor reject is shown as the
  platform stated it, not folded into either

#### Scenario: A decision that carries no checklist
- **GIVEN** a decision the platform sent without checklist entries
- **WHEN** the decision renders
- **THEN** the decision is still shown with its reasoning
- **AND** no empty evidence list is rendered
