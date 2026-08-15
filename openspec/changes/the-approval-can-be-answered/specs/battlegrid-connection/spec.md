# BattleGrid Connection — Delta

## MODIFIED Requirements

### Requirement: Read Scope Is Requested And Wager Scope Is Not

Grid-Commander SHALL request only the scope required to read and configure when
a user connects their account. It MUST NOT request authority to commit funds at
connection time, and MUST NOT request it as a condition of using the product.
The authority an operation is measured against SHALL be the authority recorded
on the user's connection, never an assumption about what was granted.

Authority to commit funds MAY be added afterwards, only by a step-up the
operator explicitly begins, and only for the operations that require it.

#### Scenario: Connecting
- **WHEN** a user authorizes Grid-Commander
- **THEN** the request covers reading and configuration only
- **AND** authority to commit funds is not requested

#### Scenario: A tool requiring wager authority is reached
- **WHEN** any operation would require authority the connection does not hold
- **THEN** the operation is refused before it is attempted
- **AND** the user is told which authority would be needed and how to grant it

#### Scenario: The grant is narrower than what was asked for
- **WHEN** BattleGrid returns a grant carrying less authority than was requested
- **THEN** operations are measured against what was actually granted
- **AND** an operation the grant does not cover is refused before it is
  attempted, in the same way as one requiring wager authority

#### Scenario: Nothing is gated behind fund-committing authority except answering
- **GIVEN** a connection holding read and configuration authority only
- **WHEN** the user reads agents, strategies, decisions and records
- **THEN** every one of those surfaces works
- **AND** only answering a decision is unavailable

## ADDED Requirements

### Requirement: Fund-Committing Authority Is Granted By A Step-Up The Operator Begins

Where an operation requires authority to commit funds, the product SHALL offer
to obtain that authority only from the point of use, and only when the operator
asks for it. The step-up SHALL state which operations the authority permits,
that it permits committing the user's money, and that the platform's own caps
continue to apply.

The product SHALL NOT begin a step-up on its own initiative, on a schedule, in
response to a model, or as a side effect of reading anything.

#### Scenario: Answering without the authority
- **GIVEN** a connection that does not hold authority to commit funds
- **WHEN** the operator opens a decision awaiting an answer
- **THEN** the decision is fully readable
- **AND** accept and cancel are refused before they are attempted, naming the
  authority needed and offering the step-up

#### Scenario: The operator begins the step-up
- **WHEN** the operator asks to grant fund-committing authority
- **THEN** they are told it permits accepting and cancelling proposed trades
- **AND** that accepting commits their money

#### Scenario: The step-up is declined or abandoned
- **GIVEN** an operator who begins and does not complete the step-up
- **WHEN** they return to the decision
- **THEN** the decision is still readable
- **AND** the product has not recorded authority it does not hold

#### Scenario: Nothing else begins a step-up
- **WHEN** any read, any model-recorded proposal, or any scheduled work runs
- **THEN** no step-up is begun
- **AND** the connection's authority is unchanged
