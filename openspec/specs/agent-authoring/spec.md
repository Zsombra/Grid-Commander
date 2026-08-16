# Agent Authoring Specification

## Purpose

How a user creates, configures, rebinds, retires and understands their BattleGrid
agents through Grid-Commander.

This capability is the first that changes a user's account. It inherits every
guarantee `battlegrid-connection` makes — classification, confirmation, audit,
concurrency — and adds the ones specific to agents: that the product never
invents a value the platform must validate, and never lets a destructive
configuration replacement look like an edit.

## Requirements

### Requirement: The Roster Reflects The Live Account
Grid-Commander SHALL present a user's agents as read from their BattleGrid
account at the time of viewing. It MUST NOT present agents from a cached copy
without saying that is what it is showing.

Where it explains why a read failed, the explanation MUST match what actually
happened. A platform that answered and declined is not a platform that could not
be reached, and telling a user the second when the first occurred sends them to
wait for an outage that is not happening.

#### Scenario: Viewing the roster
- **WHEN** a user opens their roster
- **THEN** they see the agents that exist on their BattleGrid account, each with
  the strategy it is bound to and its current lifecycle state

#### Scenario: The account has no agents yet
- **WHEN** a user with no agents opens their roster
- **THEN** they are told the account has none, and offered the path to create one
- **AND** this is distinguished from a failure to load

#### Scenario: The roster cannot be loaded
- **WHEN** the roster cannot be read from BattleGrid
- **THEN** the user is told it could not be loaded rather than shown an empty
  roster
- **AND** told their agents have not been lost
- **AND** no create or edit action is offered against state that was not read

#### Scenario: BattleGrid declines to answer
- **WHEN** the read fails because BattleGrid refused the authority it was given
- **THEN** the user is told the platform refused rather than that it could not
  be reached
- **AND** still told their agents have not been lost

#### Scenario: BattleGrid gives no answer
- **WHEN** the read fails for any reason other than a refusal
- **THEN** the user is told the platform could not be reached
- **AND** still told their agents have not been lost

#### Scenario: The distinction survives the read
- **WHEN** a read fails
- **THEN** which of the two occurred is carried out of the read itself
- **AND** is not re-derived by inspecting the message text

### Requirement: Agent Fields Are Offered Only From Values The Platform Confirms

Where a field has a set of valid values or a permitted range, Grid-Commander
SHALL obtain it from BattleGrid at the time of use. It MUST NOT offer a value,
or accept one, on the basis of a list fixed at build time.

This applies to a set of values BattleGrid states only inside a tool's own
argument schema, with no catalogue call that lists it. Grid-Commander SHALL read
such a set from the declaration the session discovered, at the time of use. A
set of values BattleGrid declares is not a set this product may transcribe.

Where the platform declares a value Grid-Commander cannot describe — because the
declaration itself is ambiguous about it, naming it both as a choice for a field
and as something else in the same argument — Grid-Commander MUST NOT offer it,
and MUST NOT present any account of what it does. A choice nobody can explain is
not a choice a user can make.

Where the declaration does not answer, Grid-Commander SHALL say that BattleGrid
did not declare the values, and MUST NOT present the absence as an empty set of
choices or blame a rejected value on the user.

Where the platform returns an agent whose brain cannot be described — neither a
named preset nor a model identifier is present — Grid-Commander SHALL record
and present it as undescribed. It MUST NOT fabricate a brain variant from
absent data.

#### Scenario: Choosing a brain
- **WHEN** a user chooses the model an agent reasons with
- **THEN** the choices offered are the ones BattleGrid currently approves

#### Scenario: Setting trading configuration
- **WHEN** a user sets an agent's trading configuration
- **THEN** the presets and the permitted range of each value come from
  BattleGrid's live catalog
- **AND** a value outside the permitted range is rejected before submission,
  against that catalog rather than against a remembered bound

#### Scenario: The catalog cannot be read
- **WHEN** the approved models or the configuration catalog cannot be read
- **THEN** creation is not offered
- **AND** the user is told why, rather than shown a form whose submission will
  fail

#### Scenario: A brain preset BattleGrid has added
- **WHEN** BattleGrid declares a brain preset the product has never seen
- **THEN** it is offered when an agent is created, with no release of this
  product
- **AND** a create naming it is accepted rather than refused as unknown

#### Scenario: A brain preset BattleGrid no longer declares
- **WHEN** BattleGrid stops declaring a brain preset
- **THEN** it is no longer offered
- **AND** a create naming it is refused before it is sent

#### Scenario: A declared value the product cannot describe
- **WHEN** the declaration lists a value as a choice for a field while the same
  argument also uses that value to name something else
- **THEN** it is not offered as a choice
- **AND** no explanation of what it does is presented anywhere

#### Scenario: The declaration does not answer
- **WHEN** BattleGrid does not declare the values a field accepts
- **THEN** the user is told BattleGrid did not declare them
- **AND** the routes whose values *were* declared stay open
- **AND** a value submitted against the undeclared set is refused for that
  reason, rather than reported as not being one of them

