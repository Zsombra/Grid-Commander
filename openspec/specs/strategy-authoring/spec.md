# Strategy Authoring Specification

## Purpose

How a user browses, forks, edits, reviews, applies and retires the strategies
that drive their agents.

This capability carries the product's largest blast radius: a change to a
strategy reaches every agent bound to it, at once, the moment it is applied. The
requirements here exist to make that visible before it happens and provable
afterwards.

## Requirements

### Requirement: A Strategy Shows How Many Agents It Governs
Wherever a strategy is presented, Grid-Commander SHALL state how many of the
user's agents are bound to it. It MUST NOT present a strategy as an isolated
object.

#### Scenario: Browsing strategies
- **WHEN** a user views the strategies available to them
- **THEN** each one states how many of their agents it currently governs
- **AND** which are the platform's and which are their own

#### Scenario: Beginning an edit
- **WHEN** a user starts editing a strategy that governs agents
- **THEN** they are told, before composing anything, how many agents the edit
  would reach

#### Scenario: A strategy governing nothing
- **WHEN** a strategy has no agents bound to it
- **THEN** that is stated as plainly as a large number would be

### Requirement: Compiling Changes Nothing And Says So
Grid-Commander SHALL let a user compile a proposed change and see its full
consequence without any change being made. Compiling MUST NOT alter a strategy,
and the interface MUST NOT present compiling and applying as equivalent actions.

#### Scenario: Compiling a change
- **WHEN** a user compiles a proposed change
- **THEN** they are shown what would change, whether it would work, what it would
  conflict with, and how many agents it would reach
- **AND** the strategy is unchanged

#### Scenario: Abandoning after compiling
- **WHEN** a user compiles and then leaves without applying
- **THEN** nothing has changed
- **AND** no record claims otherwise

#### Scenario: The two actions are distinguishable
- **WHEN** a user is offered both compiling and applying
- **THEN** applying is presented as the act with consequences and compiling as
  the act without
- **AND** applying is not reachable without a compiled result to apply

### Requirement: What Is Applied Is What Was Reviewed
Grid-Commander SHALL apply only a plan the platform itself compiled, exactly as
compiled. It MUST NOT reconstruct, amend or supplement a plan between review and
application.

#### Scenario: Applying a reviewed plan
- **WHEN** a user applies a plan they have reviewed
- **THEN** what is sent is the compiled plan, unaltered
- **AND** the result reported is the platform's, not a prediction

#### Scenario: The plan cannot be resubmitted as received
- **WHEN** the compiled result contains material the platform will not accept back
- **THEN** only the parts that constitute the plan are sent
- **AND** the omission is a defined transformation, not a per-caller judgement

#### Scenario: The composed change is edited after compiling
- **WHEN** a user changes their intent after compiling
- **THEN** the previous compiled plan is no longer offered for application
- **AND** they must compile again to apply

### Requirement: An Unusable Plan Is Refused Before It Is Sent
Where Grid-Commander can determine that a compiled plan will not be accepted, it
SHALL refuse it locally and say why. It MUST NOT treat its own determination as
evidence that a plan *will* be accepted.

#### Scenario: The plan has expired
- **WHEN** a user applies a plan whose window has passed
- **THEN** they are told it expired and invited to compile again
- **AND** nothing is sent

#### Scenario: The plan belongs to someone else
- **WHEN** a plan is presented that was not compiled for this user and this
  strategy
- **THEN** it is refused
- **AND** nothing is sent

#### Scenario: A plan that looks usable
- **WHEN** a plan appears valid by every check Grid-Commander can make
- **THEN** it is submitted
- **AND** the platform's judgement decides the outcome, not Grid-Commander's

### Requirement: Applying Requires Confirmation Naming The Blast Radius
Before a strategy change is applied, Grid-Commander SHALL present the platform's
own description of the operation, including how many agents it reaches, and MUST
NOT apply until the user confirms that specific plan.

#### Scenario: Confirming an apply
- **WHEN** a user is asked to confirm applying a plan
- **THEN** they are shown what will change, at which revision, and how many
  agents and open positions were observed
