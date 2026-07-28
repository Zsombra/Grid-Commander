## ADDED Requirements

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
