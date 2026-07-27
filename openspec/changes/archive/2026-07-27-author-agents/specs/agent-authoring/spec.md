## Purpose

How a user creates, configures, rebinds, retires and understands their BattleGrid
agents through Grid-Commander.

This capability is the first that changes a user's account. It inherits every
guarantee `battlegrid-connection` makes — classification, confirmation, audit,
concurrency — and adds the ones specific to agents: that the product never
invents a value the platform must validate, and never lets a destructive
configuration replacement look like an edit.

## ADDED Requirements

### Requirement: The Roster Reflects The Live Account
Grid-Commander SHALL present a user's agents as read from their BattleGrid
account at the time of viewing. It MUST NOT present agents from a cached copy
without saying that is what it is showing.

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
- **AND** no create or edit action is offered against state that was not read

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
Where BattleGrid treats an agent as immutable, Grid-Commander SHALL show it
without offering any action that would attempt to change it.

#### Scenario: A platform-owned agent in the roster
- **WHEN** an immutable agent appears in a user's roster
- **THEN** it is shown and readable
- **AND** no edit, rebind or archive action is offered for it

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
