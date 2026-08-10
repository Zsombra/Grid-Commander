# Harness Integrity Specification

## Purpose

The tool that owns the source of truth must be provably correct and must stay
that way. This capability covers the automated tests that pin `openspec.py`'s
behavior — especially the archive merge, which rewrites the behavior contract
in place and is the one operation this system cannot cheaply recover from.

## Requirements

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

### Requirement: A Live Probe Reuses Its Throwaway Subject Rather Than Minting One
A check that needs a disposable BattleGrid agent to write to SHALL look for the
one it left behind on a previous run and reuse it, and SHALL create a new one
only when no such agent exists.

Creating one per run left eight archived agents on the operator's second account
across a handful of sessions, on a roster of eleven. The MCP surface has no
delete tool — archiving is the end of the road — so nothing this product does
can remove them, and the only available fix is to stop adding to them.

The search SHALL cover archived agents as well as active ones, because a run
that cleans up after itself leaves its subject archived and an agent that cannot
be seen is an agent that will be created again. Where the roster cannot be read,
the check SHALL NOT create an agent and SHALL report itself as not run: a check
that cannot see the roster cannot know whether its subject already exists, and
creating on that ignorance is what produced the litter.

Reactivating an archived agent runs on `mcp:read` and is not destructive by
BattleGrid's classification, so it requires no confirmation. Creating one is
also `mcp:read` and not destructive. Archiving it at the end is destructive and
carries a confirmation naming the agent, exactly as any archive does.

#### Scenario: A throwaway from an earlier run is still there
- **GIVEN** a disposable agent this check left behind and archived
- **WHEN** the check runs again
- **THEN** that agent is reactivated and used
- **AND** no new agent is created

#### Scenario: No throwaway exists yet
- **GIVEN** an account carrying no disposable agent for this check
- **WHEN** the check runs
- **THEN** exactly one is created
- **AND** it is created unable to trade

#### Scenario: The roster cannot be read
- **GIVEN** the platform does not answer the roster read
- **WHEN** the check runs
- **THEN** no agent is created
- **AND** the check reports that it did not run, and why

#### Scenario: The run ends
- **GIVEN** a check that has finished with its disposable agent
- **WHEN** it cleans up
- **THEN** the agent is left archived and still unable to trade
- **AND** the next run finds it rather than creating another

#### Scenario: Two checks that each need one
- **GIVEN** two checks that both write to a disposable agent
- **WHEN** they run at the same time
- **THEN** each uses its own agent
- **AND** neither can select the other's

### Requirement: A Probe Never Selects An Agent Its Owner Runs
Selecting an agent for a check to write to SHALL require **both** that the agent
carries the naming convention this repository gives its disposable agents **and**
that the platform reports it in `tradingMode: OFF`. An agent satisfying only one
SHALL NOT be selected.

The two conditions answer different questions and neither answers both. A
display name is a string anyone can type, so a name alone would let an operator
who renamed something be handed a live trader. `OFF` alone would match an agent
its owner has merely paused. Every agent the operator actually runs on these
accounts is in `FULL_EXECUTION`, and a check reactivates, edits and archives what
it selects — so a wrong selection stops somebody's trading agent, which is a
worse outcome than any litter.

An agent whose trading configuration did not arrive SHALL NOT be selected: a
mode that could not be read is not a mode known to be off.

The conditions SHALL be re-checked against a fresh read of the chosen agent
before it is written to, because a roster row is a snapshot and the decision to
write to an account belongs to what that account holds now.

#### Scenario: The operator's own agents are on the roster
- **GIVEN** a roster carrying agents in `FULL_EXECUTION`
- **WHEN** a check selects its subject
- **THEN** none of them is selected, whatever they are called

#### Scenario: An agent wearing the convention's name that can trade
- **GIVEN** an agent named as a disposable agent but not in `tradingMode: OFF`
- **WHEN** a check selects its subject
- **THEN** it is not selected
- **AND** the check proceeds as though no disposable agent exists

#### Scenario: An agent that is off but was never named by this repository
- **GIVEN** an agent in `tradingMode: OFF` that the convention does not name
- **WHEN** a check selects its subject
- **THEN** it is not selected

#### Scenario: An agent whose configuration could not be read
- **GIVEN** a candidate whose trading configuration is absent
- **WHEN** the conditions are evaluated
- **THEN** it is refused rather than assumed to be off

#### Scenario: The agent changed between the roster read and the write
- **GIVEN** a candidate that no longer satisfies both conditions when re-read
- **WHEN** the check is about to write to it
- **THEN** nothing is written to it
- **AND** the check reports that it did not run, and why

### Requirement: A Check That Walks A Confirmed Write Applies The Change It Described
A check that walks a write requiring confirmation SHALL form one intent, ask for
that intent to be described, and submit that same intent. Where the product
splits one intent into the parts a write takes, the check SHALL use the
product's own split rather than composing the parts itself.

A confirmation is bound to the change it described, not merely to the thing
being changed. A check describing one change and submitting another therefore
mints an authorisation its own submission cannot spend: the write is refused by
the product's own guard before anything reaches the platform, and the check
fails on its own composition. That failure reads as a product defect and invites
the one repair that must never be made — loosening the binding — so a check that
cannot spend what it minted is worse than no check at all.

A check composing the parts of the submission by hand SHALL be treated as the
same defect even where the two currently agree, because that is the divergence
that hides: the describe and the apply are written at different moments and only
the digest notices they have drifted.

#### Scenario: A check walks a confirmed write
- **GIVEN** a check that describes a change and then submits it
- **WHEN** it submits
- **THEN** the confirmation the description minted authorises the submission
- **AND** the write is performed

#### Scenario: The two halves name different changes
- **GIVEN** a check that describes one change and submits another
- **WHEN** it submits
- **THEN** the write is refused before any request is built
- **AND** the check fails rather than reporting the write as performed

#### Scenario: The product splits an intent before writing
- **GIVEN** a write whose intent the product divides into separate arguments
- **WHEN** a check walks that write
- **THEN** it divides the intent the same way the product does

### Requirement: A Live Check's Confirmed Pair Is Proven Without The Platform
The describe-then-submit pair a live check walks SHALL be pinned by a check that
needs no credential and touches no account, driving the same pair and asserting
the authorisation is spendable.

A live check against a real account is run deliberately and rarely, so a pair
that cannot be authorised can sit broken indefinitely — which is what happened
here: the binding was narrowed, nothing ran the probe afterwards, and the defect
was found by reading rather than by failing. Evidence that cannot be produced on
demand is not evidence.

The offline pinning SHALL also exercise the disagreeing pair, so it demonstrates
the refusal rather than asserting only that a working pair works.

#### Scenario: The suite runs with no credential
- **GIVEN** a checkout with no BattleGrid credential and no opt-in to write
- **WHEN** the default suite runs
- **THEN** the pair the live check walks is driven against the doubles
- **AND** the authorisation minted by the description is shown to be spendable

#### Scenario: The pair drifts apart again
- **GIVEN** a live check whose description and submission stop naming the same
  change
- **WHEN** the default suite runs
- **THEN** it fails, without the live check being run

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
