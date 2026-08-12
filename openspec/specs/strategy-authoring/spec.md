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

**The copy MAY be given a name of the user's own.** The name is optional: left
blank, the platform names the copy `<parent> (fork)`, and the form says so
before the copy is made. Why naming matters is stated no wider than the truth
supports — a name of your own tells your copies apart — and the product SHALL
NOT promise that naming avoids any platform behaviour it has not established. A
chosen name is sent to the platform only when one was given, and the control
accepts no more than the platform's declared bound on it, so the bound is met
by construction rather than discovered by refusal.

**A refused copy returns to the form it was asked from.** The platform's
answer, whatever its code, SHALL reach the user in the platform's own words,
with what they typed preserved — not as a crashed page, and not re-diagnosed
into a cause the platform did not state. The copy is made by `fork_strategy`, a
write that runs on `mcp:read` alone and is not flagged destructive by the
platform.

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

#### Scenario: Naming the copy
- **WHEN** a user gives the copy a name of their own and makes the copy
- **THEN** the copy is requested from the platform under that name
- **AND** the control accepts no more than the platform's declared length bound

#### Scenario: Leaving the name blank
- **WHEN** a user leaves the name blank and makes the copy
- **THEN** no name is sent, and the platform names the copy as it always has
- **AND** the form said which name that would be before they chose

#### Scenario: The platform refuses the copy
- **WHEN** BattleGrid answers the fork with a refusal, whatever its code
- **THEN** the reason is shown in the platform's words, on the form acted from
- **AND** the name the user typed is still in the form
- **AND** no cause the platform did not state is offered

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
it reads, how it reasons, when it acts, what it weighs, the conditions that
gate direction, and the trade-level policy that governs its trades — and MUST
NOT present a summary as though it were the whole.

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
- **AND** they see the trade-level policy — the stop-loss floor, the stop-loss
  ceiling, and the risk:reward minimum

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
a transform, a timeframe, and every optional parameter the platform's column
declaration accepts — and have the platform compile it without reading market
values. A valid column SHALL render its contract: the normalized column,
effective parameters, each output's header, type and meaning, the formula, and
how nulls present. The check is a read and SHALL write nothing.

**The check SHALL be reachable from a section's own columns**, seeded from the
column as the platform declared it, so that tuning starts from what the section
actually renders rather than from a blank form.

**A metric SHALL be established as one the platform lists before it is sent.**
A key that reaches this product from a URL is not a key the platform published,
and the platform enum-rejects an unknown one — so an unlisted metric SHALL be
reported as no such metric, distinctly from a platform that could not be asked.

A form that does not describe a column SHALL NOT be sent. Where the composer
cannot turn what was entered into a column at all, the surface SHALL say so in
its own words and state that nothing was asked of the platform — never present
its own refusal as the platform's.

#### Scenario: A valid column renders its contract
- **GIVEN** the metric card for `RSI14`
- **WHEN** the user checks the `value` transform on the anchor timeframe
- **THEN** the compiled contract is shown — normalized column, outputs with
  types and meanings, the formula, and the null presentation
- **AND** no write occurs

#### Scenario: Checking a column the section already renders
- **GIVEN** a section template whose columns the platform published
- **WHEN** the user opens one of those columns in the editor
- **THEN** the editor is seeded with that column's own metric, transform,
  timeframe and parameters
- **AND** the platform's contract for it is shown

#### Scenario: A metric the platform does not list
- **WHEN** a column names a metric the platform's vocabulary does not list
- **THEN** the surface says there is no such metric
- **AND** no column carrying it is sent to the platform

#### Scenario: A form that does not describe a column
- **WHEN** the composer cannot turn the entered values into a column
- **THEN** the surface says what is unfinished, in its own words
- **AND** states that nothing was sent to BattleGrid

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

### Requirement: A Drafted Condition Can Be Tried Without Being Saved

The product SHALL let a user compose a condition that the strategy does not
carry — its key, its name, the direction it calls or none, whether the
strategy insists on it, and a definition built from the platform's grammar —
and have the platform resolve that draft against live market state on a coin
selection the user chooses, showing the result with the same evidence,
provisional marking and counts as a resolved condition the strategy already
defines.

