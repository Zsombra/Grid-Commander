## ADDED Requirements

### Requirement: Report Sections Can Be Composed When Editing
Grid-Commander SHALL let a user choose which report sections a strategy includes
when editing, presenting available sections discovered from BattleGrid at edit
time. It MUST NOT offer, accept, or validate sections against a list fixed at
build time.

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

#### Scenario: Section selection is compiled as composed
- **WHEN** a user changes which sections are selected and compiles
- **THEN** the compiled request carries exactly the sections the user chose
- **AND** sections not selected are not present in the compiled request

#### Scenario: Vocabulary unavailable blocks section editing
- **WHEN** the vocabulary cannot be read from BattleGrid
- **THEN** the section checklist is not shown
- **AND** the user is told why composing is not available

## MODIFIED Requirements

### Requirement: Vocabulary Is Discovered, Never Written Down
Every value a strategy is composed from SHALL be obtained from the platform at
the time of use. Grid-Commander MUST NOT offer, accept, or validate against a
list of platform vocabulary fixed at build time.

#### Scenario: Composing a change
- **WHEN** a user composes a change involving the platform's vocabulary
- **THEN** the available categories, metrics, signals and their constraints come
  from the platform

#### Scenario: Section vocabulary is fetched per category
- **WHEN** a user edits a strategy
- **THEN** the available sections within each category are fetched from
  BattleGrid at that moment
- **AND** the result is not a list Grid-Commander compiled at build time

#### Scenario: The vocabulary cannot be read
- **WHEN** the vocabulary cannot be obtained
- **THEN** composing is not offered
- **AND** the user is told why
