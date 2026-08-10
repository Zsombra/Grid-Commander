## ADDED Requirements

### Requirement: An Architecture Guard Fails When Its Own Matcher Stops Working
Every architecture guard SHALL fail when the matcher producing its offender list
is made to match nothing, and SHALL fail when that matcher is made to match
everything.

Both directions are required because they silence different rules. A rule shaped
as *no offenders* goes quiet when its matcher finds nothing; a rule shaped as
*nothing is missing* goes quiet when its matcher finds everything. A guard proven
in only one direction is proven against only half of how it fails.

The proof SHALL exercise the same matcher the live scan uses. A proof that
re-states the rule demonstrates that a copy of it works, and leaves the copy that
runs unprotected.

Counting the corpus a guard scanned does not satisfy this. That check answers
whether files were read; it cannot answer whether anything in them could be
found, and every guard audited on 2026-08-10 had a corpus floor while its rules
were blind.

#### Scenario: The matcher stops matching
- **GIVEN** an architecture guard and the matcher that produces its offender list
- **WHEN** that matcher is altered to match nothing
- **THEN** the guard fails

#### Scenario: The matcher matches everything
- **GIVEN** a guard whose rule asserts that nothing required is absent
- **WHEN** its matcher is altered to report every input as present
- **THEN** the guard fails

#### Scenario: The proof re-states the rule instead of calling it
- **GIVEN** a guard whose proof declares its own copy of the pattern
- **WHEN** only the pattern the live scan uses is altered to match nothing
- **THEN** the guard fails
- **AND** it is not treated as proven by the copy that still works

#### Scenario: The rule has nothing to find today
- **GIVEN** a rule whose subject is absent from the project, so it reports no
  offenders whether it works or not
- **WHEN** its matcher is altered to match nothing
- **THEN** the guard fails
- **AND** the proof does not depend on the project acquiring a violation

#### Scenario: A guard is added without a proof
- **WHEN** a new architecture guard is written
- **THEN** it is proven by the same means before it is relied upon
- **AND** it is not exempted by naming it in a list

### Requirement: The Mutation Check Is A Command In The Repository
The project SHALL provide a runnable check that alters a named matcher in a test
file, runs that file, and reports whether the alteration was noticed.

Reading a guard cannot establish whether its pattern can match. Every finding
about these guards was produced by breaking a matcher and re-running, and until
this lands that method exists only in a session transcript — so the next audit
re-derives it or does not happen.

The check SHALL restore the file it altered whether the run passes, fails, or
raises, and SHALL refuse when the text it was asked to alter is not present,
rather than reporting on a file it did not change.

#### Scenario: The alteration is noticed
- **WHEN** a matcher is altered and the guard fails
- **THEN** the check reports the guard caught it

#### Scenario: The alteration is not noticed
- **WHEN** a matcher is altered and the guard still passes
- **THEN** the check reports the guard did not catch it

#### Scenario: The run ends
- **GIVEN** a check that altered a file
- **WHEN** the run finishes, by any outcome including an error
- **THEN** the file is returned to its original content
- **AND** no altered copy is left behind under the test directory

#### Scenario: The text to alter is absent
- **WHEN** the check is asked to alter text the file does not contain
- **THEN** it refuses and reports nothing about the guard
- **AND** the file is left untouched
