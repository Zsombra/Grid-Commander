## ADDED Requirements

### Requirement: The Record Is Trimmed By Run, With Ceremony, Stating What Becomes Unknowable
Grid-Commander SHALL offer an age-based trim of the signal record that removes
whole runs — every capture, failure and reading belonging to runs started
before a chosen moment — through the same describe→confirm→perform ceremony as
its other destructive acts. The description SHALL state what becomes
unknowable: how many runs, captures and failed attempts go, across which
coins, spanning which dates, and that nothing trimmed can ever be re-recorded.

The boundary is the run, not the row, because coverage derives gaps from runs:
rows deleted out from under a surviving run would leave the record claiming
attempts whose findings are invisible.

The trim SHALL be scoped to the acting account, and the confirmation SHALL be
bound to the boundary and the described extent, so agreement to one trim
cannot authorise a different one.

#### Scenario: The trim is described before it is offered
- **WHEN** an operator chooses a boundary date
- **THEN** the page states the runs, captures, failed attempts, coins and date
  span that would go
- **AND** states that the trimmed span re-widens every gap it covered and can
  never be re-recorded

#### Scenario: The perform requires the minted confirmation
- **WHEN** the trim is submitted without a confirmation, or with one minted
  for a different boundary or extent
- **THEN** nothing is deleted and the refusal says why

#### Scenario: Only the described span goes
- **WHEN** a confirmed trim runs
- **THEN** runs started before the boundary are removed with their captures,
  failures and readings
- **AND** every run started at or after the boundary survives untouched
- **AND** the outcome states what was removed

#### Scenario: Another account's record is out of reach
- **WHEN** a trim runs for one account
- **THEN** rows belonging to any other account are untouched, enforced in the
  query's own scope rather than checked afterwards

#### Scenario: A describe is never a perform
- **WHEN** the trim page renders its description
- **THEN** nothing is deleted, however many times it renders
