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
strategy alone.

#### Scenario: Rebinding is requested
- **WHEN** a user asks to rebind an agent to a different strategy
- **THEN** they are told that the agent's context, signal rules, prose and
  timeframe will be replaced by the new strategy's, not merged with them
- **AND** the agent being rebound and the strategy it will be bound to are both
  named
- **AND** the rebind is not attempted until they confirm that specific operation

#### Scenario: Confirmation is withheld
- **WHEN** a user does not confirm a rebind
- **THEN** nothing about the agent changes
- **AND** no attempt is made against BattleGrid

#### Scenario: A confirmation is reused for a different rebind
- **WHEN** a confirmation issued for one agent or one target strategy is
  presented for another
- **THEN** it is refused
- **AND** the user is asked to confirm the operation actually being performed

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

#### Scenario: Reading an agent's journal
- **WHEN** a user opens an agent's journal
- **THEN** they see that agent's thoughts, activity and decisions as BattleGrid
  records them

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

#### Scenario: Setting a value the form offers
- **WHEN** a user sets a value using a control the interface renders and submits
- **THEN** that value reaches the operation the form performs

#### Scenario: A control the operation does not read
- **WHEN** a control is rendered whose value no operation reads
- **THEN** this fails a check that gates a change, rather than being found by a
  user whose agent was configured without it

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
creates something that trades under limits nobody chose. This product refuses to
state what it does not know everywhere else; agent creation is where that
refusal is worth the most.

The same holds when limits are **changed**. BattleGrid's `tradingConfig` is
all-or-nothing: a partial send does not error, it resets the fields it omits. So
an edit that reaches the platform carrying nineteen of twenty fields silently
discards the twentieth. Completeness SHALL be checked before an edit is sent,
not only before a create.

#### Scenario: Composing an agent
- **WHEN** a user composes an agent
- **THEN** they are asked for every spending limit the platform declines to
  default
- **AND** told that the platform sets no default for them

#### Scenario: A limit is left unanswered
- **WHEN** a user submits without answering one
- **THEN** the agent is not created
- **AND** they are told which limit has no answer, and why it must be given

#### Scenario: The safe answer is available and offered first
- **WHEN** a user is asked how the agent may trade
- **THEN** an option that places no trades at all is offered before the others
  and chosen by default
- **AND** they are told the choice can be changed later

#### Scenario: No limit is suggested
- **WHEN** a spending limit is asked for
- **THEN** no value is pre-filled
- **AND** an empty answer is treated as unanswered rather than as zero

#### Scenario: Editing an agent's limits
- **WHEN** a user changes one of an agent's spending limits
- **THEN** the configuration sent carries every field the platform requires
- **AND** an incomplete one is refused before it is sent, rather than silently
  resetting the limits it omits

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

#### Scenario: A write that succeeds
- **WHEN** a user performs a write that succeeds
- **THEN** they are shown its effect

#### Scenario: A write that is refused
- **WHEN** a write is refused
- **THEN** the user is told, on the surface they acted from
- **AND** the reason given is the one the operation returned

#### Scenario: A result the surface never reads
- **WHEN** a surface performs a write and does not read its outcome
- **THEN** this fails a check that gates a change, rather than being found by an
  operator whose action silently did nothing
