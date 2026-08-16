# Agent Understanding — Delta

## ADDED Requirements

### Requirement: How Full The Exposure Cap Is Shows Beside The Cap Itself

Grid-Commander SHALL show, for an agent whose concurrent-exposure cap is set,
how much of that cap is currently committed and how much remains, beside the cap
itself.

A ceiling shown without its fill reads as headroom the agent does not have. The
cap is not a limit that trips — BattleGrid sizes each new order from what is
left beneath it — so the remaining figure is the one that governs whether the
agent can act at all, and it is the figure the surface currently omits.

Every figure SHALL be the one the platform published, rendered as sent.
Grid-Commander SHALL NOT compute the fill, the remainder, or the proportion
between them from any other reading. `get_agent_budget` resolves them and its
own description instructs that they be rendered and never re-derived; a second
arithmetic here would be a figure about someone's money that the platform never
stated.

Where the platform reports the cap as unconfigured, no fill SHALL be shown —
an unbounded cap has no proportion to be full of, and rendering one as `0%` used
would describe a limit that does not exist.

#### Scenario: An agent with a configured cap
- **GIVEN** an agent whose concurrent-exposure cap is set
- **WHEN** the limits surface renders
- **THEN** the committed margin and the remaining headroom are both shown
- **AND** both are the platform's own figures

#### Scenario: The cap is unconfigured
- **GIVEN** an agent whose exposure gauge reports no configured ceiling
- **WHEN** the limits surface renders
- **THEN** no fill or remainder is shown for it
- **AND** the surface does not describe the cap as empty or unused

#### Scenario: The budget could not be read
- **GIVEN** a budget read that fails while the agent's other readings succeed
- **WHEN** the limits surface renders
- **THEN** the failure is stated with its reason
- **AND** the fill is not rendered as zero
- **AND** the other ceilings on the surface are still shown

### Requirement: The Headroom An Order Is Sized From Is Named As The Sizing Base

Where Grid-Commander shows the headroom remaining under an exposure cap, it
SHALL state that BattleGrid sizes each new entry from that figure, and SHALL
show what the platform reports the current headroom authorizes.

An operator reading a remaining balance will read it as *room to keep going*.
The mechanism is the opposite: the remainder is the base every subsequent order
is computed from, so orders shrink as it falls, and below a threshold the
exchange refuses them without exposure ever being named. Showing the number
without its role invites exactly the reading that makes the failure invisible.

Grid-Commander SHALL NOT project the size of a specific future order.
The platform publishes what the headroom authorizes; it does not publish a
per-preset projection, and computing one would be this product's arithmetic
presented as the platform's fact about money the operator has not yet committed.

#### Scenario: Headroom shown with its role
- **WHEN** the remaining headroom is shown
- **THEN** the surface states that new entries are sized from it
- **AND** shows what the platform reports that headroom authorizes

#### Scenario: No projected order size is shown
- **WHEN** the limits surface renders
- **THEN** no figure is shown for what a specific next entry would stake
- **AND** no exchange minimum is compared against a projected figure

### Requirement: A Platform-Reported Block On An Agent's Budget Is Shown Where The Budget Is Read

Where the platform reports that an agent's budget is blocked or
over-subscribed, Grid-Commander SHALL state that on the surface where the
agent's limits are read, with the platform's own reason and the time it began.

This is the one place the platform names a budget-side stop directly. An agent
that has stopped acting for a reason its own budget read already carries should
not require the operator to find it in a block log.

The reason SHALL be shown as the platform worded it, and Grid-Commander SHALL
NOT substitute an explanation of its own where the platform supplied none.

#### Scenario: The platform reports a block
- **GIVEN** a budget read reporting the agent blocked
- **WHEN** the limits surface renders
- **THEN** the block is stated with the platform's reason and its start time

#### Scenario: The platform reports a block with no reason
- **GIVEN** a budget read reporting the agent blocked and carrying no reason
- **WHEN** the limits surface renders
- **THEN** the block is stated as reported
- **AND** no reason is invented for it

#### Scenario: Nothing is blocked
- **GIVEN** a budget read reporting no block and no over-subscription
- **WHEN** the limits surface renders
- **THEN** no block is described
- **AND** the absence is not rendered as a reassurance the platform did not give
