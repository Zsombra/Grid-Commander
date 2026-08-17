## ADDED Requirements

### Requirement: A Closed Trade's Unfolding Is Readable

The product SHALL show, for a trade an owned agent completed, the platform's
frozen chart of that trade: the candle series it froze, the protection levels
it placed on it, and its entry and exit markers — every figure the
platform's own, with the freeze time stated.

The platform discriminates this read three ways and the product SHALL keep
all three apart: a story to show, an evaluation that never became a filled
trade, and an evaluation that does not exist on that agent. None of the
three is a read failure, and a read failure is none of the three.

The chart's protection levels are the levels **as placed**. Where the
product also shows how protection moved afterwards, the placed levels SHALL
be labelled as placed — one word meaning two prices on one page is the
mistake this capability already refuses on the pipeline and position
surfaces.

Levels and markers SHALL be rendered from what the platform sent — its
display labels, its roles — and a role this product does not recognise is
still drawn and named, not dropped.

#### Scenario: A settled trade shows its chart

- **GIVEN** an agent with a settled trade whose evaluation the platform
  charted
- **WHEN** the operator opens that trade's story
- **THEN** the candle series is drawn with the platform's levels and
  markers placed on it, each labelled with the platform's own words
- **AND** the page states when the platform froze the snapshot

#### Scenario: An evaluation that never filled has no chart and says so

- **GIVEN** an evaluation that never reached a filled trade
- **WHEN** its story is opened
- **THEN** the page says the evaluation never became a trade
- **AND** this is not presented as an error

#### Scenario: A story that cannot be read says so

- **GIVEN** a platform failure on the chart read
- **WHEN** the story is opened
- **THEN** the page says the story could not be read and why
- **AND** it is not presented as a trade that does not exist

#### Scenario: The trades list links each trade to its story

- **GIVEN** the closed-trades list
- **WHEN** a trade carries the evaluation id that addresses its story
- **THEN** the row links to that trade's story page

### Requirement: The Protection That Moved Is Shown Moving

The product SHALL show the platform's order-lifecycle audit trail for a
trade's position: placements, fills, reprices, cancellations and terminal
events, in the platform's order, in the platform's vocabulary. A reprice
SHALL carry both prices, the platform's own delta, and the platform's
judgement of whether the move improved protection — this is the only
surface where an operator can see position management act, and the
evidence is the platform's, never recomputed.

Audit prices arrive as decimal strings and SHALL be carried and shown as
sent — reformatting a price the platform chose to express exactly is a
derivation this surface does not need.

The audit trail SHALL fail independently of the chart: a story whose trail
cannot be read still shows its chart and says the trail is unreadable; a
chart that names no position says the trail has no address, which is not an
empty trail.

#### Scenario: A trailed stop is visible as a sequence of moves

- **GIVEN** a settled trade whose stop was repriced while it was open
- **WHEN** the operator opens the trade's story
- **THEN** every reprice is listed with its from and to prices, the
  platform's delta, its source, and whether the platform judged it an
  improvement

#### Scenario: An unreadable trail does not take the chart down

- **GIVEN** a chart that answers and an audit read that fails
- **WHEN** the story is opened
- **THEN** the chart is shown
- **AND** the trail is reported unreadable with the platform's reason
- **AND** it is not presented as a trail with no events

#### Scenario: A trail with no address is not an empty trail

- **GIVEN** a chart that names no position
- **WHEN** the story is opened
- **THEN** the page says the platform named no position to ask about
- **AND** this is distinguishable from a position whose trail has no events

#### Scenario: An unrecognised event kind is still shown

- **GIVEN** an audit event whose kind this product does not recognise
- **WHEN** the trail is rendered
- **THEN** the event appears in sequence with its kind named as the
  platform sent it
