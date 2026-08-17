## ADDED Requirements

### Requirement: A Taken Name Is Refused Before It Is Sent
Where the fork perform can see, in the same listing it re-reads at submit
time, that the name the copy would receive — the chosen name, or the default
name the platform would assign — exactly matches a strategy the user already
owns, it SHALL refuse before sending the fork. The refusal SHALL name the
colliding name, SHALL keep what the user typed, and SHALL say what the
platform's answer to that submission would have been, as a measured fact
about the platform rather than a diagnosis of any response.

The pre-flight SHALL cover only the user's own strategies. A name matching
only a SYSTEM strategy MUST NOT be pre-refused: that collision has never been
measured, and refusing it could block a copy the platform would accept.

The pre-flight narrows the road to the platform's unexplained error; it MUST
NOT be treated as closing it. A fork that passes the pre-flight and is
refused by the platform anyway SHALL render the platform's answer whole and
unglossed, exactly as a refusal renders today.

#### Scenario: The default name collides with an earlier copy
- **GIVEN** the user already owns a strategy named "X (fork)"
- **WHEN** they submit a fork of X with the name left blank
- **THEN** nothing is sent
- **AND** they are returned to the form with a reason naming "X (fork)" as
  already theirs and pointing at typing a name of their own

#### Scenario: A chosen name is already theirs
- **GIVEN** the user owns a strategy named "Y"
- **WHEN** they submit a fork with the name "Y"
- **THEN** nothing is sent
- **AND** the reason names "Y" and the typed name is kept in the form

#### Scenario: A SYSTEM name is not pre-refused
- **GIVEN** the chosen name matches a SYSTEM strategy and none of the user's
  own
- **WHEN** they submit the fork
- **THEN** the fork is sent, and whatever the platform answers is rendered as
  it answers it

#### Scenario: The race is still the platform's to answer
- **GIVEN** the pre-flight found no collision
- **WHEN** the platform refuses the fork anyway
- **THEN** the platform's answer renders whole and unglossed, with the typed
  name kept
