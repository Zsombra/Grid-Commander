# agent-authoring — delta

## MODIFIED Requirements

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

#### Scenario: Composing an agent
- **WHEN** a user composes an agent
- **THEN** they are asked for every spending limit the platform declines to
  default
- **AND** told that the platform sets no default for them

#### Scenario: A value that removes the limit
- **WHEN** a field accepts a value the platform reads as *no cap*
- **THEN** the user is told, where they enter it, that the limit is removed
- **AND** the wording does not describe a stop that would never fire

#### Scenario: An agent created without a ceiling
- **WHEN** an agent is created with a cap the platform reads as unbounded
- **THEN** the agent is created
- **AND** it is not described as having that limit set

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
