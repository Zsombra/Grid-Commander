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
it reads, how it reasons, when it acts, what it weighs, and the conditions that
gate direction — and MUST NOT present a summary as though it were the whole.

A roster row is a summary by design: it carries a count of sections rather than
the sections. Treating that as the complete picture is how a product ends up
offering to edit a strategy while holding nothing but its name, which is both
useless and misleading about what a change would do.

Conditions are part of "everything" for the same reason. A strategy whose
direction is decided by a negated flow filter, shown without that filter, is not
under-described — it is described wrongly, and the operator who retunes it from
that view is working blind to the thing that acts.

#### Scenario: Looking at a strategy
- **WHEN** a user opens a strategy
- **THEN** they see its identity, the context sources it reads, the instruction
  it reasons with, the thresholds that decide when it acts, and the signals it
  weighs
- **AND** they see the conditions the strategy defines, if it defines any
- **AND** they see how many agents it governs and how many positions are open
  under it

#### Scenario: A strategy that defines no conditions
- **WHEN** a user opens a strategy whose condition list is empty
- **THEN** the strategy is shown as having no conditions
- **AND** this is distinguished from a strategy whose conditions could not be
  read

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

**Where the platform publishes the ceilings a preview runs under, they SHALL be
shown while composing** — that is when they can change a decision, and a refusal
after the fact already carries the platform's own words. Where the platform
publishes no ceiling, none SHALL be shown: a limit this product invented would be
read as the platform's and composed against.

**A limit SHALL be applied only in the unit of the value it bounds.** Where the
platform publishes the same limit in more than one unit, the product SHALL use
the one matching the field it constrains.

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

#### Scenario: The ceilings a preview runs under
- **WHEN** the platform publishes preview execution limits
- **THEN** they are shown where sections are composed
- **AND** stated as what would be refused rather than truncated

#### Scenario: No ceiling published
- **WHEN** the platform publishes no preview limits
- **THEN** none is shown and no default is substituted

#### Scenario: One limit published in two units
- **WHEN** the platform publishes a bound as both a fraction and a percentage
- **THEN** the one matching the bounded field's unit is applied
- **AND** a value valid under that bound is never refused by a unit mismatch

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

### Requirement: A Signal Rule Is Retuned Only Through The Ceremony

The product SHALL let a user change one signal rule on a strategy — its
allocation, its Required flag, and the signal's declared strict parameters —
only through describe-then-perform. The describe SHALL read the strategy
fresh, refuse a signal that is not among its rules and a change that
changes nothing, state the consequence with the strategy's bound-agent
count and the platform's own propagation wording, and mint a confirmation
bound to the strategy, the revision that was read, the signal, and the
exact proposed values. The perform SHALL send precisely the described
values with the revision the describe read, and MUST be refused when the
token does not match them. A platform refusal SHALL return to the surface
acted from with the platform's reason.

#### Scenario: Describing a retune names the blast radius
- **GIVEN** a strategy with three bound agents carrying `rsi_oversold`
- **WHEN** the user proposes allocation 3, required
- **THEN** the consequence names the strategy, the signal, the proposed
  values, and the three agents reconfigured immediately
- **AND** states that open positions do not block the edit

#### Scenario: The token binds the exact values
- **GIVEN** a confirmation minted for allocation 1
- **WHEN** the perform is submitted with allocation 3
- **THEN** the write is refused and nothing reaches the platform tool

#### Scenario: A signal the strategy does not carry is refused without a token
- **WHEN** the user opens a retune for a signal absent from the rules
- **THEN** the page says the strategy does not weigh that signal
- **AND** no confirmation is minted

#### Scenario: A change that changes nothing is refused without a token
- **WHEN** the proposed values equal the rule's current values
- **THEN** the describe refuses as a no-op and no confirmation is minted

#### Scenario: A stale revision is refused honestly
- **GIVEN** the strategy changed after the describe
- **WHEN** the perform runs
- **THEN** the platform's revision refusal is shown on the surface acted
  from, and the user is returned to a fresh describe