- **AND** the description shown is the platform's account of the operation

#### Scenario: Confirmation is withheld
- **WHEN** a user does not confirm
- **THEN** the strategy and every agent bound to it are unchanged

#### Scenario: A confirmation is reused for a different plan
- **WHEN** a confirmation issued for one plan is presented for another
- **THEN** it is refused

### Requirement: Advisory Findings Are Shown, Not Enforced
Where the platform reports concerns about a compiled plan that do not make it
unviable, Grid-Commander SHALL show them and permit the user to proceed. It MUST
NOT refuse an application the platform would accept.

#### Scenario: A viable plan with concerns
- **WHEN** a compiled plan is viable but the platform reports concerns
- **THEN** the concerns are shown
- **AND** the user may still apply

#### Scenario: A plan that is not viable
- **WHEN** the platform reports the plan as not viable
- **THEN** the user is told why and applying is not offered

### Requirement: Vocabulary Is Discovered, Never Written Down
Every value a strategy is composed from SHALL be obtained from the platform at
the time of use. Grid-Commander MUST NOT offer, accept, or validate against a
list of platform vocabulary fixed at build time.

#### Scenario: Composing a change
- **WHEN** a user composes a change involving the platform's vocabulary
- **THEN** the available categories, metrics, signals and their constraints come
  from the platform

#### Scenario: The vocabulary cannot be read
- **WHEN** the vocabulary cannot be obtained
- **THEN** composing is not offered
- **AND** the user is told why

### Requirement: A Private Copy Is How A Platform Strategy Is Changed
Where a strategy belongs to the platform rather than the user, Grid-Commander
SHALL offer to make a private copy rather than presenting it as editable.

#### Scenario: A platform strategy
- **WHEN** a user wants to change a strategy the platform owns
- **THEN** they are offered a private copy to change instead
- **AND** the original is not presented as editable

#### Scenario: Capacity for a new strategy
- **WHEN** a user has no room for another strategy
- **THEN** they are told before they begin, and what governs the limit

### Requirement: Retiring A Strategy Accounts For What Depends On It
Grid-Commander SHALL state, before a strategy is archived, what is bound to it.
Restoring MUST NOT be presented as guaranteed where the platform may refuse it.

#### Scenario: Archiving a strategy
- **WHEN** a user archives a strategy
- **THEN** they are first told how many agents are bound to it
- **AND** archiving is described as reversible

#### Scenario: Restoring is refused
- **WHEN** the platform will not restore a strategy as it stands
- **THEN** the user is told it needs rebuilding rather than being told it failed
- **AND** they are directed to the path that can rebuild it

### Requirement: An Empty Catalog Says So
Where the catalog contains nothing, the product SHALL say so. It MUST NOT
present an empty catalog as though it could not be read, MUST NOT present a
failed read as though the catalog were empty, and MUST NOT offer an action
against strategies that were not returned.

The two states are indistinguishable as blank space, and only one of them is
true of the account. Telling someone their catalog is empty when the platform
simply did not answer is how they conclude their work is gone — the same reason
`agent-authoring` distinguishes them for the roster.

#### Scenario: The catalog comes back with nothing in it
- **WHEN** the platform returns no strategies
- **THEN** the user is told that nothing is listed
- **AND** this is not presented as a failure to read

#### Scenario: Told apart from a failure
- **WHEN** the catalog cannot be read from BattleGrid
- **THEN** the user is told it could not be read, not that it is empty
- **AND** nothing on the page suggests the strategies no longer exist

#### Scenario: No action is offered against what was not returned
- **WHEN** nothing is listed
- **THEN** the product does not offer to fork, edit, or archive anything
- **AND** it does not describe a next step that depends on a strategy the
  platform did not return

#### Scenario: Which case it is, is not decided by the surface
- **WHEN** the product determines that a catalog is empty
- **THEN** that is carried from where the platform was read
- **AND** a surface cannot arrive at it by counting what it was handed
