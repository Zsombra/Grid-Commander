## ADDED Requirements

### Requirement: A Compile Refused For The Strategy's Own Prose Is Named As That
Where BattleGrid refuses a condition edit because the strategy's `marketReadText`
references the condition by marker, the product SHALL say so — naming the marker
the prose used — rather than presenting the platform's refusal text as an
unexplained wall.

The naming SHALL come from the refusal the platform sends, never from reading
the prose. The product does not parse `marketReadText`, does not learn the
marker grammar, and SHALL NOT assert which markers a strategy's prose contains.
Where the platform offers a nearest valid key, that is passed through as the
platform's suggestion; where it offers none, none is invented.

Only a refusal the platform identifies as a market-read marker failure is named
this way. Any other refusal keeps the platform's own words, unclassified —
naming a code whose meaning has not been established would be a guess wearing
the platform's authority.

The edit the operator composed SHALL survive this state, as it survives every
other refusal.

#### Scenario: The prose names the condition being removed
- **GIVEN** a strategy whose market-read prose references a condition by marker
- **WHEN** the operator asks to remove that condition
- **THEN** they are told the strategy's own prose names it, and which marker
- **AND** nothing is written
- **AND** what they composed is still there

#### Scenario: The platform offers a nearest key
- **WHEN** the refusal carries a nearest valid key
- **THEN** it is shown as the platform's suggestion
- **AND** the product offers no suggestion of its own when the platform gives none

#### Scenario: A refusal for any other reason
- **WHEN** the compile is refused for a reason the platform does not identify
  as a market-read marker failure
- **THEN** the refusal is shown in the platform's own words, unclassified

#### Scenario: A refusal that does not parse
- **WHEN** the refusal body is not the structured shape the platform documents
- **THEN** the refusal is still shown in full
- **AND** no marker, path or suggestion is claimed from it
