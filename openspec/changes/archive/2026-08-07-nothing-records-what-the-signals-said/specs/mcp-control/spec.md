## ADDED Requirements

### Requirement: The Recorded Signal History Is Readable By A Model

The MCP surface SHALL let a model read the recorded signal history — per
coin and per signal — and the record's coverage. Every answer serving
recorded readings SHALL carry the capture times and the coverage facts a
human surface shows, so a model reasons over the record as it is, not as a
continuous feed.

An answer covering a window with a recording gap SHALL state the gap, so the
model cannot mistake a hole in recording for a quiet market. An account that
has never captured SHALL be told recording has not started and where it
starts, distinctly from a record that could not be read.

These tools read this product's own store and SHALL follow the surface's
standing rule: nothing here mutates, on BattleGrid or in the record.

#### Scenario: A model reads a coin's recorded history
- **GIVEN** an account with recorded captures
- **WHEN** a model asks for a coin's signal history
- **THEN** it receives the recorded captures with their capture times and
  the platform version each observed

#### Scenario: A gap crosses the boundary as a gap
- **GIVEN** a window containing a recording gap
- **WHEN** a model reads history over that window
- **THEN** the answer states the gap
- **AND** absence of readings is not presented as absence of signal activity

#### Scenario: Recording has not started
- **GIVEN** an account that has never captured
- **WHEN** a model asks for recorded history
- **THEN** it is told recording has not started and how it is started
- **AND** this is distinguishable from a record that could not be read
