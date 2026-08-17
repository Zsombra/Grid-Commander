# BattleGrid Connection — Delta

## MODIFIED Requirements

### Requirement: Destructive Operations Require Confirmation Naming The Consequence
Before performing an operation that is destructive **or that commits the user's
funds**, Grid-Commander SHALL obtain confirmation from the user that names what
will be changed, lost, or spent.

**Whether an operation carries that consequence is this product's judgement, not
the platform's.** BattleGrid annotates each tool with a `destructiveHint`, and
that annotation MAY be recorded as evidence but MUST NOT be the only thing that
decides. Where the platform supplies no hint on a mutating operation, the
operation SHALL be treated as carrying the consequence.

**A confirmation SHALL authorise the operation it described, and no other.**
Where the operation carries values — an amount, a destination, a configuration —
those values are part of what was agreed to, and a confirmation issued against
one set of values MUST NOT authorise a submission carrying different ones.

Matching the user, the tool and the entity is not sufficient. A token issued
against *"sets the most it may lose in a day to $25"* and a submission carrying
$25,000 are the same user, the same tool and the same agent. The consequence is
stored, so such a mismatch is **recorded** in the audit log; recording it is not
preventing it, and the audit log is what this product offers in place of trust.

**The binding SHALL be checked before a request is built**, not after the platform
answers. A refusal that arrives from BattleGrid has already sent the tampered
values.

**One mechanism, in one place.** Where several flows bind values into a
confirmation, they SHALL do so through a single shared construction rather than
each composing the same string by hand. Three flows building it independently is
how the fourth came to be written without it.

#### Scenario: A destructive operation is requested
- **WHEN** a user asks for something classified as destructive
- **THEN** they are shown what it will change or remove before it happens
- **AND** it proceeds only after they confirm

#### Scenario: An operation that commits funds is requested
- **WHEN** a user asks for an operation that spends or commits their money
- **THEN** a confirmation is required before it is performed
- **AND** this holds even where the platform's own annotation says the operation
  is not destructive

#### Scenario: The platform calls a money-committing operation harmless
- **GIVEN** a mutating operation this product classifies as committing funds
- **WHEN** the platform annotates it as not destructive
- **THEN** the confirmation is still required
- **AND** the platform's annotation is recorded rather than obeyed

#### Scenario: Confirmation is withheld
- **WHEN** the user does not confirm
- **THEN** nothing is changed

#### Scenario: The submitted values differ from the agreed ones
- **WHEN** an operation is submitted carrying values other than those the
  confirmation was issued against
- **THEN** the confirmation does not authorise it
- **AND** no request is built

#### Scenario: The values are the ones that were agreed
- **WHEN** an operation is submitted carrying exactly the values described
- **THEN** the confirmation authorises it, once

#### Scenario: The record of a money-committing write says so
- **WHEN** an operation that commits funds is recorded in the audit
- **THEN** the record states that it carried that consequence
- **AND** it does not report the platform's contrary annotation as this
  product's own assessment

### Requirement: Read Scope Is Requested And Wager Scope Is Not

Grid-Commander SHALL request only the scope required to read and configure when
a user connects their account. It MUST NOT request authority to commit funds at
connection time, and MUST NOT request it as a condition of using the product.
The authority an operation is measured against SHALL be the authority recorded
on the user's connection, never an assumption about what was granted.

Authority to commit funds MAY be added afterwards, only by a step-up the
operator explicitly begins, and only for the operations that require it.

**Which operations require it SHALL be known to the layer that enforces it.**
The enforcing layer MUST NOT depend on a per-operation authority declaration the
platform does not publish; where no such declaration exists, the requirement
SHALL be determined by this product. An operation whose authority requirement
cannot be determined SHALL be treated as requiring the greater authority.

#### Scenario: Connecting
- **WHEN** a user authorizes Grid-Commander
- **THEN** the request covers reading and configuration only
- **AND** authority to commit funds is not requested

#### Scenario: A tool requiring wager authority is reached
- **WHEN** any operation would require authority the connection does not hold
- **THEN** the operation is refused before it is attempted
- **AND** the user is told which authority would be needed and how to grant it

#### Scenario: The enforcing layer can name a money-committing operation
- **GIVEN** an operation this product classifies as committing funds
- **WHEN** it is reached on a connection holding read authority only
- **THEN** it is refused before it is attempted
- **AND** the refusal names fund-committing authority as what is missing

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
