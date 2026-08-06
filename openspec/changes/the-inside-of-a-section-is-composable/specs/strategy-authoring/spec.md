# strategy-authoring (delta)

## ADDED Requirements

### Requirement: A Section Template Shows The Columns It Renders

The product SHALL let a user open any section template the platform's vocabulary
advertises and see the columns that template renders, as the platform declared
them — the metric, the transform, the timeframe, and every parameter the entry
carries. The columns SHALL be the platform's own; the product MUST NOT compose,
complete or reorder them.

A template whose entry publishes no columns SHALL be shown as *not published*,
never as a section with no columns. A vocabulary that cannot be read SHALL be
shown as unreadable, never as an empty library.

A key the platform's column entry carries that this product does not carry
SHALL be named on the surface rather than dropped. The column grammar is the
platform's and it has already gained two controls in one deployment; a surface
that silently keeps the parts it recognises reports a narrower column than the
one the platform declared.

#### Scenario: Opening a section template
- **GIVEN** the vocabulary advertises a section template
- **WHEN** the user opens it
- **THEN** each column that template renders is shown with its metric,
  transform and timeframe as the platform declared them
- **AND** the parameters the entry carries are shown beside them

#### Scenario: A template that publishes no columns
- **WHEN** a template's entry carries no columns
- **THEN** the surface says the platform did not publish them
- **AND** does not present the template as rendering nothing

#### Scenario: A column key the product does not carry
- **GIVEN** a column entry carrying a key this product does not model
- **WHEN** the column is shown
- **THEN** the column still renders
- **AND** the unmodelled key is named as not carried rather than omitted

#### Scenario: A section key the platform does not advertise
- **WHEN** the user opens a section key the vocabulary does not list
- **THEN** the page says there is no such section and offers the library

#### Scenario: The vocabulary cannot be read
- **WHEN** the section vocabulary cannot be read
- **THEN** the library says so and why
- **AND** does not render an empty list of sections

### Requirement: An Enumerated Column Control Is Read From The Declaration Or Withheld

Every column control whose values the platform pins to an enumeration — the
relative and absolute timeframes, `bars`, `ordering`, the support/resistance
side — SHALL be offered from the values the platform's own tool declaration
carries at the time of use. Grid-Commander MUST NOT offer, accept or validate
such a control against a list fixed at build time.

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

### Requirement: A Composed Column Says Where It Cannot Be Saved

A surface that composes a report column without saving it SHALL say so on the
page, in the same view as the composer, and SHALL state what the column can and
cannot reach.

Where the platform's own compile request accepts a section by key alone and
carries no columns for it, the surface SHALL say that the section's contents
belong to the platform and that membership is the only choice an author makes
about it. A composer that implied otherwise would invite an author to tune
something the platform will never read.

#### Scenario: Nothing composed here is saved
- **WHEN** the column editor renders
- **THEN** the page states that nothing composed on it is saved
- **AND** states what would be needed for a composed column to reach a strategy

#### Scenario: A platform section's contents are the platform's
- **GIVEN** a section the platform provides
- **WHEN** its columns are shown
- **THEN** the surface says the compile request carries no columns for it
- **AND** says that including or omitting the section is the choice available

## MODIFIED Requirements

### Requirement: A Proposed Column Is Checked Against The Platform's Contract

The product SHALL let a user compose a candidate report column — a metric,
a transform, a timeframe, and every optional parameter the platform's column
declaration accepts — and have the platform compile it without reading market
values. A valid column SHALL render its contract: the normalized column,
effective parameters, each output's header, type and meaning, the formula, and
how nulls present. The check is a read and SHALL write nothing.

**The check SHALL be reachable from a section's own columns**, seeded from the
column as the platform declared it, so that tuning starts from what the section
actually renders rather than from a blank form.

**A metric SHALL be established as one the platform lists before it is sent.**
A key that reaches this product from a URL is not a key the platform published,
and the platform enum-rejects an unknown one — so an unlisted metric SHALL be
reported as no such metric, distinctly from a platform that could not be asked.

A form that does not describe a column SHALL NOT be sent. Where the composer
cannot turn what was entered into a column at all, the surface SHALL say so in
its own words and state that nothing was asked of the platform — never present
its own refusal as the platform's.

#### Scenario: A valid column renders its contract
- **GIVEN** the metric card for `RSI14`
- **WHEN** the user checks the `value` transform on the anchor timeframe
- **THEN** the compiled contract is shown — normalized column, outputs with
  types and meanings, the formula, and the null presentation
- **AND** no write occurs

#### Scenario: Checking a column the section already renders
- **GIVEN** a section template whose columns the platform published
- **WHEN** the user opens one of those columns in the editor
- **THEN** the editor is seeded with that column's own metric, transform,
  timeframe and parameters
- **AND** the platform's contract for it is shown

#### Scenario: A metric the platform does not list
- **WHEN** a column names a metric the platform's vocabulary does not list
- **THEN** the surface says there is no such metric
- **AND** no column carrying it is sent to the platform

#### Scenario: A form that does not describe a column
- **WHEN** the composer cannot turn the entered values into a column
- **THEN** the surface says what is unfinished, in its own words
- **AND** states that nothing was sent to BattleGrid