#### Scenario: A brain the platform did not describe
- **WHEN** BattleGrid returns an agent carrying neither a brain preset nor a
  model identifier
- **THEN** the brain is mapped as undescribed, not as a custom brain with an
  empty model
- **AND** it is shown to the user as undescribed rather than blank or
  defaulted to any particular model

### Requirement: Capacity Limits Are Explained Before The Work, Not After
Where the platform limits how many agents a user may have, Grid-Commander SHALL
tell the user before they begin composing one.

#### Scenario: No slots remain
- **WHEN** a user with no remaining agent slots asks to create an agent
- **THEN** they are told before the form that they have no slots and what governs
  that limit
- **AND** they are not permitted to compose an agent that cannot be created

### Requirement: Editing Changes Only What The Agent Owns
Grid-Commander SHALL permit editing only the fields BattleGrid treats as
agent-owned. It MUST NOT present strategy-owned configuration as editable from
the agent, and MUST NOT attempt to change it through an agent edit.

#### Scenario: Editing an agent
- **WHEN** a user edits an agent
- **THEN** they can change its name, the model it reasons with, its personality
  and its money limits
- **AND** the configuration it inherits from its strategy is shown as inherited,
  not as an editable field

#### Scenario: Changing what the agent reads and how it reasons
- **WHEN** a user wants to change the configuration their agent inherited
- **THEN** they are directed to the strategy that owns it, or to rebinding
- **AND** the edit path does not silently do either

### Requirement: Rebinding States That It Replaces, Not Merges
Rebinding an agent to a different strategy SHALL be treated as destructive.
Before it is attempted, Grid-Commander MUST state that the agent's inherited
configuration will be replaced in full, and MUST NOT describe it as a change of
strategy alone. The destination named in the consequence SHALL be read from
the platform — its name and its revision — never taken from the caller, and
the confirmation SHALL be bound to the agent, the destination, and the
destination's revision as described.

#### Scenario: Rebinding is requested
- **WHEN** a user asks to rebind an agent to a different strategy
- **THEN** they are told that the agent's context, signal rules, prose and
  timeframe will be replaced by the new strategy's, not merged with them
- **AND** the agent being rebound and the strategy it will be bound to are both
  named, with the destination's name and revision read from the platform
- **AND** the rebind is not attempted until they confirm that specific operation

#### Scenario: Confirmation is withheld
- **WHEN** a user does not confirm a rebind
- **THEN** nothing about the agent changes
- **AND** no attempt is made against BattleGrid

#### Scenario: A confirmation is reused for a different rebind
- **WHEN** a confirmation issued for one agent, one target strategy, or one
  destination revision is presented for another
- **THEN** it is refused
- **AND** the user is asked to confirm the operation actually being performed

#### Scenario: The destination moved between reading and confirming
- **WHEN** the destination strategy's revision at perform time differs from
  the revision the consequence described
- **THEN** nothing is attempted against BattleGrid
- **AND** the user is told the destination changed while they were reading,
  and is offered a fresh proposal

#### Scenario: A destination that cannot be read
- **WHEN** the destination strategy cannot be read or does not exist
- **THEN** no proposal is made and no token minted
- **AND** the reason reaches the user on the surface they acted from

### Requirement: Retiring An Agent Is Reversible And Described As Such
Grid-Commander SHALL present archiving as recoverable, and MUST NOT describe it
as deletion. Where BattleGrid offers no permanent deletion, Grid-Commander MUST
NOT imply that it does.

#### Scenario: Archiving an agent
- **WHEN** a user archives an agent
- **THEN** the agent stops appearing among active agents and remains recoverable
- **AND** the user is told it can be reactivated

#### Scenario: Reactivating an agent
- **WHEN** a user reactivates an archived agent
- **THEN** it returns to the roster in its previous configuration

#### Scenario: A user asks to delete an agent permanently
- **WHEN** a user looks for permanent deletion
- **THEN** they are told Grid-Commander cannot do it and where it can be done
- **AND** archiving is not offered as though it were the same thing

### Requirement: Agents The Platform Owns Are Not Presented As Editable
Where an agent cannot currently be changed, Grid-Commander SHALL show it without
offering any action that would attempt to change it, and SHALL say why.

Two things make an agent unchangeable, and they are not the same. BattleGrid may
treat an agent as immutable, which is permanent and belongs to the platform. Or
the agent may be **archived**, which the operator did and can undo. Offering a
rename box on either is an affordance with nothing behind it; offering one on an
archived agent is worse, because the operator is one action away from being able
to use it and is not told so.

Where the reason is archival, Grid-Commander SHALL name reactivation as what
makes changes possible again.

#### Scenario: A platform-owned agent in the roster
- **WHEN** an immutable agent appears in a user's roster
- **THEN** it is shown and readable
- **AND** no edit, rebind or archive action is offered for it

#### Scenario: An archived agent
- **WHEN** an archived agent is shown
- **THEN** it is readable, and its history is not hidden
- **AND** no control that would change it is offered
- **AND** the user is told it is retired and that reactivating it makes changes
  possible again