Whether the draft must hold SHALL default to optional — the platform's own
default — and SHALL become required only by the operator's explicit choice.
A value the control does not offer SHALL compose as optional: a wrong
"optional" understates a draft, a wrong "required" silently hardens a
strategy the operator was composing.

Composing and trying SHALL write nothing. No draft is persisted, no strategy is
altered, and the surface SHALL state that it cannot save rather than leaving a
user to infer it from an absent control. **Saving a draft SHALL be a separate
act**: a separate request, against a fresh read of the strategy, with its own
description of what would change and its own confirmation. Trying and saving MUST
NOT be the same submission, and the composing surface MUST NOT itself write.

This is the question authoring begins with. Reading a condition answers *what
does this rule say* and reading its outcome answers *what did it do*; neither
answers *what would a different rule have done*, which is the only one that can
change a decision. The platform resolves a draft for free — the tool that
renders a preview takes conditions as an argument and resolves exactly what it
is given — so the answer costs a read this product was already making.

The composer MAY build a narrower grammar than the platform accepts. Where it
does, the limit SHALL be stated where composing happens, and a strategy carrying
a form the composer cannot build SHALL still be readable in full. **A draft
SHALL also be able to start from a condition the strategy already carries**,
taking that condition's definition — and whether it must hold — whole at
whatever depth it has — otherwise the conditions most worth asking a question
about, the deeply nested ones, are exactly the ones no question can be asked
about.

#### Scenario: A draft resolved against live coins
- **GIVEN** a strategy the user can read
- **WHEN** the user composes a condition and asks for it to be tried over a coin
  selection
- **THEN** each coin is named, with the platform's outcome for the drafted
  condition on it
- **AND** the outcome shown is the platform's own, never one derived here

#### Scenario: A draft that must hold
- **WHEN** the user composes a draft and explicitly chooses that it must hold
- **THEN** the draft is composed as required
- **AND** with no choice made, or a value the control does not offer, it is
  composed as optional — the platform's own default

#### Scenario: Trying saves nothing
- **WHEN** a draft is tried
- **THEN** no write reaches the platform and the strategy is unchanged
- **AND** the surface says that trying a draft does not save it

#### Scenario: Saving is a second act, described afresh
- **GIVEN** a draft the user has tried
- **WHEN** the user chooses to save it
- **THEN** the strategy is read again and what would change is described again
- **AND** nothing is written until that description is agreed to

#### Scenario: The platform refuses the drafted condition
- **GIVEN** the platform refuses the composition the draft was sent in
- **WHEN** the draft is tried
- **THEN** the refusal is shown in the platform's words on the same page
- **AND** no outcome is invented in its place

#### Scenario: A grammar the composer does not build
- **WHEN** the composer offers less of the grammar than the platform accepts
- **THEN** what it cannot build is stated where composing happens
- **AND** a strategy carrying such a form is still shown in full elsewhere

#### Scenario: Starting from a condition the strategy already has
- **GIVEN** a strategy defining a condition nested deeper than the composer builds
- **WHEN** the user starts a draft from it
- **THEN** the draft carries that condition's definition, and whether it must
  hold, whole
- **AND** the user can give the draft a different key and a different direction
  without the definition changing

#### Scenario: Starting from a condition that is no longer there
- **GIVEN** a request to start from a condition the strategy does not define
- **WHEN** the surface renders
- **THEN** it says that condition was not found
- **AND** this is distinguished from opening the composer with nothing drafted

### Requirement: A Form The Product Cannot Express Is Never Guessed At

Where a condition carries a form this product read as not understood, the
product SHALL refuse to send it and SHALL name the part it could not express.
It MUST NOT substitute a shape of its own, drop the part, or send the condition
without it.

Everything the product *can* express SHALL be sent to the platform as composed.
An illegal key, an unknown column, a threshold outside the platform's bounds —
these are refused by BattleGrid with its own reason, and that reason is the
content this surface exists to show. Checking them here first would replace the
platform's teaching with this product's guess about a vocabulary that is still
being extended.

The asymmetry is deliberate and is the whole requirement. Reading an unfamiliar
form and reporting it as not understood costs a reader nothing. Writing one back
means inventing a shape for a grammar the platform is still rolling out, and an
invented shape is indistinguishable from the operator's intent once it is sent.

