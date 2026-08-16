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
is made to match nothing, SHALL fail when that matcher is made to match
everything, and SHALL pass when the product contains no violation and the
matcher is unaltered.

Both broken directions are required because they silence different rules. A rule
shaped as *no offenders* goes quiet when its matcher finds nothing; a rule shaped
as *nothing is missing* goes quiet when its matcher finds everything. A guard
proven in only one direction is proven against only half of how it fails.

The clean-pass direction is required because without it the requirement is
satisfied by a rule that fails unconditionally, or by one broad enough to report
the whole tree — and neither is a guard. Distinguishing a violation from ordinary
code is the entire job.

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

#### Scenario: The product is clean and the rule is intact
- **GIVEN** a product containing no violation of the rule
- **WHEN** the guard runs with its matcher unaltered
- **THEN** it passes
- **AND** its proof includes at least one input the matcher must not report

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
file, runs that file, and reports whether the alteration was noticed. The check
SHALL NOT run as part of the ordinary test suite or any quality gate.

Reading a guard cannot establish whether its pattern can match. Every finding
about these guards was produced by breaking a matcher and re-running, and until
this landed that method existed only in a session transcript — so the next audit
re-derives it or does not happen.

It stays out of the gates because it rewrites files on disk mid-run, which is
stateful, and because a slow gate is a gate people route around. It is run
deliberately, by a person writing or doubting a guard.

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

#### Scenario: An ordinary suite run
- **GIVEN** a checkout where the default suite or a quality gate is run
- **WHEN** the run completes
- **THEN** no guard file was altered by the mutation check
- **AND** the suite's outcome does not depend on the check being present

### Requirement: A Truncating Suite Refuses A Database Holding Live Authority
A test suite that truncates SHALL refuse to run against a database holding an
active connection to BattleGrid, and SHALL name disconnecting through the
product as the repair.

Deleting such a row destroys the only copy of the tokens — they are held
encrypted in the row itself — while the authorization at BattleGrid survives.
The result is a grant nobody can enumerate and the product cannot revoke, which
is precisely the outcome the disconnect path exists to prevent: relinquishing
locally is not relinquishing.

**The database being disposable is a different claim, and SHALL NOT satisfy
this one.** One is about where the data sits; this is about what the data is. A
row holding a live credential is not disposable because the database around it
is, and an acknowledgement that the database may be truncated SHALL NOT stand in
for an acknowledgement about the grant.

The check SHALL read the data rather than the connection string, and SHALL run
at the point of truncation rather than at configuration time, because the fact
it protects can arrive after the suite is pointed at the database.

#### Scenario: The database holds a live connection
- **GIVEN** a disposable database holding an active BattleGrid connection
- **WHEN** the truncating suite runs
- **THEN** it refuses before truncating anything
- **AND** the refusal says the authorization would survive and become
  unrevocable
- **AND** it names disconnecting through the product as the repair

#### Scenario: The database holds none
- **GIVEN** a disposable database with no active connection
- **WHEN** the truncating suite runs
- **THEN** it proceeds

#### Scenario: A revoked connection is not live authority
- **GIVEN** a database whose only connection is already revoked
- **WHEN** the truncating suite runs
- **THEN** it proceeds, because there is no authority left to strand

#### Scenario: The database predates the schema
- **GIVEN** a database with no connections table yet
- **WHEN** the truncating suite runs
- **THEN** it proceeds, because nothing can be held in a table that does not
  exist
- **AND** a failure to read the table for any other reason is not treated as
  permission

### Requirement: A Tool That Writes A Committed Artifact Pins Its Line Endings
Every text write performed by this repository's own tooling SHALL pin the line
ending it emits, and SHALL NOT inherit the platform default.

Python translates `\n` to `\r\n` on Windows unless `newline` is given.
`encoding` being pinned does not imply it: the archiver passed
`encoding="utf-8"` and still wrote 799 carriage returns into a merged spec,
which is the shape that makes this worth a rule rather than a habit — the write
looked careful.