#### Scenario: Attempting to change one anyway
- **WHEN** a change is attempted against an agent that cannot be changed
- **THEN** it is refused before anything is sent to the platform
- **AND** the user is told which of the two reasons applies

### Requirement: Every Agent Mutation Carries The Revision It Was Formed Against
Grid-Commander SHALL send, with every change to an agent, the revision of the
agent that the user's intent was formed against.

#### Scenario: The agent changed underneath a pending edit
- **WHEN** an agent has changed since the user loaded it
- **THEN** the change is refused by BattleGrid and surfaced to the user as a
  conflict naming the agent
- **AND** the user's intent is not reapplied against the new state automatically

#### Scenario: A mutation is composed without a revision
- **WHEN** a change to an agent is composed with no revision to send
- **THEN** it is not attempted

### Requirement: An Agent's Reasoning Is Readable
Grid-Commander SHALL let a user read what an agent thought and did, separately
from the record of what Grid-Commander did to their account.

**What the platform records SHALL be read from what the platform sends.** A
mapper that looks for a key the response does not carry finds nothing, and
"found nothing" is indistinguishable from "the agent did nothing" — so the
product asserts silence about an agent that has been busy. Where a reading is
empty, that MUST be because the platform sent an empty collection, not because
a lookup missed.

**An agent's record has three parts and SHALL show all three.** BattleGrid keeps
what an agent *did* separately from what it *thought* and from how a submission
*scored*. The first is the one a user comes for — an agent that is quiet is quiet
for a reason, and the platform states the reason in that record.

**A shape that varies SHALL NOT be narrowed to the case that was seen first.**
Event detail differs per event type, and one type was observed carrying two
different shapes. An unrecognised detail is shown as the platform sent it rather
than dropped, on the same grounds as an unrecognised outcome.

#### Scenario: Reading an agent's journal
- **WHEN** a user opens an agent's journal
- **THEN** they see that agent's thoughts, activity and decisions as BattleGrid
  records them

#### Scenario: An agent that has done something
- **WHEN** BattleGrid holds activity for an agent
- **THEN** the journal shows it
- **AND** does not report that the agent has recorded nothing

#### Scenario: An agent that is not trading
- **WHEN** the platform recorded why an agent declined or could not act
- **THEN** that reason is shown in the agent's own words from the platform

#### Scenario: An event kind this product has no copy for
- **WHEN** BattleGrid records an event kind Grid-Commander does not recognise
- **THEN** it is shown named as the platform named it
- **AND** its detail is shown rather than dropped

#### Scenario: A submission that has not settled
- **WHEN** a recorded submission has no score yet
- **THEN** it is shown as not yet settled
- **AND** not as a score of zero

#### Scenario: Telling the two records apart
- **WHEN** a user is looking at either record
- **THEN** it is clear whether they are reading what the agent did or what
  Grid-Commander did on their behalf

### Requirement: Agent Operations That Commit Funds Are Not Reachable
Grid-Commander SHALL NOT offer, and MUST NOT attempt, any agent operation that
commits funds.

#### Scenario: An operation that would spend
- **WHEN** an agent operation requiring authority to commit funds is reached by
  any path
- **THEN** it is refused before it is attempted
- **AND** the refusal is recorded as a refusal, not as a failed attempt

### Requirement: A Field Offered Reaches The Operation It Configures
Where the interface renders a control for a value, submitting the form SHALL
carry that value to the operation. A control whose value the operation never
reads MUST NOT be rendered.

Offering a setting and discarding it is worse than not offering it: the user
leaves believing they configured something, and the agent behaves as though they
had not. Nothing on the screen distinguishes the two.

The converse binds equally. Where an operation requires a value, some control
SHALL supply it. A required field no control sends is not a gap in a form — it
is a write path that cannot be walked: the submission is refused before the
operation is reached, so the failure names a field rather than anything the
operator did, and no amount of care on the screen can produce a valid
submission. Both halves failed unseen in this product — a rebind confirmation
that sent four of the five fields its action read, and a creation form that
never asked for the strategy its action required — because the tests exercised
the use cases directly and no test walked a form.

#### Scenario: Setting a value the form offers
- **WHEN** a user sets a value using a control the interface renders and submits
- **THEN** that value reaches the operation the form performs

#### Scenario: A control the operation does not read
- **WHEN** a control is rendered whose value no operation reads
- **THEN** this fails a check that gates a change, rather than being found by a
  user whose agent was configured without it

#### Scenario: A value the operation requires and no control supplies
- **WHEN** an operation requires a field that the form bound to it never renders
- **THEN** this fails a check that gates a change, rather than being found by an
  operator whose submission was refused before it was performed

#### Scenario: A setting the product cannot yet carry
- **WHEN** the product cannot supply what an operation requires for a setting
- **THEN** the control for it is not rendered
- **AND** the user is not shown a configuration they cannot make

#### Scenario: A form that navigates rather than acting
- **WHEN** a form submits by navigating, putting its values in the query string
- **THEN** its controls are read from there
- **AND** this is not reported as a control that reaches nothing

