## ADDED Requirements

### Requirement: The Journal Is Checked Against The Work
Validation SHALL report a warning when the spec layer has been modified more
recently than the session journal. The warning MUST NOT fail the check.

#### Scenario: Work committed without a journal entry
- **WHEN** a commit modifies anything under `openspec/` other than the journal,
  and the journal has not been committed since
- **THEN** validation reports a warning
- **AND** the warning names the most recent commit that left the journal behind
- **AND** the check still passes

#### Scenario: The journal is up to date
- **WHEN** the journal has been committed at or after the most recent change to
  the rest of the spec layer
- **THEN** validation reports nothing about the journal

#### Scenario: History cannot be read
- **WHEN** git is unavailable, or neither path has ever been committed
- **THEN** validation reports nothing about the journal
- **AND** no error is raised
