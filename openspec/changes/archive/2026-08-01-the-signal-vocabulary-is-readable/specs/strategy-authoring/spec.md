# Strategy Authoring — Delta

## ADDED Requirements

### Requirement: The Signal Vocabulary Is Readable

The product SHALL let a user browse every strategy signal the platform
publishes — grouped by module, each with its display name, direction, and
description — and read any one signal's full authoring definition: what it
detects, when it fires, worked examples, best-for and watch-out guidance, its
parameters with bounds and defaults, and the indicators it reads. The
vocabulary is read fresh from the platform; the product MUST NOT hard-code the
signal list. An unreadable vocabulary SHALL be presented as unreadable, never
as an empty library.

#### Scenario: Browsing the signal library
- **GIVEN** a connected account
- **WHEN** the user opens the signal library
- **THEN** every signal the platform lists is shown grouped by its module
- **AND** each shows its display name, direction, and description

#### Scenario: Reading one signal's authoring card
- **GIVEN** the signal library lists `rsi_oversold`
- **WHEN** the user opens that signal
- **THEN** the card states what the signal detects and when it fires
- **AND** shows the platform's worked examples and best-for / watch-out guidance
- **AND** lists each parameter with its bounds, default, and description

#### Scenario: A signal the platform does not list
- **WHEN** the user opens a signal id the platform does not answer for
- **THEN** the page says there is no such signal and offers the library
- **AND** does not render an empty card

#### Scenario: The vocabulary cannot be read
- **GIVEN** the platform does not answer the signal list
- **WHEN** the user opens the signal library
- **THEN** the page says the vocabulary could not be read and why
- **AND** does not render an empty library