### Requirement: An Agent's Spending Limits Are Stated Before It Exists
Where the platform declines to default a limit on what an agent may spend,
Grid-Commander SHALL obtain that limit before creating the agent, and MUST NOT
create one whose limits it cannot state.

A platform that defaults a value has decided it. A platform that declines to
default one has not — and treating the second as though it were the first
creates something that trades under limits nobody chose.

**A value that removes a limit SHALL be described as removing it.** BattleGrid
reads `0` as *no cap* on the exposure, drawdown and daily-loss ceilings. A form
that asks "most it may lose in a day", promises "trading stops once this is
reached", and accepts `0` invites the most cautious operator to create the least
bounded agent. Where a value means unbounded, Grid-Commander SHALL say so where
that value is entered, and MUST NOT present the resulting agent as one whose
limits are set.

The same holds when limits are **changed**. `tradingConfig` is all-or-nothing: a
partial send does not error, it resets what it omits, so completeness is checked
before an edit is sent and not only before a create.

**A limit that can be set SHALL be changeable.** Showing an operator a ceiling
they cannot move — or declining to offer the change for a reason that has since
been fixed — leaves them able to read a danger and unable to act on it. Where the
product can write a value, the surface offers it; where it cannot, it says which
of the two reasons applies.

**A limit SHALL be described by what the platform actually meters, and by how
it enforces it.** A ceiling that trips and a base that sizes are different
mechanisms, and an operator who is told the first while the platform does the
second cannot reason about either. `maxConcurrentExposureUsd` is metered on
**margin**, not notional, and it does not trip: BattleGrid sizes each order from
the headroom remaining under it, so as the cap fills, orders shrink, and one
eventually falls under the exchange minimum and is refused without exposure ever
being named. Where the enforcement is silent, the description SHALL carry the
consequence the operator would otherwise have to infer from an agent that simply
stopped trading.

#### Scenario: Composing an agent
- **WHEN** a user composes an agent
- **THEN** they are asked for every spending limit the platform declines to
  default
- **AND** told that the platform sets no default for them

#### Scenario: Changing what an agent may spend
- **WHEN** a user changes an agent's spending limits
- **THEN** the current values are shown as the starting point
- **AND** the limits the platform does not default are all present in what is sent

#### Scenario: A value that removes the limit
- **WHEN** a field accepts a value the platform reads as *no cap*
- **THEN** the user is told, where they enter it, that the limit is removed
- **AND** the wording does not describe a stop that would never fire

#### Scenario: A limit described by the wrong mechanism
- **WHEN** a limit is presented to the operator
- **THEN** the wording names the quantity the platform meters
- **AND** where the platform enforces it by sizing rather than by stopping, the
  wording says so rather than describing a ceiling
- **AND** where the enforcement produces no message of its own, the wording names
  what the operator would otherwise see instead

### Requirement: Every Value The Product Sends Is One The Platform Accepts
Where Grid-Commander supplies a value the operator did not choose — a
discriminator, a structural literal, or a completion that makes a required
object whole — that value SHALL be one the platform's own schema permits, and
SHALL be checked against the platform's declared constants rather than against
what this product remembers.

A value nobody was asked for is still a value on the wire. The rule that choices
must come from the platform has always covered what is *offered*; this extends it
to what is *filled in*. The difference is invisible to a user and total to a
server: `create_intelligence_agent` could never succeed, for the life of this
product, because two literals nobody had ever looked at were wrong.

Where the platform declares no default for such a value, Grid-Commander MUST NOT
present its choice as a lookup. The value is named, with what it is and why it is
safe, in one place.

#### Scenario: A value the operator never chose
- **WHEN** the product sends a value the operator was not asked for
- **THEN** that value is one the platform's schema permits

#### Scenario: A value outside the platform's constants
- **WHEN** a value the product sends is not one the platform's schema permits
- **THEN** this fails a check that gates a change, rather than being found by an
  operator whose agent could not be created

#### Scenario: The platform declares no default
- **WHEN** the platform declares no default for a value the product must supply
- **THEN** the product's own choice is stated as its own, with the reason
- **AND** it is not written as a fallback behind a lookup that always misses

#### Scenario: The record of what the platform permits
- **WHEN** the platform's permitted values are recorded for checking against
- **THEN** the record carries the permitted values themselves, not only the
  names of the fields that carry them

### Requirement: A Value Read Back Is Not Therefore A Value That May Be Sent
Where Grid-Commander returns a value it read from the platform in a subsequent
write, it SHALL send only the fields that operation accepts, and MUST NOT assume
the shape it read is the shape it may write.

BattleGrid's `tradingConfig` reads back with twenty-three fields and writes with
twenty. The three extra are real facts about an agent and are not writable. An
operation declaring `additionalProperties: false` rejects the entire object for
one unaccepted key, so a read-modify-write that passes the read through cannot
succeed — which is what `update_intelligence_agent` did, every time, for the
life of this product.

Where a read carries fields a write will not accept, dropping them SHALL be
visible to the caller rather than silent, so a surface can say what it did not
send instead of leaving an operator to infer it.

