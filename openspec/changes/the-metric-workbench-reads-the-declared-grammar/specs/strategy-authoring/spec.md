# strategy-authoring — delta

## MODIFIED Requirements

### Requirement: An Enumerated Column Control Is Read From The Declaration Or Withheld

Every column control whose values the platform pins to an enumeration — the
relative and absolute timeframes, `bars`, `ordering`, the support/resistance
side — SHALL be offered from the values the platform's own tool declaration
carries at the time of use. Grid-Commander MUST NOT offer, accept or validate
such a control against a list fixed at build time.

This binds **every surface that composes or checks a column**, not one editor:
the section editor and the metric workbench offer the same declared controls
from the same read. Classifying a value against a fixed list is the same
defect as offering one — a reader that sorts a bare timeframe into
relative-or-absolute by consulting a built-in list of the relative names
misfiles every relative timeframe the platform adds later, so a composed
timeframe SHALL travel in a form that carries its own kind and no surface
SHALL classify one by list membership.

Where the declaration cannot answer for a control — discovery failed, the tool
is gone, nothing is pinned at that path — the control SHALL NOT be offered, and
the surface SHALL say that the platform's declaration did not name its values.
An absent control and a control with no legal values must not look alike: the
first is a platform that has moved, the second would be a product that invented
an empty set.

#### Scenario: A control the declaration pins
- **GIVEN** the platform's column tool declares the values a control accepts
- **WHEN** the column editor renders
- **THEN** that control offers exactly the declared values
- **AND** offers no value the declaration does not carry

#### Scenario: A control the declaration cannot answer for
- **GIVEN** the declaration names no values at a control's path
- **WHEN** the column editor renders
- **THEN** the control is not offered
- **AND** the surface says the platform's declaration did not name its values

#### Scenario: A control the platform adds
- **GIVEN** the platform widens an enumeration in a deployment
- **WHEN** the editor is next rendered
- **THEN** the new value is offered without a change to this product

#### Scenario: The metric workbench offers the declared controls
- **GIVEN** a metric's card at the metric workbench
- **WHEN** the check form renders
- **THEN** the timeframe, `bars`, `ordering` and side controls offer exactly
  the declared values, or state that the declaration did not name them
- **AND** no timeframe list is written into this product's source

#### Scenario: A timeframe arrives untagged
- **GIVEN** a metric-workbench URL whose `tf` value does not carry its kind
- **WHEN** the page reads the form
- **THEN** the composer says a timeframe must be chosen, in its own words
- **AND** states that nothing was sent to BattleGrid
- **AND** the value is never sorted into relative or absolute by a built-in
  list
