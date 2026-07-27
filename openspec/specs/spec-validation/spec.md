# Spec Validation Specification

## Purpose

Automated enforcement of spec-layer integrity, so that broken delta specs,
dangling tracking links, and invalid design tickets are caught when they are
proposed rather than when they are archived.

## Requirements

### Requirement: Validation Runs Automatically
The project SHALL run spec-layer validation on every pull request and on every
push to the default branch, without anyone requesting it.

#### Scenario: Pull request opened or updated
- **WHEN** a pull request is opened, or a new commit is pushed to its branch
- **THEN** spec-layer validation runs against that branch head
- **AND** the result is reported as a status check on the pull request

#### Scenario: Commit lands on the default branch
- **WHEN** a commit is pushed to the default branch
- **THEN** spec-layer validation runs against it

### Requirement: Errors Fail The Check And Warnings Do Not
Validation errors SHALL fail the check. Warnings and informational findings
SHALL NOT fail it, but MUST still be reported.

#### Scenario: A change carries a validation error
- **WHEN** validation reports one or more errors
- **THEN** the check fails
- **AND** every diagnostic is visible without opening the raw log

#### Scenario: A change carries only warnings
- **WHEN** validation reports warnings or info findings but no errors
- **THEN** the check passes
- **AND** those findings are still reported

#### Scenario: A change is clean
- **WHEN** validation reports nothing
- **THEN** the check passes

### Requirement: Validation Requires No Project Dependencies
Validation SHALL run with python3 alone, installing nothing.

#### Scenario: Fresh runner
- **WHEN** the workflow runs on a clean checkout
- **THEN** validation completes with no dependency installation step
- **AND** a future dependency added to the tool would break this check

### Requirement: A Rename Requires Something To Rename
Validation SHALL report an error when a delta renames a requirement in a
capability that has no main spec. A rename that cannot be applied MUST NOT pass
silently.

#### Scenario: Renaming in a capability's first change
- **WHEN** a delta contains a `RENAMED` section for a capability that has no
  main spec yet
- **THEN** validation reports an error
- **AND** the error says a capability's first change can only add requirements
- **AND** archiving the change is refused

#### Scenario: Renaming alongside additions in the same delta
- **WHEN** that same delta also adds requirements
- **THEN** the error is still reported
- **AND** the additions are not merged, because the change does not archive

#### Scenario: Renaming in a capability that already exists
- **WHEN** a delta renames a requirement in a capability that has a main spec
- **THEN** the existing source and target checks apply unchanged
- **AND** a rename naming a requirement that exists is accepted

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
