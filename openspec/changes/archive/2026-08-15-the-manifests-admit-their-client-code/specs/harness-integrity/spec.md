## ADDED Requirements

### Requirement: A Surface Manifest Does Not Deny The Client Code Its Sources Carry
Validation SHALL report, as a warning naming the manifest and the file, any
surface manifest whose text claims the absence of client JS while a file named
in its own `source_digest` declares `'use client'`. A manifest whose recorded
sources carry no such declaration MAY keep the claim, and SHALL NOT be
reported.

A surface constraint is what the design agent must not break, so a false one
either causes a legitimate treatment to be refused or teaches the reader that
constraints are unreliable. This claim rotted silently in fourteen of
twenty-four manifests because it is asserted prose that nothing re-derives:
the staleness check compares digests, not meaning, so a manifest can be
re-pinned — twice, in one case — with its denial intact. The truthful wording
this check permits states the exception instead of denying it, and therefore
does not match the claim.

The check reads the manifest's own recorded source list. A client component
reached through an import the manifest does not record is the import
cross-check's finding, not this one's.

#### Scenario: A manifest denies client code its sources carry
- **GIVEN** a surface manifest whose text claims "no client JS"
- **AND** a file in its `source_digest` whose head declares `'use client'`
- **WHEN** validation runs
- **THEN** a warning is reported naming the manifest and the declaring file

#### Scenario: The claim is true
- **GIVEN** a surface manifest claiming "no client JS" whose recorded sources
  carry no `'use client'` declaration
- **WHEN** validation runs
- **THEN** no diagnostic fires for it

#### Scenario: The corrected wording is not reported
- **GIVEN** a manifest that names its client component as the stated exception
  ("the only client code is …") rather than denying client code exists
- **AND** sources that carry that component
- **WHEN** validation runs
- **THEN** no diagnostic fires for it

#### Scenario: A recorded source cannot be read
- **GIVEN** a manifest claiming "no client JS" whose `source_digest` names a
  file that is absent from the working tree
- **WHEN** validation runs
- **THEN** the absent file does not crash the check and is not treated as
  declaring client code
- **AND** the manifest's other recorded sources are still checked
