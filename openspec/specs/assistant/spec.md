# Assistant Specification

## Purpose

How a user asks questions about their BattleGrid setup, and what the answers are
allowed to be built from.

This is the only capability whose output is generated rather than derived.
Everything else in this product either returns what BattleGrid said or refuses;
prose can be confidently wrong in a way a tool result cannot, and these
requirements exist to bound that.

## Requirements

### Requirement: The Assistant Can Only Read
The assistant SHALL be capable of reading the user's BattleGrid account and
nothing else. It MUST NOT be able to perform an operation that changes anything,
and that limit MUST NOT depend on the assistant choosing to observe it.

#### Scenario: Asking a question
- **WHEN** a user asks about their setup
- **THEN** the assistant may consult operations that only read

#### Scenario: An operation that would change something
- **WHEN** answering would involve an operation that changes anything
- **THEN** it is not available to the assistant at all
- **AND** the assistant reports what it cannot do rather than attempting it

#### Scenario: An operation whose effect is unknown
- **WHEN** the platform does not say whether an operation changes anything
- **THEN** it is not available to the assistant
- **AND** this is decided the same way it is decided everywhere else in the
  product

#### Scenario: The user asks the assistant to make a change
- **WHEN** a user asks the assistant to change something
- **THEN** it explains that it cannot, and where the change can be made
- **AND** no attempt is made

### Requirement: An Answer Names What It Was Built From
Every answer SHALL identify what the assistant consulted to produce it. An answer
that cannot be attributed MUST NOT be presented as fact.

#### Scenario: Answering from live reads
- **WHEN** the assistant answers a question about the user's setup
- **THEN** the answer identifies what was consulted

#### Scenario: Nothing was consulted
- **WHEN** the assistant answers without consulting anything
- **THEN** the answer is presented as general rather than as a statement about
  the user's account

#### Scenario: A consulted operation failed
- **WHEN** something the assistant consulted did not return
- **THEN** the answer says which part is missing
- **AND** the rest of the answer is not presented as though it were complete

### Requirement: The Assistant Answers About This User's Account
The assistant SHALL answer using only the connected user's own data. It MUST NOT
present information about another account as though it were the user's.

#### Scenario: A question about the user's setup
- **WHEN** a user asks about their agents or strategies
- **THEN** the answer is drawn from their connection

#### Scenario: A question the account cannot answer
- **WHEN** a question is about something outside the user's account
- **THEN** the assistant says so rather than answering from elsewhere

### Requirement: Not Knowing Is An Answer
Where the assistant lacks what it would need, it SHALL say so. It MUST NOT
present an inference as a reading, or fill a gap the platform left.

#### Scenario: The platform did not report a value
- **WHEN** an answer would depend on something the platform did not return
- **THEN** the assistant reports it as unknown
- **AND** does not substitute a plausible value

#### Scenario: A question the assistant cannot answer
- **WHEN** a question is outside what the assistant can establish
- **THEN** it says so plainly and, where possible, says who or what could

### Requirement: Asking Requires An Account That Can Act
The assistant SHALL be available only to a request whose connection can read the
user's account. Losing that access MUST be reported the way it is everywhere else
in the product.

#### Scenario: Asking without a usable connection
- **WHEN** a user asks a question and the connection cannot act
- **THEN** they are told they are not connected, in the same terms as elsewhere
- **AND** nothing is consulted

#### Scenario: Access is lost mid-answer
- **WHEN** access is withdrawn while an answer is being produced
- **THEN** the answer is abandoned rather than completed from what was already
  read

### Requirement: What The Assistant Did Is Visible To The User
Reads performed on a user's behalf by the assistant SHALL be distinguishable from
reads the user performed themselves.

#### Scenario: Reviewing what the assistant consulted
- **WHEN** a user wants to know what the assistant looked at
- **THEN** it is available to them

#### Scenario: Telling assistant activity from the user's own
- **WHEN** a user reviews activity on their account
- **THEN** what the assistant did on their behalf is identifiable as such
