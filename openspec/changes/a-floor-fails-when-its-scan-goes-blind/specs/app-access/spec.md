## ADDED Requirements

### Requirement: A Gating Check Fails When Its Own Scan Goes Blind
Where a check that gates a change enforces its rule by scanning source for
offenders — so that finding nothing is the passing state — the check SHALL
fail when the scan stops reading what it claims to scan, not only when an
offender appears. A vacuity guard SHALL exercise the rule's own machinery:
either a planted offender the scan must report, or a floor computed from what
the scan itself produced. A guard that counts an independent pattern proves
the sources exist, not that the scanner reads them, and does not satisfy this
requirement.

Three checks in this repository went blind and reported clean trees before
this was written; each was found by a person noticing an absence, which is the
discovery mode this requirement exists to remove.

#### Scenario: The scanner breaks while the sources stand
- **WHEN** an offender scan's machinery stops matching the idiom it reads —
  a shape it did not expect, a refactor of the spelling it keyed on
- **AND** the files it scans are otherwise unchanged
- **THEN** a check fails, rather than the tree reporting clean

#### Scenario: A planted offender goes unreported
- **WHEN** a scan is pointed at a fixture carrying a known offender
- **AND** the scan does not report it
- **THEN** the check fails, naming the fixture it lost

#### Scenario: The guard can itself fail
- **WHEN** a converted guard's scanner is deliberately mutated in the way it
  would actually break
- **THEN** the guard fails under the mutation and passes on revert, and the
  measurement is recorded with the change that converted it