#### Scenario: Writing back a value that was read
- **WHEN** the product sends back a configuration it read from the platform
- **THEN** only the fields the write operation accepts are sent

#### Scenario: A field the write does not accept
- **WHEN** a read carries a field the write operation does not accept
- **THEN** it is dropped from the write
- **AND** the drop is reported to the caller rather than performed silently

#### Scenario: A key the operation would reject
- **WHEN** the product builds a payload containing a key an operation does not
  accept
- **THEN** this fails a check that gates a change, rather than being found by an
  operator whose edit was refused

### Requirement: The Outcome Of A Write Reaches The Person Who Asked For It
Where a user performs an operation that can be refused, Grid-Commander SHALL
read the outcome and show it. A surface MUST NOT discard the result of a write
and present the page as though nothing had been attempted.

A refusal the operator cannot see is worse than a failure they can. The page
reloads, the value is unchanged, and the only available reading is that the
product ignored them. Renaming an agent did exactly this: the action awaited the
result, discarded it, and redirected, so a refusal — including one the product
itself raised — was indistinguishable from success.

Where the operation was refused, the reason given SHALL be the one the operation
returned, rather than a generic failure.

This binds however the outcome arrives. A refusal the platform delivers as a
thrown error is still an outcome — confirmed live 2026-08-12, when a
stale-revision rebind was refused as `CONFLICT` at the client layer — and an
action that decides not to attempt the operation at all (its pre-perform
re-read failed, the entity was gone) has an outcome too: that nothing was
attempted, and why. A reason already being carried back to a surface (a
`?problem=` from an earlier bounce) is part of the outcome the person is owed,
and re-rendering the surface MUST NOT discard it, whatever branch renders.

Reading the result once is not reading the outcome. A result union read
partially — some arms branched on, the rest falling off the end of the action —
is the same discard wearing a compliant spelling, and it hides from any check
that asks only whether the result was read: the create action read one arm of
five for as long as the union existed and passed every gate. A surface that
reads a result MUST read it exhaustively, and a partial read MUST fail a check
that gates a change, the same as a result never read at all.

#### Scenario: A write that succeeds
- **WHEN** a user performs a write that succeeds
- **THEN** they are shown its effect

#### Scenario: A write that is refused
- **WHEN** a write is refused
- **THEN** the user is told, on the surface they acted from
- **AND** the reason given is the one the operation returned

#### Scenario: A refusal that arrives as a thrown error
- **WHEN** the platform refuses a perform by raising an error rather than
  returning a readable result
- **THEN** the user is told on the surface they acted from, with the raised
  reason, never a framework error page

#### Scenario: An action that could not attempt the operation
- **WHEN** an action's pre-perform re-read fails, or no longer finds what was
  to be acted on
- **THEN** the user is told nothing was attempted, and why, on the page they
  acted from — never silently landed elsewhere

#### Scenario: A carried reason survives whatever branch renders
- **WHEN** a surface is re-rendered carrying a refusal reason from an earlier
  attempt
- **AND** the re-render itself takes a refusal or failure branch
- **THEN** both the carried reason and the fresh one are shown

#### Scenario: A result the surface never reads
- **WHEN** a surface performs a write and does not read its outcome
- **THEN** this fails a check that gates a change, rather than being found by an
  operator whose action silently did nothing

#### Scenario: A result read partially, not fully
- **WHEN** a surface branches on some arms of a write's result and lets the
  remaining arms fall through unhandled
- **THEN** this fails a check that gates a change, rather than being found by
  an operator whose refused press looked like a page reload

### Requirement: A Destructive Change Is Agreed To By A Person
Where an operation requires a confirmation naming its consequence,
Grid-Commander SHALL obtain that agreement from a person between naming the
consequence and performing the operation.

**Proposing and performing in one request satisfies the guard and defeats it.**
A confirmation the product issues to itself moments before the call records that
the product intended to proceed, which was never in doubt. The token must be
issued in response to one request and spent in response to a later one that a
person initiated, or the consequence is computed, stored for the audit, and read
by nobody.

This has now been got wrong twice, in the same operation, one layer apart: first
inside the command, then inside the action that calls it. The property to hold is
not "a token exists" but "a human saw this sentence and then acted".

**And the change performed SHALL be the change described.** *When* the token is
spent was the first half; *what it authorises* is the second, and the two are
independent. An agreement carried across two requests, correctly, still authorised
any amount at all: the token bound to the agent, so a submission that named the
same agent consumed it whatever the numbers said. An edit that alters money is the
one place in this product where the difference between the described change and
the performed change is measured in the operator's own funds.

The values SHALL be those the platform will accept — the ones surviving the
partition that drops fields BattleGrid rejects — so that what was agreed to and
what reaches the wire are the same set, rather than the agreement covering fields
that are silently discarded on the way.

#### Scenario: Changing an agent
- **WHEN** a change to an agent is submitted
- **THEN** the consequence is shown and the change is not yet made
- **AND** it is made only on a further request the user initiated

#### Scenario: The consequence that was agreed to
- **WHEN** a confirmed change is recorded
- **THEN** the sentence recorded is the sentence the user was shown

