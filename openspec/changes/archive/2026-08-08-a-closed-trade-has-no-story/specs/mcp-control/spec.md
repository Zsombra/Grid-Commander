## ADDED Requirements

### Requirement: A Trade's Story Is Readable By A Model

The MCP surface SHALL let a model read the story of one completed trade on
an owned agent: the frozen chart facts and the position's order-lifecycle
trail, in the same states the human surface holds. An evaluation that never
became a trade, an evaluation that does not exist, an unreadable story and
an unreadable trail SHALL each be answered as themselves — a model must
not be told a trade does not exist because a read failed, nor that a trail
is empty because the chart named no position to ask about.

The tool reads the platform through the same guarded path as every other
read on this surface and mutates nothing.

#### Scenario: A model reads a settled trade's story

- **GIVEN** an agent with a charted settled trade
- **WHEN** a model calls the trade-story tool with the agent and
  evaluation ids
- **THEN** it receives the chart facts, the levels and markers as the
  platform labelled them, and the audit trail's events in the platform's
  order

#### Scenario: The states stay apart over MCP

- **GIVEN** an evaluation that never filled, and separately a failing
  platform read
- **WHEN** a model asks for each story
- **THEN** the first answer says the evaluation never became a trade
- **AND** the second says the story could not be read
- **AND** the two answers are distinguishable
