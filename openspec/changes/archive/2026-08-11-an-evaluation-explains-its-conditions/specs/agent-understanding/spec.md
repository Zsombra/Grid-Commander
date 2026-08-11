# Agent Understanding — Delta

## ADDED Requirements

### Requirement: An Evaluation's Condition Verdicts Are Shown With Their Evidence

Where the platform publishes a condition evaluation on an agent's own
evaluation, Grid-Commander SHALL show each condition's verdict together
with the platform's evidence for it — the observed value beside the
threshold, per clause, in the platform's own words and numbers. The
comparison SHALL be the platform's, never recomputed: this product renders
what was measured against what was demanded, and does not evaluate the
condition itself.

Where the platform publishes no condition evaluation, the surface SHALL
show nothing invented for it — no empty list, no "all conditions passed".
A platform that published nothing and a strategy whose conditions all held
are different facts.

Fields the platform has only ever been observed publishing as null —
the deciding verdict and its decider — SHALL be carried verbatim and
rendered only when the platform says something, never interpreted or
defaulted.

#### Scenario: A populated condition evaluation
- **GIVEN** an evaluation whose detail carries a condition evaluation
- **WHEN** the evaluation page renders
- **THEN** each condition appears with its name and the platform's verdict
- **AND** each clause shows the observed value beside the threshold it was
  held to, and that clause's own outcome
- **AND** the tally of true, total and unresolved conditions is shown
- **AND** the strategy revision the conditions came from is named

#### Scenario: A condition the platform did not name
- **GIVEN** a condition outcome row without its condition key
- **WHEN** the detail is mapped
- **THEN** that row is dropped rather than shown nameless
- **AND** the named rows still render

#### Scenario: No condition evaluation published
- **GIVEN** an evaluation whose detail carries no condition evaluation
- **WHEN** the evaluation page renders
- **THEN** no condition section appears
- **AND** nothing claims the conditions passed or were absent

#### Scenario: The deciding branch, unobserved
- **GIVEN** a condition evaluation whose verdict and decider are null
- **WHEN** the evaluation page renders
- **THEN** neither is rendered as a value or interpreted as an outcome
- **AND** a future payload that does carry them renders the platform's own
  words verbatim
