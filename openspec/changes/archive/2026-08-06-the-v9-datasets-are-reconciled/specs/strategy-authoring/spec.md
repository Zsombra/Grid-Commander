## MODIFIED Requirements

### Requirement: Report Sections Can Be Composed When Editing
Grid-Commander SHALL let a user choose which report sections a strategy includes
when editing, presenting available sections discovered from BattleGrid at edit
time. It MUST NOT offer, accept, or validate sections against a list fixed at
build time.

**Where the platform publishes the ceilings a preview runs under, they SHALL be
shown while composing** — that is when they can change a decision, and a refusal
after the fact already carries the platform's own words. Where the platform
publishes no ceiling, none SHALL be shown: a limit this product invented would be
read as the platform's and composed against.

**A limit SHALL be applied only in the unit of the value it bounds.** Where the
platform publishes the same limit in more than one unit, the product SHALL use
the one matching the field it constrains.

#### Scenario: Current sections are pre-selected
- **WHEN** a user opens the edit form for a strategy they own
- **THEN** each section the strategy currently includes is shown as selected
- **AND** available sections the strategy does not currently include are shown
  as deselected

#### Scenario: Available sections come from the platform
- **WHEN** the vocabulary can be read
- **THEN** sections are presented grouped by the categories BattleGrid returns
- **AND** a section that does not appear in the platform's vocabulary is not
  invented by Grid-Commander

#### Scenario: The ceilings a preview runs under
- **WHEN** the platform publishes preview execution limits
- **THEN** they are shown where sections are composed
- **AND** stated as what would be refused rather than truncated

#### Scenario: No ceiling published
- **WHEN** the platform publishes no preview limits
- **THEN** none is shown and no default is substituted

#### Scenario: One limit published in two units
- **WHEN** the platform publishes a bound as both a fraction and a percentage
- **THEN** the one matching the bounded field's unit is applied
- **AND** a value valid under that bound is never refused by a unit mismatch

#### Scenario: Section selection is compiled as composed
- **WHEN** a user changes which sections are selected and compiles
- **THEN** the compiled request carries exactly the sections the user chose
- **AND** sections not selected are not present in the compiled request

#### Scenario: Vocabulary unavailable blocks section editing
- **WHEN** the vocabulary cannot be read from BattleGrid
- **THEN** the section checklist is not shown
- **AND** the user is told why composing is not available