#### Scenario: The change is proven by the re-read
- **WHEN** a retune succeeds
- **THEN** the user lands on the strategy read fresh, showing the new value

### Requirement: A Composition Can Be Previewed As The Agent Reads It

The product SHALL let a user preview a strategy's current composition
without saving or changing anything: the rendered report text per section
as an agent would receive it over a bounded live coin selection the user
chooses, budget usage as used-against-cap for every gauge the platform
declares — **the estimated token count among them, since v9.0.0 publishes it
that way** — with the counting model named, and — derived from the same
composition — which signals the report can feed, with the platform's default
allocation for each, and which it cannot. The preview reads the strategy fresh;
a platform refusal SHALL be shown in the platform's words, and an unreadable
strategy SHALL never render as an empty preview.

**A cost SHALL be shown against its ceiling.** A bare figure cannot answer the
question an author actually has, which is not "how large is this" but "how much
room is left". Grid-Commander SHALL NOT reconstruct a figure the platform has
stopped publishing, nor report as unavailable a figure it is displaying
elsewhere on the same surface.

**The preview SHALL also show how the strategy's conditions resolve**, per coin,
where the platform resolves them. The preview is the one surface holding live
market state, so it is the only place the question *would this rule fire right
now* can be answered at all. The product SHALL send the conditions the strategy
defines so that they can be resolved, and SHALL distinguish a strategy that
defines no conditions from one whose conditions the platform returned no outcome
for.

#### Scenario: The agent's-eye report
- **GIVEN** a strategy with sections composed
- **WHEN** the user previews it over the top ranked coins
- **THEN** each section renders its title and the platform's actual report
  text
- **AND** each budget gauge shows used against its cap, the token estimate
  included
- **AND** the model that did the counting is named as a note on the measurement

#### Scenario: A figure the platform no longer publishes
- **WHEN** the platform stops returning a figure it once returned separately
- **THEN** no surface claims that figure is unavailable while showing it in
  another form
- **AND** it is not reconstructed from the form that replaced it

#### Scenario: Which signals the composition feeds
- **WHEN** the preview renders
- **THEN** the signals the report can feed are listed with their platform
  default allocations
- **AND** the count of signals the composition cannot feed is stated

#### Scenario: How the conditions resolve on each coin
- **GIVEN** a strategy that defines conditions
- **WHEN** the user previews it over a coin selection
- **THEN** each coin is named, with the platform's outcome for each condition
  on it
- **AND** the outcome shown is the platform's own, never one derived here

#### Scenario: A strategy that defines no conditions
- **WHEN** a strategy with no conditions is previewed
- **THEN** the preview says direction is decided by its signals alone
- **AND** this is distinguished from a strategy whose conditions the platform
  returned no outcome for

#### Scenario: Nothing is written
- **WHEN** a preview runs
- **THEN** no write reaches the platform and the strategy is unchanged

#### Scenario: A refused preview teaches
- **GIVEN** the platform refuses the composed draft
- **WHEN** the preview runs
- **THEN** the refusal is shown in the platform's words on the same page

### Requirement: A Custom Table Is Carried Whole

A custom report section read from the platform SHALL keep its own
definition — title, section timeframe, and columns — and the product SHALL
send that definition back whenever the platform requires a self-contained
section. A strategy holding a custom table SHALL preview exactly as one
holding only platform sections does.

#### Scenario: A custom table read and previewed
- **GIVEN** a strategy whose report includes a custom table
- **WHEN** the user previews the composition
- **THEN** the table renders with its title and columns
- **AND** the preview is not refused

#### Scenario: A platform section carries no definition of its own
- **WHEN** a platform section is sent for preview
- **THEN** only its kind and key are sent

### Requirement: A Weighting Change Can Be Scored Before It Is Saved

The product SHALL let a user change the allocation of the signals that
fired on a real evaluation and see the resulting aggregate score, the
per-signal attribution, and whether the result would cross the gate that
was in force — without saving anything.

The signals offered SHALL be those the evaluation actually fired, at the
allocations actually in force, so the unchanged form reproduces the
evaluation's own score.

