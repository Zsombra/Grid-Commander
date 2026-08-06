# agent-understanding — delta

## MODIFIED Requirements

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

Where the decision that opened a position can be found, the stop and target
**as that decision set them** SHALL be shown beside the effective ones, and
each SHALL be labelled with the moment it belongs to. The effective stop alone
answers *where is my protection* and hides *has anything moved it* — which is
the question an operator who has configured position management actually has,
and the only evidence on any surface that those settings ever act. The
decision is matched to the position by the identifier the position already
carries; no figure here is derived from any other.

Where the effective stop differs from the decided one, the product SHALL state
which way it moved — whether the position is now protected more than the
decision asked for, or less. A pair of numbers without that reading is a
puzzle, and read backwards it is the opposite of the truth on the surface where
that matters most: a long is protected by a stop that rises and a short by one
that falls. Where the platform reports a side the product cannot read a
direction from, both values SHALL still be shown and no direction SHALL be
claimed.

Grid-Commander SHALL NOT claim a direction for a target that moved. A
take-profit in a new place is a different exit, not more or less protection,
and naming it either would be this product's reading rather than the
platform's.

Where the decision behind a position cannot be found — because the decision
read did not answer, or because the decision has aged out of the window read —
the decided values SHALL be stated as unknown and the position SHALL NOT be
presented as one whose stop has not moved. The reads SHALL remain independent:
a decision list that could not be read SHALL cost every position its decided
values and SHALL NOT blank a position that answered.

The time the position was priced SHALL be stated, and **how long ago that was**
SHALL be stated with it. The platform declares how often a client should
re-read; a rendered page is a snapshot and SHALL NOT present itself as live. A
timestamp alone leaves the reader to do the arithmetic that turns it into
staleness, so a page held open for four minutes on a leveraged position reads
exactly like one opened a second ago.

Where the platform states no priced-at time, the surface SHALL still say the
figures are a snapshot rather than fall silent — a read that cannot say when it
was taken is more of a snapshot, not less. Where the priced-at time is later
than this product's own clock reads, the surface SHALL state the time and
SHALL NOT claim an age for it: two machines keep two clocks, and a negative age
rendered as a number would be this product's arithmetic presented as the
platform's fact.

The surface SHALL offer a way to read the figures again, and that way SHALL NOT
imply the page updates itself. A page that states its own staleness and offers
nothing to do about it reports a problem it does not let the reader solve.

#### Scenario: An agent holding a position
- **GIVEN** an agent with one open position
- **WHEN** the user reads that agent
- **THEN** the market, direction, notional, leverage and margin are shown
- **AND** the unrealized result is shown as the platform reported it
- **AND** the time it was priced is stated
- **AND** how long ago that was is stated with it

#### Scenario: A page read four minutes after it was priced
- **GIVEN** an agent holding a position priced four minutes before the page renders
- **WHEN** the surface renders
- **THEN** it states how long ago the figures were priced
- **AND** it still states the priced-at time itself
- **AND** it offers a way to read the figures again
- **AND** it does not present itself as live

#### Scenario: A priced-at time the platform did not state
- **GIVEN** an open position whose read carries no priced-at time
- **WHEN** the surface renders
- **THEN** the surface says the platform did not say when it was priced
- **AND** it still says the figures are a snapshot rather than a live reading

#### Scenario: A priced-at time later than this product's clock
- **GIVEN** a priced-at time ahead of the clock this product renders against
- **WHEN** the surface renders
- **THEN** the priced-at time is stated
- **AND** no age is claimed for it

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

#### Scenario: The stop the decision set, beside the stop now
- **GIVEN** an open position whose entry decision can be found
- **AND** whose effective stop differs from the stop that decision recorded
- **WHEN** it renders
- **THEN** both values are shown, each labelled as decided or as current
- **AND** the move is stated as protecting more of the position, or less,
  according to the side of the trade

#### Scenario: A stop that has not moved
- **GIVEN** an open position whose effective stop equals the one its decision
  recorded
- **WHEN** it renders
- **THEN** no drift is reported for it

#### Scenario: The decision behind a position cannot be found
- **GIVEN** an open position whose entry decision is not among those read
- **WHEN** it renders
- **THEN** the decided stop is stated as unknown
- **AND** the position is not presented as one whose stop has not moved

#### Scenario: The decision list cannot be read while the position answers
- **GIVEN** the platform does not answer the entry-decision read
- **AND** the position read answered
- **WHEN** the surface renders
- **THEN** the position is still shown with every figure the platform sent
- **AND** the decided values are stated as unknown

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
