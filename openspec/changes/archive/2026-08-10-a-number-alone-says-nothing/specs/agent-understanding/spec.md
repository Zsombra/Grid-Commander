# agent-understanding — delta

## ADDED Requirements

### Requirement: A Ceiling Is Shown Against The Platform's Own Default For It
Where BattleGrid declares a default for a capped field, Grid-Commander SHALL
show the agent's value against that default, and SHALL state the departure in
the field's own units.

`maxDailyTrades: 34` is not a reading anyone can act on. Against BattleGrid's
declared default of 10 it is a decision to trade more than three times as often
as the platform suggests, and that is the fact worth surfacing. The gauge beside
it already says how much of the 34 is used; nothing says whether 34 was a
reasonable number to pick.

The default SHALL be read from the platform's own catalog, never from a list of
defaults maintained in this product. A default BattleGrid changes is a default
this surface follows without anyone editing it, and a field the catalog declines
to default SHALL be shown as the agent's value alone rather than against a
number this product invented.

Where the agent's value equals the platform's default, that SHALL be stated as
agreement rather than omitted — a setting nobody changed is a fact about the
agent, and its absence would read as a setting the surface could not check.

**A field read from the agent but no longer set on it SHALL be separated from
those that are, and where it is now set SHALL be named.** BattleGrid's read is
wider than its write, and v15 moved the trade-level policy onto the strategy
while the agent read kept returning it. The comparison stays valuable — a stop
ceiling far under the platform's own default is precisely the reading this
surface exists to give — but presented beside settings the operator can change,
it invites them to change one they cannot. Which fields those are SHALL be
derived from the set a write is assembled from, so a field the platform moves
back needs no edit here.

#### Scenario: A value above the platform's default
- **GIVEN** a capped field whose agent value exceeds the catalog's declared
  default
- **WHEN** the limits surface renders
- **THEN** both the agent's value and the platform's default are shown
- **AND** the departure is stated in the field's own units

#### Scenario: A value the platform has no default for
- **GIVEN** a capped field the catalog declares no default for
- **WHEN** the limits surface renders
- **THEN** the agent's value is shown on its own
- **AND** no comparison figure is invented for it

#### Scenario: A value matching the platform's default
- **GIVEN** an agent value equal to the catalog's declared default
- **WHEN** the limits surface renders
- **THEN** the surface states that the value is the platform's default

#### Scenario: A field the agent carries but cannot set
- **GIVEN** a field the agent's read returns and its write rejects
- **WHEN** the limits surface renders
- **THEN** it is shown apart from the fields the agent still owns
- **AND** the surface says where it is set instead
- **AND** its comparison against the platform's default is still shown

#### Scenario: The catalog could not be read
- **GIVEN** the catalog read fails while the agent's limits read succeeds
- **WHEN** the limits surface renders
- **THEN** the limits are still shown
- **AND** the surface says the platform's defaults could not be read, rather
  than showing the limits as though nothing were missing

### Requirement: An Agent's Realised Exit Geometry Is Stated From Its Own Trades
Grid-Commander SHALL state how an agent's closed trades ended and how far price
actually moved on each kind of ending, derived from the trades themselves.

A stop distance is only meaningful against the size of the moves the agent
actually sees. The platform publishes neither, but it publishes every closed
trade's entry fill, exit fill, direction and close reason — from which the move
on each trade, and the median move at each kind of ending, follow directly. An
agent whose losers all close on a sub-1% move is being stopped by noise, and
that is visible in its own record without any candle history, any external
reference, or any additional platform call.

Each figure SHALL carry the number of trades it was computed over and the window
those trades span. A median over eleven trades and a median over seven hundred
are different claims, and a surface that renders them identically invites the
smaller one to be trusted like the larger. Where fewer trades exist than would
support a median, the surface SHALL show the trades rather than a statistic.

These figures SHALL be labelled as derived by this product. BattleGrid publishes
an aggregate of its own that has answered zeros on agents carrying real losses,
and a figure this product computed and a figure the platform published are
different claims.