#### Scenario: Re-weighting a signal
- **GIVEN** an evaluation whose signals fired at known allocations
- **WHEN** the user changes an allocation and asks for the result
- **THEN** the recomputed aggregate is shown
- **AND** whether it would cross the gate is shown
- **AND** nothing about the strategy or the agent is changed

#### Scenario: The unchanged form reproduces reality
- **GIVEN** an evaluation the user has not re-weighted
- **WHEN** the what-if is offered
- **THEN** the allocations shown are those that were in force

### Requirement: A Simulated Result Is Never Shown As What Happened

Where the product shows a simulated score, it SHALL state that the result
did not occur, and SHALL show it alongside the real score it departs from.
A simulated figure SHALL NOT be rendered in a way that could be read as the
evaluation's own outcome.

#### Scenario: A simulation is labelled
- **GIVEN** a recomputed aggregate
- **WHEN** it renders
- **THEN** it is stated not to have happened
- **AND** the evaluation's real score is shown beside it

### Requirement: An Evaluation The Simulator Cannot Take Says So

Where an evaluation fired more signals than the platform's simulator
accepts, the product SHALL say the evaluation cannot be simulated and why.
It SHALL NOT drop signals to fit.

#### Scenario: Too many signals fired
- **GIVEN** an evaluation that fired more signals than the simulator accepts
- **WHEN** the page renders
- **THEN** it says the evaluation cannot be re-scored, and why
- **AND** no partial simulation is offered

#### Scenario: The platform refuses a simulation
- **GIVEN** the platform refuses a simulation request
- **WHEN** the result renders
- **THEN** the refusal is shown
- **AND** no score is invented in its place

### Requirement: A Condition Is Shown As The Structure It Is

Grid-Commander SHALL present a condition's definition as readable structure
rather than as the payload it arrived in: each comparison stated in words
against the column it reads, each grouping stating how many of its members must
hold, a negation shown as negating, and a reference to another condition shown
by the name of the condition it refers to.

A condition can nest arbitrarily. The presentation MUST show that nesting rather
than flattening it, because a member of a group and a member of a group inside a
`NOT` mean opposite things.

#### Scenario: A comparison against a column
- **GIVEN** a condition comparing a report column to a value or a label
- **WHEN** it is shown
- **THEN** the column it reads, the comparison, and the value or label are
  legible without reading the underlying payload

#### Scenario: A threshold group
- **GIVEN** a condition requiring some number of its members to hold
- **WHEN** it is shown
- **THEN** how many must hold, and out of how many, is stated

#### Scenario: A negation
- **GIVEN** a condition containing a negated member
- **WHEN** it is shown
- **THEN** the negation is visible as part of the structure
- **AND** the negated member is not presented as a requirement that must hold

#### Scenario: A reference to another condition
- **GIVEN** a condition referring to another condition by key
- **WHEN** it is shown
- **THEN** it names the condition referred to
- **AND** a reference whose target is not present in the strategy is shown as
  unresolved rather than silently omitted

#### Scenario: A form the product does not recognise
- **GIVEN** a condition using a form this product does not model
- **WHEN** it is shown
- **THEN** the strategy still renders
- **AND** the unrecognised part is reported as not understood rather than
  dropped or guessed at

### Requirement: A Named Building Block Is Never Shown As A Directional Call

A condition that carries no verdict SHALL be presented as a named building block
— something other conditions refer to — and MUST NOT be presented as a way the
strategy decides direction.

Where conditions are listed, the ones that decide direction SHALL be
distinguishable from the ones that only assemble into them.

#### Scenario: A strategy mixing building blocks and calls
- **GIVEN** a strategy with conditions that carry verdicts and conditions that
  do not
- **WHEN** its conditions are shown
- **THEN** the ones carrying a verdict are distinguishable from the ones that do
  not
- **AND** the count of ways the strategy decides direction does not include the
  building blocks