#### Scenario: A draft containing a form the product does not model
- **GIVEN** a condition carrying a part this product reported as not understood
- **WHEN** the user tries it
- **THEN** nothing is sent to the platform
- **AND** the part that could not be expressed is named

#### Scenario: A value the platform will refuse
- **GIVEN** a draft the product can express but the platform will not accept
- **WHEN** the user tries it
- **THEN** it is sent as composed
- **AND** the platform's refusal is shown rather than a local objection raised in
  its place

### Requirement: What Is Sent To Be Resolved Is What The User Is Told Was Sent

Where the product composes a list of conditions to be resolved, it SHALL tell
the user what that list contains: which conditions came from the strategy, that
the draft was added to them, and — where the draft's key matches one the
strategy defines — that the draft stands in that condition's place rather than
beside it.

A condition may refer to another by key, and the platform resolves only the
conditions it is given. So a draft cannot be resolved alone: it is resolved
inside a list this product assembles, and an operator who is not told what that
list holds cannot tell an outcome caused by their draft from one caused by its
neighbours.

A key appearing twice in one list SHALL never be sent. Two conditions with one
key is a list with no answer to which of them a reference names, and the
resulting outcome would be attributed to a draft that may not have produced it.

#### Scenario: A draft that adds to the strategy's conditions
- **GIVEN** a strategy defining conditions, and a draft whose key none of them
  uses
- **WHEN** the draft is tried
- **THEN** the user is told the draft was resolved alongside the strategy's own
  conditions
- **AND** the strategy's conditions are resolved as they stand

#### Scenario: A draft that replaces one of them
- **GIVEN** a draft whose key matches a condition the strategy defines
- **WHEN** the draft is tried
- **THEN** the user is told the draft stood in that condition's place
- **AND** the list sent carries that key exactly once

### Requirement: A Section Template Shows The Columns It Renders

The product SHALL let a user open any section template the platform's vocabulary
advertises and see the columns that template renders, as the platform declared
them — the metric, the transform, the timeframe, and every parameter the entry
carries. The columns SHALL be the platform's own; the product MUST NOT compose,
complete or reorder them.

A template whose entry publishes no columns SHALL be shown as *not published*,
never as a section with no columns. A vocabulary that cannot be read SHALL be
shown as unreadable, never as an empty library.

A key the platform's column entry carries that this product does not carry
SHALL be named on the surface rather than dropped. The column grammar is the
platform's and it has already gained two controls in one deployment; a surface
that silently keeps the parts it recognises reports a narrower column than the
one the platform declared.

#### Scenario: Opening a section template
- **GIVEN** the vocabulary advertises a section template
- **WHEN** the user opens it
- **THEN** each column that template renders is shown with its metric,
  transform and timeframe as the platform declared them
- **AND** the parameters the entry carries are shown beside them

#### Scenario: A template that publishes no columns
- **WHEN** a template's entry carries no columns
- **THEN** the surface says the platform did not publish them
- **AND** does not present the template as rendering nothing

#### Scenario: A column key the product does not carry
- **GIVEN** a column entry carrying a key this product does not model
- **WHEN** the column is shown
- **THEN** the column still renders
- **AND** the unmodelled key is named as not carried rather than omitted

#### Scenario: A section key the platform does not advertise
- **WHEN** the user opens a section key the vocabulary does not list
- **THEN** the page says there is no such section and offers the library

#### Scenario: The vocabulary cannot be read
- **WHEN** the section vocabulary cannot be read
- **THEN** the library says so and why
- **AND** does not render an empty list of sections

### Requirement: An Enumerated Column Control Is Read From The Declaration Or Withheld

Every column control whose values the platform pins to an enumeration — the
relative and absolute timeframes, `bars`, `ordering`, the support/resistance
side — SHALL be offered from the values the platform's own tool declaration
carries at the time of use. Grid-Commander MUST NOT offer, accept or validate
such a control against a list fixed at build time.