#### Scenario: A change that changes nothing
- **WHEN** a submission would alter nothing
- **THEN** no confirmation is sought and the user is told why

#### Scenario: An amount altered after it was agreed to
- **WHEN** an edit is submitted carrying a money value other than the one whose
  consequence was shown
- **THEN** the change is refused before any request is built
- **AND** the agent is unchanged

#### Scenario: Two agreements for one agent
- **WHEN** a user proposes one edit, then proposes a second, and submits the first
- **THEN** each agreement authorises only the change it described

### Requirement: A Position Preset Is Offered With The Platform's Own Values
Where the platform's catalog states a position-management preset together with
the complete configuration it stands for, Grid-Commander SHALL offer that
preset when an agent is created, and choosing it SHALL send exactly the values
the platform stated for it, with the preset's own label beside them — no value
the product chose among them. A preset whose configuration the platform did
not supply MUST NOT be offered, and a preset name the catalog does not carry
MUST be refused before submission. `CUSTOM` SHALL remain offerable as the name
for values the product assembles.

The platform states each preset's complete behavioural configuration and
declines to expand a label into it server-side — the label is sent alongside
the configuration, never instead of it. How many values that is belongs to
the platform, not to this contract: v17.2.0 replaced the typed trailing pair
and the take-profit break-even trigger with a giveback percentage and an
R-multiple, taking the set from fourteen to twelve without renaming a single
preset. Discarding those values at the boundary meant every agent was created
`CUSTOM` under numbers nobody picked deliberately, and the create form had
its preset control removed because offering a choice the action discarded was
worse than not asking.

#### Scenario: Choosing a preset
- **WHEN** the operator picks a catalog preset while creating an agent
- **THEN** the position-management values sent are the platform's own for that
  preset, complete, with the preset's label beside them
- **AND** no product-chosen value is among them

#### Scenario: A preset the platform did not describe fully
- **WHEN** the catalog lists a preset without the configuration it stands for
- **THEN** that preset is not offered

#### Scenario: A preset name from outside the catalog
- **WHEN** a create request names a preset the catalog does not carry
- **THEN** it is refused before submission, naming the field

#### Scenario: CUSTOM, chosen or defaulted
- **WHEN** the operator picks `CUSTOM`, or picks nothing
- **THEN** the values sent are the product-assembled set, exactly as before
- **AND** the values the product supplies of its own choosing remain stated as
  its own

### Requirement: Position Management Is Edited With Stated Values, And Drift Is Said
Where an agent is edited, Grid-Commander SHALL offer its position management
— the preset label and the platform's full set of behavioural values —
through the same person-confirmed edit flow as every other agent change.
Choosing a catalog preset SHALL send the platform's own values for it,
wholesale; choosing CUSTOM SHALL send the full field set as the operator
edited it; making no choice SHALL change nothing. The field set is the
platform's current one, not a remembered one — twelve fields at v17.2.0,
fourteen before it. The confirmation SHALL be bound to the resolved values,
and the consequence SHALL name what position management becomes. Where the
agent's current values differ from the catalog's configuration for the
preset it names, the edit surface MUST say so, naming the differing fields —
the label alone is not the truth.

#### Scenario: Managing like a preset
- **WHEN** the operator picks a catalog preset and confirms
- **THEN** the platform's own values for that preset are sent, complete,
  with its label
- **AND** the consequence named the preset before agreement

#### Scenario: Custom values
- **WHEN** the operator picks CUSTOM and edits the behavioural fields
- **THEN** exactly those values are sent, labelled CUSTOM
- **AND** the confirmation is bound to them — an agreement about one set of
  values cannot authorise another

#### Scenario: No choice made
- **WHEN** the operator edits other fields and leaves position management
  alone
- **THEN** no position-management change is sent at all

#### Scenario: The label and the values disagree
- **WHEN** the agent names a preset whose catalog values differ from what it
  carries
- **THEN** the edit surface says which fields differ
- **AND** an agent labelled CUSTOM, or a catalog that cannot answer, draws
  no claim either way

### Requirement: Creating An Agent Binds It To A Strategy The Operator Chose
Where the product creates an agent, it SHALL obtain the strategy that agent
will read from the operator, and MUST NOT choose one on their behalf.

A strategy is not a setting on an agent; it is the agent's reasoning. The
platform materializes its context modules, signal rules, prose and timeframe
onto the agent at creation, and every decision the agent later makes about the
operator's money follows from them. A default here would bind funds to a policy
nobody read.

The strategies offered SHALL be the ones the platform lists for that operator —
its own catalog and their private ones — because that is the set the platform
will accept a binding to.

Where no strategy can be offered, the form SHALL NOT be rendered. A creation
form whose submission is certain to be refused teaches an operator to distrust
the product's refusals, and this page already declines to render itself when
its other vocabulary is unreadable.

#### Scenario: Creating an agent
- **WHEN** an operator composes a new agent
- **THEN** they are asked which strategy it will read
- **AND** no strategy is selected for them