`.gitattributes` normalises on commit, so the committed blob is never wrong.
The cost is in the working tree, where the guards run: CRLF once made two
matchers compare `\n` against `\r\n` and read nothing, and made a bundler refuse
a source file outright, so a guard suite collected zero tests and the run
reported failures about the platform rather than about the product.

**The rule SHALL be enforced by deriving from the source rather than by
inspecting output.** Output is normalised by the time it is committed, so a
check that reads committed files passes everywhere and proves nothing; and a
newly added writer must be covered on the day it is written, not on the day it
is noticed.

#### Scenario: A tool writes a file
- **WHEN** any tool in the repository writes text
- **THEN** the line ending it emits is the one it names, on every platform

#### Scenario: A new writer omits it
- **GIVEN** a tool gaining a text write that does not pin its line ending
- **WHEN** the guard runs
- **THEN** it fails, naming the file and the line

#### Scenario: The guard is looking at something
- **WHEN** the guard runs
- **THEN** it confirms it found the writers it is checking
- **AND** a scan that matched nothing fails rather than passing

### Requirement: The Build Gate Type-Checks The Route Types Next Generates
The `npm run build` quality gate SHALL type-check the per-route validation
files Next generates, and a route module that violates the framework's page
contract SHALL fail the build. The TypeScript configuration SHALL NOT exclude
a path that its own include list names — a check that is generated on every
build and discarded by configuration reports nothing, while the gate that runs
it reports green.

#### Scenario: A page exports a symbol the page contract does not allow
- **GIVEN** a page module exporting a function beside its `default` that
  Next's page contract does not name
- **WHEN** `npm run build` runs
- **THEN** the build fails
- **AND** the error names the offending route

#### Scenario: A page's props violate the generated PageProps contract
- **GIVEN** a page whose props type does not satisfy the `PageProps` shape
  Next generates for its route
- **WHEN** `npm run build` runs
- **THEN** the build fails naming that route

#### Scenario: The exclusion drifts back
- **GIVEN** a tsconfig change that makes an `exclude` entry swallow a path
  the `include` list names
- **WHEN** the test suite runs
- **THEN** an architecture guard fails, naming the include entry that was
  silently discarded

#### Scenario: A clean tree passes
- **GIVEN** route modules that satisfy the page contract
- **WHEN** `npm run build` runs
- **THEN** the generated route types are checked and the build passes

### Requirement: The Surface Import Cross-Check Resolves The Project's Import Conventions
The check that verifies a surface manifest's source list against the code
SHALL resolve imports the way the project's own toolchain does: path aliases
SHALL be read from the TypeScript configuration's `paths` mapping, and
extension-rewritten specifiers (a `.js` specifier naming a `.ts` or `.tsx`
file) SHALL resolve to the file the toolchain would load. The conventions
SHALL be read from the project's configuration, never compiled into the
check.

#### Scenario: An alias import is missing from the source list
- **GIVEN** a listed source file importing a UI file through a configured
  path alias
- **WHEN** validation runs and the imported file is not in `source_files`
- **THEN** the incomplete-sources diagnostic fires, naming the file

#### Scenario: An extension-rewritten specifier resolves
- **GIVEN** a listed source file importing a UI file with a `.js` specifier
  that names a `.ts` or `.tsx` file on disk
- **WHEN** validation runs and the imported file is not in `source_files`
- **THEN** the incomplete-sources diagnostic fires, naming the file

#### Scenario: The conventions cannot be read
- **GIVEN** a project with no readable TypeScript configuration or no
  `paths` mapping
- **WHEN** validation runs
- **THEN** relative imports are still resolved and checked
- **AND** the check degrades rather than disappearing

#### Scenario: Bare package imports stay outside the surface
- **WHEN** a listed source file imports from a package specifier no alias
  covers
- **THEN** no diagnostic fires for it

