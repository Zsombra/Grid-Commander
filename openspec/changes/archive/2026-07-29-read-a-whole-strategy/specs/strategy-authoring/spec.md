## ADDED Requirements

### Requirement: A Strategy Can Be Read In Full
Grid-Commander SHALL be able to present everything a strategy is made of — what
it reads, how it reasons, when it acts, and what it weighs — and MUST NOT
present a summary as though it were the whole.

A roster row is a summary by design: it carries a count of sections rather than
the sections. Treating that as the complete picture is how a product ends up
offering to edit a strategy while holding nothing but its name, which is both
useless and misleading about what a change would do.

#### Scenario: Looking at a strategy
- **WHEN** a user opens a strategy
- **THEN** they see its identity, the context sources it reads, the instruction
  it reasons with, the thresholds that decide when it acts, and the signals it
  weighs
- **AND** they see how many agents it governs and how many positions are open
  under it

#### Scenario: A strategy that is archived
- **WHEN** a user opens a private strategy that is not active
- **THEN** it is still readable
- **AND** its inactive state is shown rather than being reported as missing

#### Scenario: A strategy that cannot be read
- **WHEN** the strategy cannot be read from BattleGrid
- **THEN** the user is told it could not be loaded
- **AND** this is distinguished from a strategy that does not exist

#### Scenario: What the summary is for
- **WHEN** the roster is drawn
- **THEN** it uses the summary it already has
- **AND** reading one strategy in full does not become the cost of listing them