This binds **every surface that composes or checks a column**, not one editor:
the section editor and the metric workbench offer the same declared controls
from the same read. Classifying a value against a fixed list is the same
defect as offering one — a reader that sorts a bare timeframe into
relative-or-absolute by consulting a built-in list of the relative names
misfiles every relative timeframe the platform adds later, so a composed
timeframe SHALL travel in a form that carries its own kind and no surface
SHALL classify one by list membership.

Where the declaration cannot answer for a control — discovery failed, the tool
is gone, nothing is pinned at that path — the control SHALL NOT be offered, and
the surface SHALL say that the platform's declaration did not name its values.
An absent control and a control with no legal values must not look alike: the
first is a platform that has moved, the second would be a product that invented
an empty set.

#### Scenario: A control the declaration pins
- **GIVEN** the platform's column tool declares the values a control accepts
- **WHEN** the column editor renders
- **THEN** that control offers exactly the declared values
- **AND** offers no value the declaration does not carry

#### Scenario: A control the declaration cannot answer for
- **GIVEN** the declaration names no values at a control's path
- **WHEN** the column editor renders
- **THEN** the control is not offered
- **AND** the surface says the platform's declaration did not name its values

#### Scenario: A control the platform adds
- **GIVEN** the platform widens an enumeration in a deployment
- **WHEN** the editor is next rendered
- **THEN** the new value is offered without a change to this product

#### Scenario: The metric workbench offers the declared controls
- **GIVEN** a metric's card at the metric workbench
- **WHEN** the check form renders
- **THEN** the timeframe, `bars`, `ordering` and side controls offer exactly
  the declared values, or state that the declaration did not name them
- **AND** no timeframe list is written into this product's source

#### Scenario: A timeframe arrives untagged
- **GIVEN** a metric-workbench URL whose `tf` value does not carry its kind
- **WHEN** the page reads the form
- **THEN** the composer says a timeframe must be chosen, in its own words
- **AND** states that nothing was sent to BattleGrid
- **AND** the value is never sorted into relative or absolute by a built-in
  list

### Requirement: A Composed Column Says Where It Cannot Be Saved

A surface that composes a report column without saving it SHALL say so on the
page, in the same view as the composer, and SHALL state what the column can and
cannot reach.

Where the platform's own compile request accepts a section by key alone and
carries no columns for it, the surface SHALL say that the section's contents
belong to the platform and that membership is the only choice an author makes
about it. A composer that implied otherwise would invite an author to tune
something the platform will never read.

#### Scenario: Nothing composed here is saved
- **WHEN** the column editor renders
- **THEN** the page states that nothing composed on it is saved
- **AND** states what would be needed for a composed column to reach a strategy

#### Scenario: A platform section's contents are the platform's
- **GIVEN** a section the platform provides
- **WHEN** its columns are shown
- **THEN** the surface says the compile request carries no columns for it
- **AND** says that including or omitting the section is the choice available

### Requirement: A Condition Is Written Only As The Whole List, Behind The Ceremony

The product SHALL let a user add a condition to a strategy, change one the
strategy carries, or remove one — only through describe-then-perform. The
describe SHALL read the strategy fresh, compose the strategy's **entire**
condition list with the edit applied, have the platform compile it, and mint a
confirmation bound to that compiled plan. The perform SHALL apply the plan that
was described and no other, and MUST be refused when the confirmation does not
match it.

The list is what is written because the list is what the platform takes. No tool
writes one condition; the only path submits the whole array inside a plan that
reconfigures every bound agent atomically. A surface that spoke of writing one
condition would be describing an operation the platform does not offer.

The conditions the strategy already carries SHALL travel as the platform sent
them, never rebuilt from this product's reading of them. Only a condition that
has no platform object of its own — one the user composed — is serialised, and a
composed condition carrying a form this product did not understand SHALL NOT be
written back at all.

A refusal — from the compiler, from the applier, or from a revision that moved —
SHALL return to the surface acted from, in the platform's words, with the edit
preserved so a fresh describe runs against the strategy as it now stands.

#### Scenario: Adding a condition submits every condition
- **GIVEN** a strategy defining two conditions
- **WHEN** the user saves a drafted third
- **THEN** the request carries all three, in order
- **AND** the two the strategy already had are sent exactly as the platform gave
  them

#### Scenario: A draft whose key the strategy already uses stands in its place
- **WHEN** the user saves a draft whose key matches a condition the strategy
  defines