#### Scenario: The strategies on offer
- **WHEN** the form asks which strategy the agent will read
- **THEN** the choices are the strategies the platform lists for that operator,
  including the platform's own

#### Scenario: The platform lists no strategies at all
- **WHEN** the strategy list is readable and contains nothing
- **THEN** the creation form is not rendered
- **AND** the operator is told there is nothing to bind an agent to

#### Scenario: The strategy list cannot be read
- **WHEN** the strategy list cannot be read
- **THEN** the creation form is not rendered
- **AND** the operator is told why, distinguishing a refusal from an outage
- **AND** is not told their strategies are gone

### Requirement: A Refused Edit Keeps What Was Composed
Where an edit is described, refused, or bounced back, the values the person
entered SHALL still be in the form when they arrive. The form MUST NOT be
re-rendered from the entity's stored values, discarding the edit.

A refusal usually names one thing to fix. Fixing it must not cost everything
else that was typed.

#### Scenario: The describe refuses the edit
- **WHEN** an agent edit is described and refused
- **THEN** the reason is shown
- **AND** the form still holds what was entered, not the agent's stored values

#### Scenario: A preset the catalog cannot resolve
- **WHEN** the chosen position-management preset is not in the catalog
- **THEN** the page says so
- **AND** what was entered is still there

#### Scenario: The perform bounces back
- **WHEN** a submitted edit is refused and the person is returned to the form
- **THEN** the reason arrives with them
- **AND** so do the values they submitted

#### Scenario: A money limit survives the bounce
- **WHEN** an edit that changes a money limit is refused on any road back to
  the form — the describe, an unresolvable preset, or the submitted apply
- **THEN** every money box holds the value the person typed, not the agent's
  stored value
- **AND** this is pinned on what the field holds, not on the page's text —
  every money box is `required` and so is never empty, only silently wrong,
  which is how this group's regression stayed invisible once before

### Requirement: A Create Submitted Twice Is One Create
Where a create is submitted carrying the same idempotency key as an earlier
submission, Grid-Commander SHALL NOT create a second agent and SHALL NOT show a
framework error page. Only a create that **succeeded** dedupes: a failed
attempt's key is retryable, because the retry after a failure is the situation
the key exists to make safe.

What the operator is told depends on what the first attempt did, and the
distinction SHALL be carried by the outcome the product recorded, not inferred
from message text. The key SHALL also be sent to the platform in the field its
create operation declares, so the platform's own retry contract — *"a retry
with the same key returns the original result rather than repeating the
command"* — is offered to the platform rather than merely quoted. The
underlying operation (`create_intelligence_agent`) mutates without wager scope
and is not destructive, so no confirmation is sought; the key is the guard.

#### Scenario: A second press after a create that succeeded
- **WHEN** a create is submitted with a key under which a create already
  succeeded
- **THEN** no second agent is created and nothing is sent to the platform
- **AND** the operator is told, on the surface they acted from, that the agent
  was already created
- **AND** they are never shown a framework error page

#### Scenario: A retry after a create that failed
- **WHEN** a create is submitted with a key whose earlier attempt failed
- **THEN** a fresh attempt is made under that key
- **AND** the earlier failure remains on the record — retrying does not erase
  that it happened

#### Scenario: A second press while the outcome is unknown
- **WHEN** a create is submitted with a key under which an attempt has begun
  and has no recorded outcome
- **THEN** nothing is attempted
- **AND** the operator is told the earlier attempt may have landed and to check
  their roster before pressing again

#### Scenario: Two presses racing
- **WHEN** two submissions carrying the same key arrive concurrently
- **THEN** at most one attempt is made
- **AND** the other is refused with the same legible explanation, not a raw
  storage error

#### Scenario: A deliberate second agent
- **WHEN** the operator returns to a freshly rendered create form and submits
  it
- **THEN** the submission carries a new key and the create proceeds — the
  dedupe binds a form instance, not the operator

#### Scenario: The key reaches the platform
- **WHEN** a create carrying a key is sent to the platform
- **THEN** the key is present in the create operation's own declared argument,
  not only in this product's records

### Requirement: A Refused Create Keeps What Was Composed
Where a submitted create is refused before anything is created — the values
invalid, the account at capacity, the catalog or roster unreadable — the
operator SHALL be told on the surface they acted from, with the reason the
operation returned, and the values they composed SHALL travel with the refusal
rather than being discarded.

The three refusals are reachable mostly by race: the page refuses to render
the form at capacity or without a catalog, so the state has to move between
render and submit — a slot filled from another tab, the catalog moving under a
long-open form, HTML validation bypassed. Rare is not silent: a press that
does nothing teaches the operator the product ignores them.

Where the refusal's branch renders no form (at capacity, no catalog), the
composition still travels with the refusal, so the form next rendered from
that surface still holds what was typed. Carrying the composition is not
carrying the dedupe key: a resubmission of the re-rendered form is a new
command under "A Create Submitted Twice Is One Create", not a retry of the
refused one.

#### Scenario: A value the command refuses
- **WHEN** a submitted create is refused because a value is invalid
- **THEN** the reasons are shown on the surface acted from, each naming its
  field
