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

**A local refusal SHALL rest on a fact the product actually holds.** *"Where
Grid-Commander can determine"* is the load-bearing clause and it was not honoured:
the account check compared BattleGrid's claim about which account compiled a plan
against an identifier that was never BattleGrid's — the string `'owner'` in one
deployment mode, a random sixteen-byte local id in the other. That is not a
determination. It made the product's headline capability, applying a compiled plan,
unreachable in every configuration from the day it was built.

**Where the product cannot establish the fact, it SHALL NOT refuse on that
ground.** Unknown is not mismatched. The platform holds the authoritative answer
and refuses a foreign plan itself; a local check exists to give a better message
sooner, never to invent a reason the user cannot act on.

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

#### Scenario: A plan compiled with this deployment's own credential
- **WHEN** a user applies a plan compiled by this deployment
- **THEN** it is not refused on the grounds of which account compiled it

#### Scenario: The acting account is not known
- **WHEN** the product cannot establish which account it is acting as
- **THEN** it does not refuse on that ground
- **AND** the platform decides

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

#### Scenario: Section vocabulary is fetched per category
- **WHEN** a user edits a strategy
- **THEN** the available sections within each category are fetched from
  BattleGrid at that moment
- **AND** the result is not a list Grid-Commander compiled at build time

#### Scenario: The vocabulary cannot be read
- **WHEN** the vocabulary cannot be obtained
- **THEN** composing is not offered
- **AND** the user is told why

### Requirement: A Private Copy Is How A Platform Strategy Is Changed
Where a strategy belongs to the platform rather than the user, Grid-Commander
SHALL offer to make a private copy rather than presenting it as editable.

**Where the copy cannot be made, it SHALL NOT be offered.** Telling a user they
are at capacity and then rendering the control twelve times on the same screen
is not a warning, it is a warning ignored by its own page. The platform refuses
the call — *"Strategy limit reached — you can have at most 25 active
strategies"* — so every one of those controls leads to a refusal the page could
have made unnecessary.

This is the rule the product already applies to a delete button it never built
and to a rename input it stopped rendering: a control that cannot work is not
offered, and its absence is explained where it would have been. Explaining the
absence is the half that matters — a control that simply vanishes reads as the
page forgetting rather than refusing.

#### Scenario: A platform strategy
- **WHEN** a user wants to change a strategy the platform owns
- **THEN** they are offered a private copy to change instead
- **AND** the original is not presented as editable

#### Scenario: Capacity for a new strategy
- **WHEN** a user has no room for another strategy
- **THEN** they are told before they begin, and what governs the limit

#### Scenario: The copy that cannot be made
- **WHEN** a user is at capacity
- **THEN** the control that would make a copy is not offered
- **AND** its absence is explained where it would have been

### Requirement: Retiring A Strategy Accounts For What Depends On It
Grid-Commander SHALL state, before a strategy is archived, what is bound to it.
Restoring MUST NOT be presented as guaranteed where the platform may refuse it.

**Declining SHALL return the user to what they were looking at.** Someone who
opens an archive confirmation and decides against it has not finished with the
strategy — sending them to the list loses their place and makes the safe choice
the more costly one.

#### Scenario: Archiving a strategy
- **WHEN** a user archives a strategy
- **THEN** they are first told how many agents are bound to it
- **AND** archiving is described as reversible

#### Scenario: Declining to archive
- **WHEN** a user decides not to archive
- **THEN** they are returned to the strategy rather than to the list

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

### Requirement: A Strategy Can Be Read In Full
Grid-Commander SHALL be able to present everything a strategy is made of — what
it reads, how it reasons, when it acts, and what it weighs — and MUST NOT
present a summary as though it were the whole.

A roster row is a summary by design: it carries a count of sections rather than
the sections. Treating that as the complete picture is how a product ends up
offering to edit a strategy while holding nothing but its name, which is both
useless and misleading about what a change would do.

#### Scenario: Looking at a strategy
- **WHEN** a user opens a strategy
- **THEN** they see its identity, the context sources it reads, the instruction
  it reasons with, the thresholds that decide when it acts, and the signals it
  weighs
- **AND** they see how many agents it governs and how many positions are open
  under it

#### Scenario: A strategy that is archived
- **WHEN** a user opens a private strategy that is not active
- **THEN** it is still readable
- **AND** its inactive state is shown rather than being reported as missing

#### Scenario: A strategy that cannot be read
- **WHEN** the strategy cannot be read from BattleGrid
- **THEN** the user is told it could not be loaded
- **AND** this is distinguished from a strategy that does not exist

#### Scenario: What the summary is for
- **WHEN** the roster is drawn
- **THEN** it uses the summary it already has
- **AND** reading one strategy in full does not become the cost of listing them

### Requirement: Report Sections Can Be Composed When Editing
Grid-Commander SHALL let a user choose which report sections a strategy includes
when editing, presenting available sections discovered from BattleGrid at edit
time. It MUST NOT offer, accept, or validate sections against a list fixed at
build time.

#### Scenario: Current sections are pre-selected
- **WHEN** a user opens the edit form for a strategy they own
- **THEN** each section the strategy currently includes is shown as selected
- **AND** available sections the strategy does not currently include are shown
  as deselected