**A close reason is not an outcome.** Grid-Commander SHALL NOT report a trade
closed at the platform's stop-loss reason as a loss, nor one closed at its
take-profit reason as a win. A trailed stop can close in profit — observed live,
`HYPE` closed at **+$0.0731** with `closeReason: STOP_LOSS` — so the two are
independent facts and SHALL be derived independently: the ending from
`closeReason`, the result from the trade's net. Collapsing them would report a
protected winner as a loss on the surface built to explain losses.

Grid-Commander SHALL NOT compare these figures against any population constant
recorded in this repository. A measured noise floor is a measurement taken on a
stated date over a stated sample, not a live reading, and presenting one as a
threshold would give the panel a false precision on the exact screen intended to
be trusted in place of the raw setting.

#### Scenario: An agent whose losers close on small moves
- **GIVEN** an agent with closed trades, most of which ended at the platform's
  stop-loss reason
- **WHEN** its record is read
- **THEN** the share of trades ending that way is shown
- **AND** the median realised move for that ending is shown beside it

#### Scenario: Each ending is reported separately
- **GIVEN** trades that ended for more than one reason
- **WHEN** the geometry renders
- **THEN** each reason carries its own count and its own median move
- **AND** reasons are not collapsed into wins and losses

#### Scenario: A sample too small for a median
- **GIVEN** an agent with fewer closed trades than a median would need
- **WHEN** the geometry renders
- **THEN** the individual trades are shown
- **AND** no median is presented

#### Scenario: A trade the platform priced incompletely
- **GIVEN** a closed trade missing its entry or exit fill price
- **WHEN** the geometry is computed
- **THEN** that trade is excluded from the move figures
- **AND** the number excluded is stated

#### Scenario: A stop that closed in profit
- **GIVEN** a trade whose close reason is the platform's stop-loss reason
- **AND** whose net result is positive
- **WHEN** the geometry renders
- **THEN** it is counted under that close reason
- **AND** it is not counted as a loss

#### Scenario: An agent that has closed nothing
- **GIVEN** an agent with no closed trades
- **WHEN** the geometry renders
- **THEN** the user is told it has closed nothing
- **AND** that is distinguished from a record that could not be read

#### Scenario: The record could not be read
- **GIVEN** the trade record read fails
- **WHEN** the surface renders
- **THEN** the failure is stated with its reason
- **AND** the agent's other limit readings are still shown

### Requirement: Position Management Is Read Beside The Position Life It Produced
Where an agent's position management is shown outside the edit flow,
Grid-Commander SHALL show the settings that decide how long a position survives
— whether trailing is on, whether time decay is on — beside how long that
agent's positions have actually lasted.

A preset name is a label supplied alongside fourteen independent values, and
`WALTHER` on its own tells an operator nothing about whether their positions are
being closed early. Trailing and time decay are the two switches that force an
exit before the payoff geometry resolves, and whether they are doing so is
answerable from the agent's own closed trades — the same record the exit
geometry is derived from, needing no additional read.

Where drift between an agent's values and the preset it names is shown, it SHALL
follow the contract `agent-authoring` already sets for it rather than defining a
second one; this requirement adds the realised life beside the settings, and
does not restate what naming drift means.

#### Scenario: Management shown against realised position life
- **GIVEN** an agent with closed trades and position management enabled
- **WHEN** the surface renders
- **THEN** the trailing and time-decay settings are shown
- **AND** the agent's median position life is shown beside them

#### Scenario: Management on an agent that has closed nothing
- **GIVEN** an agent with position management enabled and no closed trades
- **WHEN** the surface renders
- **THEN** the settings are shown
- **AND** no position life is claimed for them

#### Scenario: Management the platform reports as off
- **GIVEN** an agent whose position management is not enabled
- **WHEN** the surface renders
- **THEN** that is stated
- **AND** the trailing and time-decay values are not presented as governing
  anything
