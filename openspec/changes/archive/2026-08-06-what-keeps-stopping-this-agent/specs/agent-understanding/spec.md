# agent-understanding — delta

## ADDED Requirements

### Requirement: A Block That Keeps Repeating Is Reported As A Condition
Where the same reason has stopped an agent more than once, Grid-Commander
SHALL report it as a standing condition — with how many times it occurred, the
window it occurred over, and when it last happened — rather than as a list of
individual events.

An agent stopped ninety-eight times by one reason over a week is not having a
run of bad luck. It is in a state, and the state is what its owner needs to
act on. A list of the ten most recent blocks makes the ninety-eighth look
exactly like the first, which is how an agent can sit unable to trade for a
week while every surface reports normally.

The summary SHALL be derived from the blocks the platform actually returned,
never from a table of which reasons this product believes are permanent. Where
the platform reports more blocks than were read, Grid-Commander SHALL state the
size of the window it summarised and that more exist.

#### Scenario: One reason, many times
- **GIVEN** an agent whose blocks are dominated by a single reason
- **WHEN** the user reads what is stopping it
- **THEN** that reason is shown with its count, its window and its most
  recent occurrence
- **AND** it is presented as an ongoing condition rather than as one event

#### Scenario: A reason that happened once
- **GIVEN** a reason that appears a single time in the history read
- **WHEN** the summary renders
- **THEN** it is shown as a single occurrence
- **AND** is not described as a standing condition

#### Scenario: More blocks than were read
- **GIVEN** the platform reports more blocks than the page returned
- **WHEN** the summary renders
- **THEN** the surface states how many were summarised and how many exist
- **AND** does not present the summary as the agent's whole history

#### Scenario: An agent nothing has stopped
- **GIVEN** an agent with no gate blocks
- **WHEN** the summary renders
- **THEN** the user is told nothing has stopped this agent
- **AND** that is distinguished from a history that could not be read

### Requirement: A Platform Reason Is Shown With Its Own Numbers And Never Reworded
Grid-Commander SHALL render each blocking reason using the quantities the
platform attached to it, and SHALL NOT substitute an explanation of its own for
a reason code it does not recognise.

The platform declares nineteen reason codes and attaches a typed detail to
many of them. `EXCHANGE_MIN_NOTIONAL_UNREACHABLE` carries the equity, the
minimum equity that would clear it, the size preset and the leverage — the
whole arithmetic, computed by the platform. A product that re-derived that
from a balance and a preset would be recomputing an answer it was already
given, and would be wrong the moment the platform changed how it sizes.

Where a detail carries figures, they SHALL be shown as a statement an operator
can act on rather than as raw field names. Where a reason arrives with no
detail at all, it SHALL still be shown with its count and window — a reason the
platform declines to explain is not a reason to hide.

#### Scenario: A reason carrying the arithmetic
- **GIVEN** a block whose detail names the equity and the equity that would
  clear it
- **WHEN** it renders
- **THEN** both figures are shown
- **AND** the figure that would resolve it is identified as such

#### Scenario: A reason carrying nothing
- **GIVEN** a block whose detail is empty
- **WHEN** it renders
- **THEN** the reason and its count are still shown
- **AND** the surface says the platform gave no detail for it

#### Scenario: A reason this product does not recognise
- **GIVEN** a reason code the product has no wording for
- **WHEN** it renders
- **THEN** the platform's code is shown as it was sent
- **AND** any detail that came with it is shown
- **AND** no meaning is asserted for it

#### Scenario: The blocks cannot be read
- **GIVEN** the platform does not answer the block history
- **WHEN** the surface renders
- **THEN** it says what is stopping the agent could not be read
- **AND** does not report that nothing is stopping it
