# agent-comparison (delta)

## ADDED Requirements

### Requirement: One Competitor's Record Is Readable

The product SHALL show, for any public agent in the field, the record
BattleGrid publishes about it: how much it evaluated and how much of that
it acted on, its entry decisions split by outcome, its average score,
conviction and risk-to-reward, its realized result, what it is holding
now, its closed trades, and the evaluations behind them.

Every competitor listed in the field SHALL be openable from the field.

Each of these reads SHALL be able to fail on its own without hiding the
others, and a read that returns nothing SHALL say what its emptiness means
rather than render blank.

#### Scenario: A competitor is opened
- **GIVEN** an agent listed in the field
- **WHEN** the user opens it from the field list
- **THEN** its evaluation and decision counts are shown
- **AND** its realized result and closed trades are shown

#### Scenario: One read fails, the others answer
- **GIVEN** the platform fails to return a competitor's trades
- **WHEN** the page renders
- **THEN** the trades section says it could not be read and why
- **AND** the funnel and evaluations are still shown

#### Scenario: A competitor with no closed trades
- **GIVEN** a competitor whose trade list comes back empty
- **WHEN** the page renders
- **THEN** the page says it has closed no trades
- **AND** does not render an empty table

### Requirement: Withheld Telemetry Is Not Shown As Absent

Where BattleGrid nulls owner-private fields on a public read, the product
SHALL NOT render them as data the agent did not produce. It SHALL either
omit them or say they are not published.

#### Scenario: Owner-only reasoning on a public read
- **GIVEN** a public evaluation whose owner-only telemetry is nulled
- **WHEN** it renders
- **THEN** no empty reasoning is shown as though the agent gave none

### Requirement: Distinct Platform Counters Stay Distinct

Where the platform reports two counters with similar names and different
meanings, the product SHALL NOT sum them, substitute one for the other, or
present them under a single label.

#### Scenario: The two skip counters
- **GIVEN** a competitor with 29 SKIP decisions and 0 SKIPPED terminal
  outcomes
- **WHEN** the funnel renders
- **THEN** the two counts are labelled distinctly
- **AND** neither is shown as the other
