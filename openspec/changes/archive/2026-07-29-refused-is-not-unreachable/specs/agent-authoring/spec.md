## MODIFIED Requirements

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
