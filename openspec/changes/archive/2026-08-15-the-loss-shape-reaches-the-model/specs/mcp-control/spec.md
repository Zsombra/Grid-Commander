## ADDED Requirements

### Requirement: How The Loss Arrived Is Readable By A Model

The MCP surface SHALL let a model read how an owned agent's loss behind its
stop arrived: the cumulative realized P&L measured since the agent's budget
baseline and the per-settlement curve, in the same states the human surface
holds. The tool's description SHALL name the span as the budget baseline
and distinguish the reading from the trading record, and an empty curve
SHALL be answered as no settlements yet, distinctly from a reading that
could not be read. The tool reads the platform through the same guarded
path as every other read on this surface and mutates nothing.

#### Scenario: A model reads the loss shape

- **GIVEN** an agent whose performance read answers a signed figure and a
  curve with points
- **WHEN** a model calls the loss-shape tool with the agent id
- **THEN** it receives the realized figure, the curve oldest-first, and the
  settlement count

#### Scenario: Empty and unreadable stay apart over MCP

- **GIVEN** an agent that has settled nothing, and separately a failing
  platform read
- **WHEN** a model asks for each loss shape
- **THEN** the first answer is a loss shape with zero settlements
- **AND** the second says the reading could not be read, with its cause
- **AND** the two answers are distinguishable

#### Scenario: The span is stated where a model reads it

- **WHEN** a model lists the surface's tools
- **THEN** the loss-shape tool's description names the budget baseline as
  the span and points the lifetime question at the trading record