- **THEN** the list carries that key exactly once
- **AND** the user is told the draft replaced that condition rather than joining it

#### Scenario: A condition is removed
- **GIVEN** a strategy defining two conditions
- **WHEN** the user removes one
- **THEN** the list submitted carries the other alone

#### Scenario: Removing something the strategy does not define
- **WHEN** a removal names a key the strategy does not carry
- **THEN** the surface says so, distinctly from an empty form
- **AND** no plan is compiled and no confirmation is minted

#### Scenario: A form the product cannot express is never written back
- **GIVEN** a draft carrying a part this product reported as not understood
- **WHEN** the user saves it
- **THEN** nothing is compiled and nothing is sent
- **AND** the part that could not be expressed is named

#### Scenario: The agreement cannot be spent on a different plan
- **GIVEN** a confirmation minted for a described plan
- **WHEN** a plan altered after the describe is submitted with it
- **THEN** the write is refused before the platform is asked

#### Scenario: The change is proven by the re-read
- **WHEN** a condition write succeeds
- **THEN** the user lands on the strategy read fresh, showing the condition list
  as the platform now holds it

### Requirement: A Condition Write Names The Whole List And What It Would Strand

The describe SHALL state, before agreement and as part of the text the
confirmation is issued against: every condition the strategy would be left
defining; whether the edit added, replaced, or removed one; every reference the
edit would leave with nothing to resolve; and how many agents the write
reconfigures.

Naming only the condition being changed would understate the agreement, because
the whole list is resubmitted. Naming the references matters for the same reason
one layer down: removing a condition that another one refers to leaves a rule
nobody can evaluate, and that consequence appears nowhere in the condition being
changed.

References the strategy **already** cannot resolve SHALL NOT be attributed to the
edit. They are a property of the strategy and are reported where the strategy is
read; listing them here would overstate what agreeing to this change does.

A dangling reference SHALL be shown and SHALL NOT block the write. Whether the
platform accepts one is its ruling to make, in its own words.

The bound agent count SHALL be stated whether it is zero or many, from the
platform's own plan where the plan carries it and from the strategy as read
otherwise — never omitted.

#### Scenario: The list is stated, not just the edit
- **GIVEN** a strategy defining two conditions and a drafted third
- **WHEN** the describe runs
- **THEN** all three are named as what the strategy would be left defining
- **AND** the text says the platform takes the condition list whole

#### Scenario: A removal names what it would strand
- **GIVEN** a condition that another condition refers to
- **WHEN** the user is shown what removing it would do
- **THEN** the reference left with nothing to resolve is named
- **AND** that naming is part of the text the confirmation was issued against

#### Scenario: A reference that already dangled is not blamed on the edit
- **GIVEN** a strategy whose conditions refer to a key it does not define
- **WHEN** an unrelated condition is added
- **THEN** that pre-existing reference is not listed as a consequence of the edit

#### Scenario: The blast radius is stated for zero as plainly as for many
- **WHEN** a condition write is described on a strategy no agent is bound to
- **THEN** the consequence says so

### Requirement: A Plan That Would Save Something Else Is Refused, Not Described

Where the product composes an update naming only some of a strategy's axes, it
SHALL check the compiled plan's post-state against what it submitted before
asking anyone to agree, and SHALL refuse a plan that would save a condition list
other than the one submitted, or that would change an axis the update did not
name.

Compiling performs no write, so the platform's own account of what it would save
is available for free, and it is the only moment this product can see what its
omissions actually did. The alternative is to carry a behaviour observed once as
a standing assumption — which is how this product has produced dead and dangerous
write paths before.

The refusal SHALL be distinct from a platform refusal. A platform refusal is
BattleGrid declining the change; this is BattleGrid accepting a change nobody
described. The surface SHALL say that nothing was written and that no agreement
was recorded.

#### Scenario: The compiler does not take the submitted list
- **GIVEN** an update submitting a condition list
- **WHEN** the compiled post-state carries a different list
- **THEN** the write is refused with what was submitted and what would be saved
- **AND** no confirmation is minted

#### Scenario: An axis the update never named would move
- **GIVEN** an update naming only the condition list
- **WHEN** the compiled post-state carries a different tagline or a different set
  of report sections
