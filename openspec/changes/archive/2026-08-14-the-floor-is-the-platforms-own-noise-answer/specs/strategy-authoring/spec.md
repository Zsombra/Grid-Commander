## MODIFIED Requirements

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

Where the stop-loss floor arrives as an ATR multiple, Grid-Commander SHALL
present it as what the platform's declaration makes it: the platform's own
volatility-relative reading of where ordinary market movement ends — a stop
closer than that multiple of the ATR sits inside ordinary movement, by the
platform's own declaration. The presentation SHALL claim the declaration only:
it MUST NOT state or imply that the platform enforces the floor on live
trades, because enforcement has not been observed and the fleet's realized
record is evidence against assuming it.

The panel SHALL name where the measured half of the comparison lives — the
realized moves derived from an agent's own closed trades on that agent's
trading record — and MUST NOT compute or render a realized-move figure on the
strategy page itself.

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

#### Scenario: The floor is read as the platform's own noise reference
- **GIVEN** a strategy whose trade-level policy carries a stop-loss floor as an
  ATR multiple
- **WHEN** the user views the trade-level policy
- **THEN** the floor is presented as the platform's own volatility-relative
  statement — a stop closer than that multiple of the ATR is inside ordinary
  market movement, by the platform's own declaration
- **AND** the statement attributes the reading to the platform's declaration
  and does not state or imply that the platform enforces the floor on live
  trades

#### Scenario: The measured half is named, not duplicated
- **WHEN** the user views the trade-level policy
- **THEN** the panel names the agent's trading record as where realized moves
  are measured from its own closed trades
- **AND** no realized-move figure is computed or rendered on the strategy page
