## ADDED Requirements

### Requirement: An Agent's Spending Limits Are Stated Before It Exists
Where the platform declines to default a limit on what an agent may spend,
Grid-Commander SHALL obtain that limit before creating the agent, and MUST NOT
create one whose limits it cannot state.

A platform that defaults a value has decided it. A platform that declines to
default one has not — and treating the second as though it were the first
creates something that trades under limits nobody chose. This product refuses to
state what it does not know everywhere else; agent creation is where that
refusal is worth the most.

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

#### Scenario: Configuration is sent whole
- **WHEN** an agent is created
- **THEN** every field the platform requires in its trading configuration is
  sent
- **AND** none is left to be reset by a partial submission

#### Scenario: What the platform does default
- **WHEN** the platform declares a default for a setting
- **THEN** that default is used
- **AND** the user is not asked for it
