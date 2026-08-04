# strategy-authoring (delta)

## MODIFIED Requirements

### Requirement: A Strategy Can Be Read In Full
Grid-Commander SHALL be able to present everything a strategy is made of — what
it reads, how it reasons, when it acts, what it weighs, and the conditions that
gate direction — and MUST NOT present a summary as though it were the whole.

A roster row is a summary by design: it carries a count of sections rather than
the sections. Treating that as the complete picture is how a product ends up
offering to edit a strategy while holding nothing but its name, which is both
useless and misleading about what a change would do.

Conditions are part of "everything" for the same reason. A strategy whose
direction is decided by a negated flow filter, shown without that filter, is not
under-described — it is described wrongly, and the operator who retunes it from
that view is working blind to the thing that acts.

#### Scenario: Looking at a strategy
- **WHEN** a user opens a strategy
- **THEN** they see its identity, the context sources it reads, the instruction
  it reasons with, the thresholds that decide when it acts, and the signals it
  weighs
- **AND** they see the conditions the strategy defines, if it defines any
- **AND** they see how many agents it governs and how many positions are open
  under it

#### Scenario: A strategy that defines no conditions
- **WHEN** a user opens a strategy whose condition list is empty
- **THEN** the strategy is shown as having no conditions
- **AND** this is distinguished from a strategy whose conditions could not be
  read

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

## ADDED Requirements

### Requirement: A Condition Is Shown As The Structure It Is

Grid-Commander SHALL present a condition's definition as readable structure
rather than as the payload it arrived in: each comparison stated in words
against the column it reads, each grouping stating how many of its members must
hold, a negation shown as negating, and a reference to another condition shown
by the name of the condition it refers to.

A condition can nest arbitrarily. The presentation MUST show that nesting rather
than flattening it, because a member of a group and a member of a group inside a
`NOT` mean opposite things.

#### Scenario: A comparison against a column
- **GIVEN** a condition comparing a report column to a value or a label
- **WHEN** it is shown
- **THEN** the column it reads, the comparison, and the value or label are
  legible without reading the underlying payload

#### Scenario: A threshold group
- **GIVEN** a condition requiring some number of its members to hold
- **WHEN** it is shown
- **THEN** how many must hold, and out of how many, is stated

#### Scenario: A negation
- **GIVEN** a condition containing a negated member
- **WHEN** it is shown
- **THEN** the negation is visible as part of the structure
- **AND** the negated member is not presented as a requirement that must hold

#### Scenario: A reference to another condition
- **GIVEN** a condition referring to another condition by key
- **WHEN** it is shown
- **THEN** it names the condition referred to
- **AND** a reference whose target is not present in the strategy is shown as
  unresolved rather than silently omitted

#### Scenario: A form the product does not recognise
- **GIVEN** a condition using a form this product does not model
- **WHEN** it is shown
- **THEN** the strategy still renders
- **AND** the unrecognised part is reported as not understood rather than
  dropped or guessed at

### Requirement: A Named Building Block Is Never Shown As A Directional Call

A condition that carries no verdict SHALL be presented as a named building block
— something other conditions refer to — and MUST NOT be presented as a way the
strategy decides direction.

Where conditions are listed, the ones that decide direction SHALL be
distinguishable from the ones that only assemble into them.

#### Scenario: A strategy mixing building blocks and calls
- **GIVEN** a strategy with conditions that carry verdicts and conditions that
  do not
- **WHEN** its conditions are shown
- **THEN** the ones carrying a verdict are distinguishable from the ones that do
  not
- **AND** the count of ways the strategy decides direction does not include the
  building blocks

#### Scenario: A verdict of neither
- **GIVEN** a condition whose verdict is neither up nor down
- **WHEN** it is shown
- **THEN** it is shown as a directional call that resolves to neither
- **AND** it is not shown as a building block

### Requirement: A Resolved Condition Is Shown Only Where The Platform Resolves It

Where BattleGrid reports whether a condition held, Grid-Commander SHALL show
that outcome alongside the condition. Where BattleGrid does not report it, the
product SHALL say the outcome is not available rather than presenting the
definition as though it were an outcome.

Grid-Commander MUST NOT evaluate a condition itself. The columns a condition
reads are resolved by the platform against market data this product does not
hold, and a locally computed verdict would be a different claim wearing the
platform's authority.

#### Scenario: The platform reports outcomes
- **GIVEN** a surface where BattleGrid resolves a strategy's conditions
- **WHEN** the user views it
- **THEN** each condition's reported outcome is shown against that condition

#### Scenario: The platform reports no outcome
- **GIVEN** a surface showing conditions where BattleGrid reports no outcome
- **WHEN** the user views it
- **THEN** the conditions are shown as definitions
- **AND** the absence of an outcome is stated rather than left to be inferred

#### Scenario: Outcomes that name conditions the strategy does not define
- **GIVEN** reported outcomes referring to a condition absent from the strategy
- **WHEN** they are shown
- **THEN** the mismatch is reported
- **AND** the outcome is not silently attached to an unrelated condition

#### Scenario: Nothing is computed locally
- **WHEN** any condition is shown
- **THEN** no verdict is derived by this product from column values
