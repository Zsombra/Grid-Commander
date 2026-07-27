# Harness Integrity Specification

## Purpose

The tool that owns the source of truth must be provably correct and must stay
that way. This capability covers the automated tests that pin `openspec.py`'s
behavior — especially the archive merge, which rewrites the behavior contract
in place and is the one operation this system cannot cheaply recover from.

## ADDED Requirements

### Requirement: The Harness Tool Has An Automated Test Suite
The harness tool SHALL be covered by an automated test suite that runs with a
standard Python interpreter and installs nothing.

#### Scenario: Fresh checkout
- **WHEN** the suite is run on a clean checkout with no packages installed
- **THEN** every test runs to completion
- **AND** no dependency installation is required

#### Scenario: A dependency creeps into the tool
- **WHEN** the tool starts importing something outside the standard library
- **THEN** the suite fails on a fresh checkout, rather than passing quietly

### Requirement: The Test Suite Runs Automatically
The project SHALL run the test suite on every pull request and on every push to
the default branch. A failing test SHALL fail the check.

#### Scenario: Pull request opened or updated
- **WHEN** a pull request is opened, or a new commit is pushed to its branch
- **THEN** the suite runs against that branch head
- **AND** the result is reported as a status check

#### Scenario: A test fails
- **WHEN** any test in the suite fails
- **THEN** the check fails
- **AND** the failing test's name and assertion are visible without opening the
  raw log

### Requirement: Archive Merge Is Pinned By Content Assertions
Every delta operation's effect on the resulting main spec SHALL be asserted on
the **content** of the written file. An exit code alone MUST NOT be accepted as
evidence that a merge was correct.

#### Scenario: ADDED appends to an existing capability
- **WHEN** a delta adds a requirement to a capability that already has a main
  spec
- **THEN** the requirement block is appended after the existing requirements
- **AND** every pre-existing requirement survives unchanged, in its original
  order

#### Scenario: MODIFIED replaces the whole requirement block
- **WHEN** a delta modifies an existing requirement
- **THEN** the entire prior block — header, statement, and all of its scenarios
  — is replaced by the delta's version
- **AND** no scenario from the prior version survives unless the delta repeats
  it

#### Scenario: REMOVED deletes the requirement
- **WHEN** a delta removes an existing requirement
- **THEN** that block no longer appears in the main spec
- **AND** the requirements surrounding it are untouched

#### Scenario: RENAMED rewrites only the header
- **WHEN** a delta renames a requirement
- **THEN** the header line carries the new name
- **AND** the statement and scenarios beneath it are byte-identical to before

#### Scenario: A new capability is created from the delta
- **WHEN** a delta targets a capability with no main spec
- **THEN** a main spec is created with the delta's Purpose
- **AND** it contains every ADDED requirement

### Requirement: A Failed Archive Leaves The Source Of Truth Untouched
When an archive cannot complete, the tool SHALL leave `openspec/specs/` and the
change folder exactly as they were, so the operation is repeatable once the
cause is fixed.

#### Scenario: The change fails validation
- **WHEN** archive is run on a change carrying a validation error
- **THEN** no spec file is written or modified
- **AND** the change folder remains in place, not moved to the archive
- **AND** the reported diagnostics name what to fix

#### Scenario: The merge conflicts
- **WHEN** a delta operation cannot be applied — a MODIFIED target that is
  absent, or an ADDED requirement that already exists
- **THEN** no spec file is written or modified, including specs for other
  capabilities in the same change
- **AND** the change folder remains in place

#### Scenario: Re-running after a fix
- **WHEN** the cause of a failed archive is corrected and archive is run again
- **THEN** it completes as if the failed attempt had never happened

### Requirement: Every Validation Code Is Covered By A Fixture
Each diagnostic code the tool can emit SHALL have at least one test that
triggers it. A code with no fixture SHALL fail the suite.

#### Scenario: A code is emitted by a fixture
- **WHEN** the suite runs
- **THEN** every diagnostic code the tool can emit was produced by at least one
  fixture, with the severity the tool declares for it

#### Scenario: A new code is added without a fixture
- **WHEN** a diagnostic code is added to the tool and no test triggers it
- **THEN** the suite fails and names the uncovered code
