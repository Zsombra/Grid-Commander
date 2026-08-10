## ADDED Requirements

### Requirement: An Architecture Guard Is Proven By A Violation It Catches
A guard that reports offenders by matching text SHALL be exercised, in the same
suite, against at least one input carrying the defect it exists to catch, and at
least one input that does not. Both SHALL be asserted.

A guard asserts an absence, and an absence is satisfied by a clean product and by
a dead matcher alike. Nothing in a passing run distinguishes them, so a guard
that has never been shown to fail carries no evidence at all — it is a comment
that costs CPU.

The negative input is not optional. A rule pinned only by violations it catches
is equally satisfied by a matcher that reports everything, and the widening
direction is the one that arrives by accident: an exclusion list broadened to
quiet a false positive silences the rule without anyone editing the rule.

A count of what was scanned SHALL NOT be accepted as this proof. Knowing the
sweep read a hundred files says nothing about whether anything in them could
match, and where the counting uses a different expression from the scanning —
which is the ordinary case — the count stays satisfied while every rule is blind.

#### Scenario: The rule stops being able to match
- **GIVEN** a guard whose offender matcher is replaced by one that matches nothing
- **WHEN** the suite runs
- **THEN** the suite fails

#### Scenario: The rule is widened until it matches everything
- **GIVEN** a guard whose offender matcher is replaced by one that matches every input
- **WHEN** the suite runs
- **THEN** the suite fails

#### Scenario: The product is clean and the rule is intact
- **GIVEN** a codebase carrying none of the defects a guard looks for
- **WHEN** the suite runs
- **THEN** the guard passes
- **AND** it has still demonstrated that it can fail

### Requirement: A Guard's Proof Exercises The Rule The Product Is Checked With
The input demonstrating a guard can fail SHALL be given to the same matcher the
guard's own scan uses. A guard SHALL NOT restate its rule in a second copy for
the purpose of proving it.

A restated rule is proof about the restatement. Break the live copy and the
proof goes on passing, because it never touched it — so the guard reports that
it works at the exact moment it stopped working, which is worse than having no
proof, since the green result is now actively misleading.

Two copies of one rule also drift, and only one of them is enforced. That defect
is recorded repeatedly in this codebase and is the reason the rule is stated here
rather than left to care.

#### Scenario: The live matcher is broken and the proof is not
- **GIVEN** a guard whose demonstration declares its own copy of the rule
- **AND** the copy the scan uses is replaced by one that matches nothing
- **WHEN** the suite runs
- **THEN** the suite fails

#### Scenario: One rule, one definition
- **GIVEN** a guard that both scans with a rule and demonstrates that rule
- **WHEN** the rule is changed
- **THEN** the scan and the demonstration change together, because they are the
  same expression

### Requirement: Whether A Guard Can Fail Is Answerable On Demand
The repository SHALL carry a command that breaks a named part of a named guard,
runs that guard, and reports whether the guard noticed. It SHALL restore the file
it altered whether the run passes, fails, or errors.

Reading a guard cannot tell anyone whether its rule can match; this repository has
twice concluded a matcher was sound by reading it, and twice been wrong. The only
answer is to break it and look. That answer must be reproducible by whoever asks
next, or the finding decays into a claim in a document.

The command SHALL report the two outcomes distinguishably: the guard failed and
therefore has evidence, or the guard passed and therefore has none.

A guard SHALL NOT be altered on disk by a routine test run. The command changes
files to ask its question, so it is invoked deliberately and is not part of any
gate.

#### Scenario: A guard with no evidence is measured
- **GIVEN** a guard whose matcher is not exercised by any input
- **WHEN** the command breaks that matcher and runs the guard
- **THEN** it reports that the guard passed with the matcher broken
- **AND** the guard's file is left exactly as it was

#### Scenario: A guard with evidence is measured
- **GIVEN** a guard that is exercised against a known violation
- **WHEN** the command breaks that matcher and runs the guard
- **THEN** it reports that the guard failed
- **AND** the guard's file is left exactly as it was

#### Scenario: The measured run ends badly
- **GIVEN** a guard being measured
- **WHEN** the run errors, or the guard cannot be parsed with the alteration applied
- **THEN** the guard's file is left exactly as it was

#### Scenario: An ordinary suite run
- **WHEN** the test suite runs without the command being invoked
- **THEN** no guard file is altered