- **THEN** the write is refused rather than described

#### Scenario: A plan that matches what was submitted proceeds
- **WHEN** the compiled post-state carries exactly the list submitted and the
  strategy's own tagline and sections
- **THEN** the describe proceeds to the confirmation

### Requirement: Trade-Level Policy Is Shown As Platform-Set While Inert
Where the platform's compiler does not process changes to the trade-level
policy fields, Grid-Commander SHALL show the values the strategy carries and
SHALL state that they cannot be changed through this product. It MUST NOT
offer an editing control for a field the compiler silently drops.

This is not a missing feature — it is a guardrail against a dead write path.
The compiler accepts the fields without error and returns them unchanged; the
only signal that they were ignored is the absence of a diff axis. Offering an
edit form that compiles without error, shows no diff, and applies unchanged
values would be indistinguishable from a working control until the operator
checks what was actually written.

The statement SHALL name the cause honestly: the platform declares these fields
but its compiler does not yet process changes to them. It SHALL NOT blame the
product or imply the operator did something wrong.

#### Scenario: The policy is visible on the strategy page
- **GIVEN** a strategy the platform returns with trade-level policy values
- **WHEN** the user views the strategy
- **THEN** the stop-loss floor (as an ATR multiple), the stop-loss ceiling (as
  a percentage), and the risk:reward minimum are shown
- **AND** they are labelled as what they govern

#### Scenario: No editing is offered
- **GIVEN** the compiler does not process policy changes
- **WHEN** the user views the trade-level policy
- **THEN** no editing control is rendered for any policy field
- **AND** the user is told that the values cannot be changed through this
  product while the platform's compiler does not process them

#### Scenario: The values travel through a fork
- **GIVEN** a strategy is forked
- **WHEN** the fork's detail page is viewed
- **THEN** the trade-level policy the fork inherited is shown
- **AND** the same inert-state notice applies

### Requirement: A Fork Is Taken At The Revision The Page Named
Where the product names the revision a copy will start from, the copy SHALL be
taken from that revision — the one the user was shown and agreed to — and not
from whatever is current when they click.

The revision SHALL travel with the request rather than being read again at
perform time. `fork_strategy` takes `sourceRevision` as a parameter, so a
revision that is no longer current is an ordinary request the platform serves,
not a conflict the product must invent a refusal for.

The product SHALL NOT state which revision a fork came from once it exists: the
platform returns no such field, and a lineage claim it cannot back is a claim
the product does not make.

#### Scenario: The parent moves between reading and clicking
- **GIVEN** a user is shown that a copy will start from a named revision
- **WHEN** the parent strategy is edited before they make the copy
- **THEN** the copy is still taken from the revision they were shown
- **AND** the copy is not taken from the newer revision they never saw

#### Scenario: The parent is gone by the time they click
- **WHEN** the strategy is no longer in the user's listing at perform time
- **THEN** nothing is copied, and the user is returned to the form with the
  reason and the name they typed

### Requirement: A Stale Address Does Not Describe A Current State
Where a page can be reached by an address carrying a past outcome, the product
SHALL consult the entity's current state before it describes that outcome. A
message about what the platform once refused MUST NOT be shown about a strategy
whose state has since moved on.

#### Scenario: A bookmark outlives the state it described
- **GIVEN** an address saying a strategy needed rebuilding
- **WHEN** it is opened after that strategy has been restored
- **THEN** the page describes the strategy as it now is
- **AND** does not say it needs rebuilding

### Requirement: A Listing Shows Every Entry It Was Given
Where the product lists entries, every entry it was given SHALL render. Two
entries that happen to display the same text are two entries, and the list MUST
NOT collapse them into one.

This binds the condition listings in particular, where an entry may carry no key
of its own and a reason may repeat across entries — the cases where display text
is least able to tell two things apart.

#### Scenario: Two entries with no key of their own
- **GIVEN** a submitted list containing more than one entry with no key
- **WHEN** the page lists what it was given
- **THEN** every one of them is shown

#### Scenario: Two entries refused for the same reason
- **GIVEN** two entries the platform refused with identical wording
- **WHEN** the reasons are listed
- **THEN** both are shown, not one
