## MODIFIED Requirements

### Requirement: A Strategy Can Be Read In Full
Grid-Commander SHALL be able to present everything a strategy is made of — what
it reads, how it reasons, when it acts, what it weighs, the conditions that
gate direction, and the trade-level policy that governs its trades — and MUST
NOT present a summary as though it were the whole.

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
- **AND** they see the trade-level policy — the stop-loss floor, the stop-loss
  ceiling, and the risk:reward minimum

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

### Requirement: Trade-Level Policy Is Shown As Platform-Set While Inert
Where the platform's compiler does not process changes to the trade-level
policy fields, Grid-Commander SHALL show the values the strategy carries and
SHALL state that they cannot be changed through this product. It MUST NOT
offer an editing control for a field the compiler silently drops.

This is not a missing feature — it is a guardrail against a dead write path.
The compiler accepts the fields without error and returns them unchanged; the
only signal that they were ignored is the absence of a diff axis. Offering an
edit form that compiles without error, shows no diff, and applies unchanged
values would be indistinguishable from a working control until the operator
checks what was actually written.

The statement SHALL name the cause honestly: the platform declares these fields
but its compiler does not yet process changes to them. It SHALL NOT blame the
product or imply the operator did something wrong.

#### Scenario: The policy is visible on the strategy page
- **GIVEN** a strategy the platform returns with trade-level policy values
- **WHEN** the user views the strategy
- **THEN** the stop-loss floor (as an ATR multiple), the stop-loss ceiling (as
  a percentage), and the risk:reward minimum are shown
- **AND** they are labelled as what they govern

#### Scenario: No editing is offered
- **GIVEN** the compiler does not process policy changes
- **WHEN** the user views the trade-level policy
- **THEN** no editing control is rendered for any policy field
- **AND** the user is told that the values cannot be changed through this
  product while the platform's compiler does not process them

#### Scenario: The values travel through a fork
- **GIVEN** a strategy is forked
- **WHEN** the fork's detail page is viewed
- **THEN** the trade-level policy the fork inherited is shown
- **AND** the same inert-state notice applies
