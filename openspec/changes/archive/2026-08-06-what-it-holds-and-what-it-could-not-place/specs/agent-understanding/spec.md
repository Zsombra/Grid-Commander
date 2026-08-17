# agent-understanding — delta

## ADDED Requirements

### Requirement: What An Agent Is Holding Right Now Is Shown Where The Agent Is Read
Grid-Commander SHALL show, for an agent with an open position, what it is
holding — the market, the direction, what was staked and what the position is
worth now — on the surface where that agent is read.

Every money surface in this product looks backwards. `/trades` reports closed
trades and `/pipeline` reports decisions already made. An agent can be holding
live capital, at leverage, with a stop that has moved since it was opened, and
no surface says so. It is the first thing an operator would look for.

Every figure SHALL come from the platform. Mark price, unrealized P&L, return
on equity, margin and liquidation price are all published, and a product that
recomputed any of them from an entry price would disagree with the exchange the
moment the platform changed how it marks.

Where the platform reports a position it could not price, the unpriced figures
SHALL be shown as unknown and SHALL NOT be rendered as zero. The platform
counts these separately; a position whose value could not be read is not a
position worth nothing.

The position's **effective** stop and target SHALL be shown as the current
ones, and labelled so. Position management moves them after the decision that
opened the trade, so a surface presenting the decided values as current
understates the protection in force.

The time the position was priced SHALL be stated. The platform declares how
often a client should re-read; a rendered page is a snapshot and SHALL NOT
present itself as live.

#### Scenario: An agent holding a position
- **GIVEN** an agent with one open position
- **WHEN** the user reads that agent
- **THEN** the market, direction, notional, leverage and margin are shown
- **AND** the unrealized result is shown as the platform reported it
- **AND** the time it was priced is stated

#### Scenario: A position the platform could not price
- **GIVEN** an open position with no mark price
- **WHEN** it renders
- **THEN** its unrealized result is shown as unknown
- **AND** is not shown as zero

#### Scenario: A stop that has moved since the decision
- **GIVEN** a position whose effective stop differs from the one decided
- **WHEN** it renders
- **THEN** the effective stop is shown as the current one
- **AND** it is labelled as current rather than as the decided value

#### Scenario: An agent holding nothing
- **GIVEN** an agent with no open position
- **WHEN** the user reads it
- **THEN** the surface says it is holding nothing
- **AND** that is distinguished from positions that could not be read

#### Scenario: Positions that cannot be read
- **GIVEN** the platform does not answer the position read
- **WHEN** the surface renders
- **THEN** it says what the agent is holding could not be read
- **AND** does not report that it is holding nothing

### Requirement: Entries That Never Became An Order Are Stated As A Finding
Where an agent's decisions to enter did not result in orders, Grid-Commander
SHALL state how many of them failed, against how many were decided, on the
surface where the agent is read.

The counts are already read — the funnel carries executed, failed and expired
against the entries decided — and already rendered as a row of statistics. A
row of statistics is where 28 looks like a number. An agent that decided sixty
entries, ran a model call for each, and saw twenty-eight of them never reach
the exchange is not having a quiet week; it is failing at the last step, and
the figure only means something when it is stated against the total.

Where more entries failed than succeeded, the product SHALL say so plainly.
That comparison is the platform's own two counts set against each other, not a
threshold this product chose.

Grid-Commander SHALL NOT state a reason for an individual failed entry. The
platform sends none — a failed decision carries an execution time and no order
id, and that absence is the whole of the evidence.

Where the product shows a fill rate the platform computed, it SHALL be
attributed to the platform and SHALL NOT be presented as the same figure as the
counts, which are computed differently.

#### Scenario: Entries that failed
- **GIVEN** an agent whose decisions include failed entries
- **WHEN** the user reads the agent
- **THEN** how many failed is shown against how many were decided

#### Scenario: More failed than succeeded
- **GIVEN** an agent with more failed entries than executed ones
- **WHEN** the surface renders
- **THEN** it states that failing is the more common outcome

#### Scenario: An agent whose entries all became orders
- **GIVEN** an agent with no failed entries
- **WHEN** the surface renders
- **THEN** no failure finding is stated

#### Scenario: A failure with no reason attached
- **GIVEN** a failed entry the platform sent without any explanation
- **WHEN** the failures are described
- **THEN** no cause is asserted for it
