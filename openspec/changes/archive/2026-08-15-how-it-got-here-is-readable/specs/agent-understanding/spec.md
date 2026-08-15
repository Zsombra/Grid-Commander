## ADDED Requirements

### Requirement: How The Loss Behind The Stop Arrived Is Readable
Where the product shows the distance to an agent's total-loss stop, it SHALL
also show the platform's own account of how that loss arrived: the cumulative
realized P&L measured since the agent's budget baseline, and the
per-settlement curve it moved along, both from the platform's performance
read (`mcp:read`, read-only, not destructive). The reading SHALL name its
span as the budget baseline, and SHALL NOT be combined with or presented as
the lifetime trading record, which measures a different span from different
data.

The distance alone is not the reading. 1.90 of a stop of 6 reads identically
whether it arrived in one settlement or drifted across forty-one, and those
are different agents to the person deciding whether to intervene.

#### Scenario: A curve with settlements renders as a shape
- **GIVEN** an agent whose performance read answers a signed realized figure
  and a curve carrying points
- **WHEN** the operator opens what would stop this agent
- **THEN** the realized figure renders with the curve drawn oldest-first
- **AND** the caption names the span as since the budget baseline

#### Scenario: An empty curve means nothing has settled
- **GIVEN** an agent whose performance read answers an empty curve
- **WHEN** the operator opens what would stop this agent
- **THEN** the section states that nothing has settled yet
- **AND** the empty curve is not rendered as an error or as missing data

#### Scenario: The performance read fails on its own
- **GIVEN** a performance read the platform refuses or that fails in
  transport
- **WHEN** the operator opens what would stop this agent
- **THEN** the gauges, warnings, and halt state still render from their own
  read
- **AND** the loss-shape section says what could not be read and why

#### Scenario: The two accounts of the money are never conflated
- **GIVEN** an agent with both a trading record and a performance reading
- **WHEN** either is rendered
- **THEN** each names its own span and source
- **AND** no surface presents a single figure combining them
