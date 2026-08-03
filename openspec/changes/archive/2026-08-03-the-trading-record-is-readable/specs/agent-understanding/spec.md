# Agent Understanding — Delta

## ADDED Requirements

### Requirement: An Agent's Trading Record Is Readable

The product SHALL show, for one agent, the trades it has closed — newest
first — each with its market, direction, net profit or loss, the fees and
slippage it paid, the leverage and conviction it acted on, why and by whom
it was closed, and how long it was open. Alongside them the product SHALL
show a summary **derived from the trades shown** — how many closed, how
many won, the net total, the fees paid, and the spread of close reasons —
and SHALL label that summary as computed from those trades rather than
published by the platform. An agent with no closed trades SHALL say so; a
record that cannot be read SHALL say that instead.

#### Scenario: The record of a trading agent
- **GIVEN** an agent with closed trades
- **WHEN** the user opens its trading record
- **THEN** each trade shows its market, direction, net P&L, fees,
  slippage, leverage, conviction, close reason, and duration
- **AND** a summary derived from those trades states the count, the wins,
  the net total, and the fees paid
- **AND** the summary is marked as computed from the trades shown

#### Scenario: An agent that has never closed a trade
- **WHEN** the user opens the record of an agent with no closed trades
- **THEN** the page says it has closed none, and does not show a summary
  of zeros as if it were a result

#### Scenario: More trades than one page
- **GIVEN** the platform reports more closed trades than the page holds
- **WHEN** the record renders
- **THEN** the user is told how many there are in total and can reach the
  next page

#### Scenario: A record that cannot be read
- **GIVEN** the platform does not answer
- **WHEN** the user opens the record
- **THEN** the page says the record could not be read and why
- **AND** does not render an empty record
