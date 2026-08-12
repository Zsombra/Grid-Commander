## ADDED Requirements

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
