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

### Requirement: A Surface's Freshness Is Decided By Content, Not By History
Validation SHALL decide whether a surface manifest is stale by comparing a
digest of the files it names against those files as they stand. It MUST NOT
depend on a commit hash resolving, or on any repository history surviving.

The digest SHALL be taken over the contents of every path in `source_files`,
independent of their order, and SHALL treat a difference of line endings alone
as no difference — a checkout convention is not a change to what a surface
describes.

A commit reference MAY be recorded as provenance. It MUST NOT decide freshness.

#### Scenario: A described file changes
- **WHEN** any file a surface names differs from the content it was surveyed at
- **THEN** the surface is reported stale, naming the files that differ

#### Scenario: History is rewritten and the content is not
- **GIVEN** a surface surveyed on a branch whose commits are later squashed
- **WHEN** validation runs against the resulting history
- **THEN** the surface is reported fresh, because its files are unchanged
- **AND** the absence of the commit it was surveyed at changes nothing

#### Scenario: A checkout rewrites line endings
- **WHEN** the only difference in a described file is its line endings
- **THEN** the surface is not reported stale

#### Scenario: A described file no longer exists
- **WHEN** a path in `source_files` cannot be read
- **THEN** the surface is reported stale, naming that path
- **AND** validation completes rather than failing

### Requirement: A Surface That Cannot Be Verified Says So
Where a surface carries no digest — because it was surveyed before digests were
recorded, and the content it described cannot be recovered — validation SHALL
report it as never verified.

It MUST NOT be reported fresh, and it MUST NOT be reported stale: both are
claims about a comparison that did not happen. What is known is that no
comparison is possible, and that is what is said.

The digest for such a surface SHALL NOT be computed from the files as they now
stand. Doing so would record today's content as though it had been surveyed,
turning an unverifiable surface into a confidently wrong one.

#### Scenario: A surface predating the digest
- **GIVEN** a manifest with no recorded digest
- **WHEN** validation runs
- **THEN** it is reported as never verified, and a re-survey is named as the fix
- **AND** it is reported as neither fresh nor stale

#### Scenario: The unverifiable are counted separately
- **WHEN** surfaces are summarised
- **THEN** those that cannot be verified are distinguishable from those checked
  and found fresh