#### Scenario: Available sections come from the platform
- **WHEN** the vocabulary can be read
- **THEN** sections are presented grouped by the categories BattleGrid returns
- **AND** a section that does not appear in the platform's vocabulary is not
  invented by Grid-Commander

#### Scenario: Section selection is compiled as composed
- **WHEN** a user changes which sections are selected and compiles
- **THEN** the compiled request carries exactly the sections the user chose
- **AND** sections not selected are not present in the compiled request

#### Scenario: Vocabulary unavailable blocks section editing
- **WHEN** the vocabulary cannot be read from BattleGrid
- **THEN** the section checklist is not shown
- **AND** the user is told why composing is not available

### Requirement: The Signal Vocabulary Is Readable

The product SHALL let a user browse every strategy signal the platform
publishes — grouped by module, each with its display name, direction, and
description — and read any one signal's full authoring definition: what it
detects, when it fires, worked examples, best-for and watch-out guidance, its
parameters with bounds and defaults, and the indicators it reads. The
vocabulary is read fresh from the platform; the product MUST NOT hard-code the
signal list. An unreadable vocabulary SHALL be presented as unreadable, never
as an empty library.

#### Scenario: Browsing the signal library
- **GIVEN** a connected account
- **WHEN** the user opens the signal library
- **THEN** every signal the platform lists is shown grouped by its module
- **AND** each shows its display name, direction, and description

#### Scenario: Reading one signal's authoring card
- **GIVEN** the signal library lists `rsi_oversold`
- **WHEN** the user opens that signal
- **THEN** the card states what the signal detects and when it fires
- **AND** shows the platform's worked examples and best-for / watch-out guidance
- **AND** lists each parameter with its bounds, default, and description

#### Scenario: A signal the platform does not list
- **WHEN** the user opens a signal id the platform does not answer for
- **THEN** the page says there is no such signal and offers the library
- **AND** does not render an empty card

#### Scenario: The vocabulary cannot be read
- **GIVEN** the platform does not answer the signal list
- **WHEN** the user opens the signal library
- **THEN** the page says the vocabulary could not be read and why
- **AND** does not render an empty library

### Requirement: The Metric Vocabulary Is Navigable

The product SHALL let a user browse every report metric the platform
publishes — grouped by family, each with its label, native output contract
(unit, precision, range where declared), and the transforms it legally
takes — and read any one metric's full card: the native contract plus every
transform's parameters with defaults and descriptions, its formula and
calculation summary, its null behavior, and what it can chain into. The
vocabulary is read fresh from the platform; the product MUST NOT hard-code
the metric list. An unreadable vocabulary SHALL be presented as unreadable,
never as an empty index.

#### Scenario: Browsing the metric index
- **GIVEN** a connected account
- **WHEN** the user opens the metric index
- **THEN** every metric the platform lists is shown grouped by its family
- **AND** each shows its label, unit, and the transforms it takes

#### Scenario: Reading one metric's card
- **GIVEN** the index lists `RSI14`
- **WHEN** the user opens that metric
- **THEN** the card states the native output contract
- **AND** each transform shows its parameters, defaults, formula, and null
  behavior in the platform's words

#### Scenario: A metric the platform does not list
- **WHEN** the user opens a metric key the platform does not list
- **THEN** the page says there is no such metric and offers the index

#### Scenario: The vocabulary cannot be read
- **GIVEN** the platform does not answer the vocabulary
- **WHEN** the user opens the metric index
- **THEN** the page says the vocabulary could not be read and why
- **AND** does not render an empty index

### Requirement: A Proposed Column Is Checked Against The Platform's Contract

The product SHALL let a user compose a candidate report column — a metric,
a transform, a timeframe, and optional parameters — and have the platform
compile it without reading market values. A valid column SHALL render its
contract: the normalized column, effective parameters, each output's header,
type and meaning, the formula, and how nulls present. The check is a read
and SHALL write nothing.

#### Scenario: A valid column renders its contract
- **GIVEN** the metric card for `RSI14`
- **WHEN** the user checks the `value` transform on the anchor timeframe
- **THEN** the compiled contract is shown — normalized column, outputs with
  types and meanings, the formula, and the null presentation
- **AND** no write occurs

### Requirement: A Refused Column Teaches In The Platform's Words

When the platform refuses a proposed column, the product SHALL present the
refusal as guidance, not as a bare error: the platform's message, the
authoring code, the parameter path it names, the value received, and — when
the refusal declares one — the allowed domain, listed. The product MUST NOT
flatten a structured refusal into a generic failure message.

#### Scenario: An illegal operand names the legal ones
- **GIVEN** a spread column on `RSI14` with an operand the platform rejects
- **WHEN** the check runs
- **THEN** the page shows the platform's explanation of why the operand is
  illegal
- **AND** lists the operands the platform declares legal in its place

#### Scenario: A missing requirement is named
- **GIVEN** a `spread` column proposed with no operand at all
- **WHEN** the check runs
- **THEN** the page shows the platform's message naming what is required