- **AND** the form still holds what was entered

#### Scenario: Capacity moved between render and submit
- **WHEN** a create is submitted and the account is at capacity by the time
  the command checks
- **THEN** the operator is told on the surface they acted from, with the
  platform's explanation
- **AND** what was composed travels with the refusal, so the form next
  rendered from that surface still holds it

#### Scenario: The catalog cannot be consulted at submit
- **WHEN** the catalog or roster the create must consult cannot be read at
  submit time
- **THEN** the operator is told why, on the surface they acted from
- **AND** nothing is created
- **AND** what was composed travels with the refusal

### Requirement: What An Edit Answers About Buildable Trades Is Read And Shown
Where BattleGrid returns a feasibility advisory alongside an agent update,
Grid-Commander SHALL read it and show it to the operator who performed the
edit. The advisory MUST NOT be discarded at the adapter boundary.

The advisory is the only place the platform answers which of an agent's armed
coins its strategy can currently build a stop for, and which dial is stopping
the rest. It is returned by one tool, on the response to a write, and by no
read. Discarding it means the answer exists and nobody can see it.

The platform states the answer per coin, as a band. The operator is shown it
aggregated, as counts: how many coins can construct, how many cannot, and how
many the platform could not evaluate. A surface MUST state the number of coins
each figure was computed over, so a count is never read as a proportion of an
unstated whole.

#### Scenario: An edit that returns an advisory
- **WHEN** an agent edit succeeds and BattleGrid returns a feasibility advisory
- **THEN** the operator is shown how many of the agent's armed coins can
  construct a stop under the current dials, out of how many were evaluated

#### Scenario: The dial that blocked a coin is named
- **WHEN** the advisory reports a coin that cannot construct and names the
  responsible bound
- **THEN** the surface names which dial stopped it, rather than reporting only
  that it failed

#### Scenario: The platform returns no advisory
- **WHEN** an agent edit succeeds and the response carries no feasibility
  advisory
- **THEN** nothing about feasibility is shown
- **AND** the surface MUST NOT state that zero coins can construct

#### Scenario: A coin whose volatility could not be read
- **WHEN** the advisory reports a coin as volatility-unavailable, which carries
  no numeric fields
- **THEN** that coin is counted and named as not evaluated
- **AND** it is NOT counted among the coins that cannot construct

#### Scenario: An advisory shaped unlike the declaration
- **WHEN** the response carries a feasibility advisory whose shape does not
  match what the platform declares
- **THEN** it is treated as absent rather than partially read, and nothing is
  invented for the fields that did not arrive

### Requirement: A Ceiling Is Shown Against The Opportunity It Costs
Where a feasibility advisory is shown, Grid-Commander SHALL state how the count
of constructible coins moves against a candidate stop-loss ceiling, and SHALL
state that a lower ceiling is what removes opportunity.

An operator reading a stop-loss ceiling has no way to tell from the number
alone whether it is costing them anything. A ceiling raised never blocks a
trade; a ceiling lowered can silently remove most of a fleet's tradeable
universe. Stating only the current count leaves the direction unlearnable.

Every such figure is derived by this product from the bands the platform
returned, and SHALL be presented as derived rather than as a platform claim.

#### Scenario: The count against a lower ceiling
- **WHEN** a feasibility advisory carries per-coin constructible bands
- **THEN** the surface states how many coins would still construct under at
  least one candidate ceiling below the current one

#### Scenario: The direction is stated
- **WHEN** a stop-loss ceiling is shown beside a feasibility count
- **THEN** the surface states that lowering the ceiling is what reduces the
  number of coins that can construct, and that raising it does not block trades

#### Scenario: A derived figure says it is derived
- **WHEN** the surface shows a count this product computed from the returned
  bands
- **THEN** it is distinguished from the counts BattleGrid itself returned

### Requirement: The Reply To A Write Survives The Redirect Without Becoming Forgeable
Where the outcome of a write must survive the redirect that follows it,
Grid-Commander SHALL carry it in a form the server attests to. A figure the
product presents as the platform's MUST NOT be readable from a value the
operator can author.

This product renders what it is given. A count of tradeable coins carried in a
query string is a count anyone can type, and a surface that renders it as
BattleGrid's answer is stating a platform claim the platform never made.

A carried reply MUST name the subject it was issued about and the moment it was
issued, and MUST NOT be shown against a different subject or after it has gone
stale.

#### Scenario: A carried reply that verifies
- **WHEN** a write's reply is carried across the redirect and its server
  attestation verifies for this agent, recently
- **THEN** it is shown

#### Scenario: A carried reply that was tampered with
- **WHEN** a carried reply fails its server attestation
- **THEN** nothing is shown, and no part of the unverified value is rendered

#### Scenario: A carried reply about a different agent
- **WHEN** a carried reply names an agent other than the one being viewed
- **THEN** it is not shown on that agent's surface

#### Scenario: A carried reply that has gone stale
- **WHEN** a carried reply is older than the window it was issued for
- **THEN** it is not shown, because live volatility has moved under it
