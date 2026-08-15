# Agent Understanding — Delta

## ADDED Requirements

### Requirement: Decisions Awaiting An Answer Are Readable As A Queue

Where an agent proposes trades and waits for a human, the product SHALL show
every decision currently awaiting an answer, across all of the user's agents,
with the agent that proposed it, the coin, the direction, the conviction it
reached, its entry, stop and target levels, its reasoning, and how long remains
before it expires.

The queue SHALL be built only from fields the platform returns on a decision.
It MUST NOT display a position size in currency: the platform does not compute
one until the decision is accepted.

#### Scenario: A decision is waiting
- **GIVEN** an agent in approval-required mode that has proposed an entry
- **WHEN** the operator opens the approvals queue
- **THEN** the decision is listed with its coin, direction, conviction, entry,
  stop, target and reasoning
- **AND** the time remaining before it expires is shown

#### Scenario: Nothing is waiting
- **GIVEN** no decision awaiting an answer
- **WHEN** the operator opens the queue
- **THEN** the queue says nothing is waiting
- **AND** it does not report an error or an empty failure

#### Scenario: The size is not yet known
- **GIVEN** a decision awaiting an answer
- **WHEN** it is displayed
- **THEN** the size is described as the proportion the agent chose
- **AND** no currency amount is shown for the position that would open

#### Scenario: The queue cannot be read
- **GIVEN** a queue read that the platform refuses
- **WHEN** the operator opens the queue
- **THEN** the refusal is stated with the platform's own reason
- **AND** the queue is not rendered as empty

### Requirement: A Decision Can Be Cancelled

The product SHALL let an operator cancel a decision awaiting an answer.
Cancelling requires authority to commit funds even though it commits none, and
the platform marks it destructive; the product SHALL treat it as destructive.

Before cancelling, the operator SHALL be shown what will be cancelled and told
that the agent will not re-propose it.

#### Scenario: Cancelling a decision
- **GIVEN** a decision awaiting an answer
- **WHEN** the operator cancels it and confirms
- **THEN** the decision is cancelled at the platform
- **AND** the queue reflects that it is no longer waiting

#### Scenario: The consequence is stated before cancelling
- **WHEN** the operator begins cancelling
- **THEN** they are shown the coin, direction and levels being cancelled
- **AND** told the proposal will not return on its own

#### Scenario: The decision expired first
- **GIVEN** a decision whose window closed after the queue was rendered
- **WHEN** the operator confirms the cancel
- **THEN** they are told it expired unanswered
- **AND** it is not reported as a cancel they performed

### Requirement: A Decision Can Be Accepted, And Accepting Opens A Position

The product SHALL let an operator accept a decision awaiting an answer.
Accepting opens a position at real size with the user's money.

Before accepting, the operator SHALL be shown the coin, the direction, the
entry, stop and target levels, the proportion of the agent's headroom that will
be committed, and a statement in plain words that accepting opens a position
with real money.

Accept SHALL NOT be offered on a surface where cancel is unavailable.

#### Scenario: Accepting a decision
- **GIVEN** a decision awaiting an answer
- **WHEN** the operator accepts it and confirms
- **THEN** the decision is accepted at the platform
- **AND** the outcome, including any refusal, is reported with the platform's
  own reason

#### Scenario: The consequence names money
- **WHEN** the operator begins accepting
- **THEN** the confirmation states that a position will open with real money
- **AND** the entry, stop and target levels being agreed to are shown

#### Scenario: The decision expired first
- **GIVEN** a decision whose window closed after the queue was rendered
- **WHEN** the operator confirms the accept
- **THEN** they are told it expired unanswered and no position was opened
- **AND** the queue is refreshed

### Requirement: An Answer Is Bound To The Decision That Was Shown

What the operator agrees to MUST be bound to the decision they read. The product
SHALL carry the decision's identity **and its entry, stop and target levels**
from the moment they are shown into the moment the answer is performed, and
SHALL re-read the decision immediately before performing it.

The answer SHALL be refused unless, on that re-read, all three levels match what
was shown **and** the decision is still awaiting an answer. A decision that is
no longer awaiting an answer SHALL be refused even when its levels match.

On any refusal the difference SHALL be stated and the operator returned to a
freshly rendered decision. The platform publishes no revision or version on a
decision, so the levels and the decision's own state are the change-detector;
the product MUST NOT claim a guarantee stronger than they provide.

#### Scenario: The decision is unchanged and still waiting
- **GIVEN** an operator confirming an answer
- **WHEN** the decision re-reads identically on all three levels and is still
  awaiting an answer
- **THEN** the answer is performed

#### Scenario: A level moved between reading and answering
- **GIVEN** an operator confirming an answer
- **WHEN** the decision's entry, stop or target differs from what was shown
- **THEN** the answer is refused before it is attempted
- **AND** the operator is shown which level moved, from what to what
- **AND** the decision is re-rendered for a fresh answer

#### Scenario: The levels match but the decision is no longer waiting
- **GIVEN** an operator confirming an answer
- **WHEN** the decision re-reads with all three levels matching but it has
  expired, or been answered elsewhere
- **THEN** the answer is refused before it is attempted
- **AND** the operator is told what became of it
- **AND** nothing is sent to the platform

#### Scenario: The decision is gone
- **GIVEN** an operator confirming an answer
- **WHEN** the decision can no longer be read
- **THEN** the answer is refused and the operator is told it is no longer
  available
- **AND** nothing is sent to the platform

### Requirement: Answering A Decision Is Recorded As A Money Write

Every accept and every cancel SHALL be recorded in the audit as a write made on
the operator's behalf that required authority to commit funds, with the decision
it answered, the levels it was bound to, and the platform's response.

A refused answer SHALL be recorded with its reason.

#### Scenario: An accepted decision is audited
- **WHEN** an operator accepts a decision
- **THEN** the audit records the decision, the levels agreed to, and the outcome
- **AND** the record states that fund-committing authority was used

#### Scenario: A refused answer is audited
- **WHEN** an answer is refused by the platform or by the binding check
- **THEN** the audit records the attempt and the reason
- **AND** no success is recorded

## REMOVED Requirements

### Requirement: An Unanswerable Trading Mode Says So

**Reason**: its entire content is a disclosure that accept and cancel are
unbuilt. This change builds them, so the disclosure would become false.

**Migration**: the trading mode selector stops saying the option is unfinished.
Where it previously named where answering still happens, it now links to the
approvals queue.