#### Scenario: A verdict of neither
- **GIVEN** a condition whose verdict is neither up nor down
- **WHEN** it is shown
- **THEN** it is shown as a directional call that resolves to neither
- **AND** it is not shown as a building block

### Requirement: Grid-Commander Never Decides Whether A Condition Holds

Grid-Commander SHALL NOT evaluate a condition. Where the platform reports
whether one held, that answer MAY be shown; where it does not, the product
SHALL show the definition and SHALL NOT derive an outcome from column values.

The columns a condition reads are resolved by the platform against market data
this product does not hold. A locally computed verdict would be a different
claim wearing the platform's authority — the same defect as reporting a
platform figure this product had actually derived.

#### Scenario: A condition is shown with no outcome available
- **GIVEN** a surface showing conditions where the platform reports no outcome
- **WHEN** the user views it
- **THEN** the conditions are shown as definitions
- **AND** no verdict is presented as though the platform had given one

#### Scenario: Nothing is computed locally
- **WHEN** any condition is shown
- **THEN** no outcome is derived by this product from column values

### Requirement: A Condition Outcome Shows The Evidence That Decided It

Where the platform explains a condition's outcome clause by clause, the product
SHALL show that explanation: the column read, what was observed, what was
required, and the platform's outcome for that clause. An outcome SHALL NOT be
shown as a bare verdict when the platform supplied its reason.

The observed value against the required one is the whole answer to *why did this
rule not fire*, which is the question the surface exists to answer. A verdict
alone tells an author their rule failed and leaves them to guess at which part.

An evidence entry in a form this product does not model SHALL be reported as not
understood rather than dropped, so a grammar the platform extends shows up as a
named gap rather than as a shorter explanation than the one that was given.

#### Scenario: A clause that did not hold
- **GIVEN** a condition the platform resolved with clause-level evidence
- **WHEN** the outcome is shown
- **THEN** the column the clause reads is named
- **AND** the value observed and the value required are both shown, as the
  platform sent them

#### Scenario: An evidence form the product does not model
- **GIVEN** an evidence entry whose form this product does not model
- **WHEN** the outcome is shown
- **THEN** the outcome still renders
- **AND** the unmodelled entry is reported as not understood rather than omitted

### Requirement: A Provisional Outcome Is Never Shown As Settled

Where the platform marks an outcome provisional — the bar is not closed and the
answer can still change — the product SHALL show it as provisional wherever that
outcome appears, and SHALL NOT present it in a form that could be read as a
settled result.

A provisional outcome and a settled one are different claims about the market. A
surface that renders them identically tells an author a rule has failed when the
platform said only that it has not held yet, which is the same defect as showing
a simulated score as what happened.

#### Scenario: A provisional outcome
- **GIVEN** an outcome the platform marked provisional
- **WHEN** it is shown
- **THEN** it is marked as still able to change, on the outcome itself
- **AND** it is distinguishable from an outcome the platform did not mark

#### Scenario: Counting what is settled
- **WHEN** outcomes are summarised for a coin
- **THEN** the provisional ones are stated as provisional
- **AND** they are not counted as settled results

### Requirement: An Unresolved Member Is Never Counted As False

Where the platform reports counts for a threshold group, the product SHALL show
the number of members that held, the number that could not be resolved, and the
total, each as the platform sent it. It SHALL NOT sum the unresolved into the
false, and SHALL NOT derive a false count of its own.

Unresolved is a third state: a member the platform could not answer for, usually
because the report does not carry the column it reads. Folding it into "did not
hold" reports a rule as failing where the platform reported that it could not
tell — and the distinction is invisible in the declared schema, so nothing but
this requirement protects it.

#### Scenario: A threshold group with unresolved members
- **GIVEN** a group whose counts carry an unresolved count
- **WHEN** the counts are shown
- **THEN** held, unresolved, and total are each shown as sent
- **AND** no count of members that did not hold is computed here

#### Scenario: A condition that is not a threshold group
- **GIVEN** a condition for which the platform sent no counts
- **WHEN** it is shown
- **THEN** no counts are shown for it
- **AND** the absence is not rendered as zero of zero
