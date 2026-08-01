# Strategy Authoring — Delta

## ADDED Requirements

### Requirement: The Metric Vocabulary Is Navigable

The product SHALL let a user browse every report metric the platform
publishes — grouped by family, each with its label, native output contract
(unit, precision, range where declared), and the transforms it legally
takes — and read any one metric's full card: the native contract plus every
transform's parameters with defaults and descriptions, its formula and
calculation summary, its null behavior, and what it can chain into. The
vocabulary is read fresh from the platform; the product MUST NOT hard-code
the metric list. An unreadable vocabulary SHALL be presented as unreadable,
never as an empty index.

#### Scenario: Browsing the metric index
- **GIVEN** a connected account
- **WHEN** the user opens the metric index
- **THEN** every metric the platform lists is shown grouped by its family
- **AND** each shows its label, unit, and the transforms it takes

#### Scenario: Reading one metric's card
- **GIVEN** the index lists `RSI14`
- **WHEN** the user opens that metric
- **THEN** the card states the native output contract
- **AND** each transform shows its parameters, defaults, formula, and null
  behavior in the platform's words

#### Scenario: A metric the platform does not list
- **WHEN** the user opens a metric key the platform does not list
- **THEN** the page says there is no such metric and offers the index

#### Scenario: The vocabulary cannot be read
- **GIVEN** the platform does not answer the vocabulary
- **WHEN** the user opens the metric index
- **THEN** the page says the vocabulary could not be read and why
- **AND** does not render an empty index

### Requirement: A Proposed Column Is Checked Against The Platform's Contract

The product SHALL let a user compose a candidate report column — a metric,
a transform, a timeframe, and optional parameters — and have the platform
compile it without reading market values. A valid column SHALL render its
contract: the normalized column, effective parameters, each output's header,
type and meaning, the formula, and how nulls present. The check is a read
and SHALL write nothing.

#### Scenario: A valid column renders its contract
- **GIVEN** the metric card for `RSI14`
- **WHEN** the user checks the `value` transform on the anchor timeframe
- **THEN** the compiled contract is shown — normalized column, outputs with
  types and meanings, the formula, and the null presentation
- **AND** no write occurs

### Requirement: A Refused Column Teaches In The Platform's Words

When the platform refuses a proposed column, the product SHALL present the
refusal as guidance, not as a bare error: the platform's message, the
authoring code, the parameter path it names, the value received, and — when
the refusal declares one — the allowed domain, listed. The product MUST NOT
flatten a structured refusal into a generic failure message.

#### Scenario: An illegal operand names the legal ones
- **GIVEN** a spread column on `RSI14` with an operand the platform rejects
- **WHEN** the check runs
- **THEN** the page shows the platform's explanation of why the operand is
  illegal
- **AND** lists the operands the platform declares legal in its place

#### Scenario: A missing requirement is named
- **GIVEN** a `spread` column proposed with no operand at all
- **WHEN** the check runs
- **THEN** the page shows the platform's message naming what is required