### Requirement: Routes Without A Surface Manifest Are Named
Validation SHALL report the routes the application serves that no surface
manifest's `route` field covers, as a single informational diagnostic
carrying the count, and the design overview SHALL list the uncovered routes
individually. A route nobody surveyed is invisible to staleness detection,
and naming it is the only mechanism that can say so — a diagnostic can only
attach to a manifest that exists.

#### Scenario: A route has no manifest
- **GIVEN** an application route whose path no manifest's `route` covers
- **WHEN** validation runs
- **THEN** the informational diagnostic reports it, with the total count

#### Scenario: A new route appears
- **WHEN** a page is added at a route no manifest covers
- **THEN** the reported count and route set change on the next run

#### Scenario: Coverage is complete
- **GIVEN** every application route covered by a manifest
- **WHEN** validation runs
- **THEN** the diagnostic does not fire

### Requirement: A Server Action Is Declared Where The Action Scanners Look

Every Server Action in the interface SHALL be an exported function in a module
that declares `'use server'` at module level. A function-level `'use server'`
directive in interface source SHALL fail an architecture guard that names the
file and the function.

The action scanners enumerate what they check by exported declaration, and a
page module cannot export an action without violating the page contract the
build gate enforces — so an action declared inline in a page is invisible to
every check that exists to cover it, permanently. Three shipped that way and
were one refactor from the defect the form-field cross-check was written for,
with the scanners green throughout.

#### Scenario: An inline action regrows

- **GIVEN** an interface source file declaring a function whose body begins
  with a `'use server'` directive
- **WHEN** the architecture suite runs
- **THEN** the guard fails, naming the file and the function

#### Scenario: The product is clean

- **GIVEN** an interface whose every Server Action is exported from a
  module-level `'use server'` module
- **WHEN** the architecture suite runs
- **THEN** the guard passes
- **AND** the action scanners' discovered sets include every action the
  product runs

#### Scenario: The guard is proven without a live violation

- **GIVEN** a product containing no inline directive for the guard to find
- **WHEN** the guard's matcher proof runs
- **THEN** the same matcher the live scan uses is shown to catch the inline
  shape, fed as fixture text
- **AND** shown not to report a module-level directive or an ordinary function

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

### Requirement: A Session Asserts The Checkout It Is Standing In
Before a session treats `git` output as evidence about its own work,
Grid-Commander SHALL assert that the working directory is part of the repository
that git answers for, and MUST refuse to report a clean state when it is not.

A worktree that loses its `.git` file does not fail — it becomes invisible. Git
walks up to the parent repository and answers every command for that checkout,
so `git status` reports clean truthfully about a branch the operator is not on,
while every edit lands in a path the parent is configured to ignore. Nothing
errors, and the check people actually use is the one that lies.

**The signature is that the working directory is ignored by the repository
answering for it.** A healthy worktree's own repository does not ignore its own
root; a dead one is answered for by a repository that does. The assertion is
therefore `git check-ignore` against the working directory, read together with
`git rev-parse --show-toplevel`, and not a comparison of paths alone — a path
comparison cannot tell a worktree from a subdirectory.

A clean `git status` is not evidence that edits landed.

#### Scenario: A healthy checkout
- **WHEN** the preflight runs in a valid checkout or worktree
- **THEN** it passes
- **AND** it says nothing that would train the reader to ignore it

#### Scenario: A working directory the answering repository ignores
- **WHEN** the preflight runs where `git` answers from a repository that ignores
  the working directory
- **THEN** it fails loudly
- **AND** names the directory, the repository answering for it, and the ignore
  rule that matched
- **AND** states that a clean status describes the other checkout

#### Scenario: Not a checkout at all
- **WHEN** the preflight runs where `git` finds no repository
- **THEN** it says so plainly rather than reporting the ignored-directory failure

#### Scenario: The guard is runnable without the harness
- **WHEN** an operator suspects the state of a directory
- **THEN** the same assertion is available as a command in the repository
- **AND** its exit status distinguishes pass from failure
