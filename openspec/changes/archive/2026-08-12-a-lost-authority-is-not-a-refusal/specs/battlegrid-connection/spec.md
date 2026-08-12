# battlegrid-connection — delta

## ADDED Requirements

### Requirement: Authority Lost Mid-Operation Is Told Apart From A Refusal
Where an operation fails because the account's authority is no longer valid,
Grid-Commander SHALL say that, and SHALL NOT present it as a refusal of that
operation.

They are different facts with different futures. A refusal is about the thing
that was attempted — a revision moved, a value was rejected — and attempting
something else may well work. Lost authority is about the account: nothing will
work until the credential is repaired or the connection remade. An operator who
reads "Refused:" above a live confirmation form will press it again, because
that is what the screen is for.

Where authority is lost, the surface SHALL NOT offer the control that performs
the operation. A control that cannot succeed is not made honest by the sentence
above it.

The sentence shown SHALL be the one the failure carried, because it is built
with the remedy belonging to the deployment that raised it — see *A Remedy
Named Must Exist In That Deployment*.

#### Scenario: A write fails because authority is gone
- **WHEN** an operation fails because the account's authority is no longer valid
- **THEN** the operator is told the authority is no longer valid, with that
  deployment's remedy
- **AND** it is not presented as a refusal of the operation they attempted

#### Scenario: Nothing to press
- **WHEN** a surface reports that authority is no longer valid
- **THEN** it does not render the control that performs the operation

#### Scenario: A refusal is still a refusal
- **WHEN** an operation is refused for any reason other than lost authority
- **THEN** it is reported as a refusal, and the surface may still offer the
  operation

## MODIFIED Requirements

### Requirement: A Remedy Named Must Exist In That Deployment
Where the product tells a user how to recover from a failure, it SHALL name a
remedy available in the deployment they are using, and MUST NOT name one that
exists only in another.

Diagnosis and remedy are different facts and travel differently. *What went
wrong* is the same everywhere — authority is no longer valid — and is stated in
one way for every cause, so nobody has to distinguish an expired token from a
forged cookie. *What to do about it* depends on how the deployment obtained its
authority in the first place, and there are only two answers.

Naming the wrong one is worse than naming none. A user who is told to reconnect
goes looking for a connect button; when there is none, the reasonable conclusion
is that the product is broken, not that the advice was written for a deployment
they are not running.

This is why a failure that carries a remedy is shown with the sentence it
carried, rather than being routed somewhere that composes its own. Sending an
operator whose write just failed to the page that begins an authorization is
correct on a deployment that can begin one, and on a deployment acting with a
configured credential it renders "there is nothing to connect" — a true fact
about the deployment, and an answer to a question they did not ask.

#### Scenario: A configured credential is refused
- **WHEN** the platform refuses the credential a deployment was configured with
- **THEN** the user is told the authority is no longer valid
- **AND** told to repair the configured credential
- **AND** not told to reconnect

#### Scenario: A delegated authority is lost
- **WHEN** a deployment that authenticates users loses its authority for one of
  them
- **THEN** the user is told the authority is no longer valid
- **AND** invited to reconnect

#### Scenario: A remedy carried by a failure is not replaced by a redirect
- **WHEN** a failure carries the remedy for the deployment that raised it
- **THEN** that sentence is what the operator is shown
- **AND** they are not sent instead to a page that names a different remedy or
  none

#### Scenario: Offering to connect where there is nothing to connect
- **WHEN** a user reaches the page that begins an authorization, on a deployment
  acting with a configured credential
- **THEN** they are told this deployment acts with a configured credential
- **AND** no authorization can be started from it

#### Scenario: Which remedy applies is not decided per request
- **WHEN** the product is assembled
- **THEN** the remedy its failures will name is fixed for that deployment
