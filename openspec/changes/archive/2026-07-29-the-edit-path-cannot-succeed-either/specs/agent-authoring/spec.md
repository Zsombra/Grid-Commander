# agent-authoring — delta

## ADDED Requirements

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

## MODIFIED Requirements

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
