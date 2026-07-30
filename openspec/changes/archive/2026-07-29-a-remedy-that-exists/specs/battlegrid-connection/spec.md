## ADDED Requirements

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

#### Scenario: Offering to connect where there is nothing to connect
- **WHEN** a user reaches the page that begins an authorization, on a deployment
  acting with a configured credential
- **THEN** they are told this deployment acts with a configured credential
- **AND** no authorization can be started from it

#### Scenario: Which remedy applies is not decided per request
- **WHEN** the product is assembled
- **THEN** the remedy its failures will name is fixed for that deployment
- **AND** no request chooses it

## MODIFIED Requirements

### Requirement: A Deployment May Hold The Owner's Own Credential
Where a deployment is configured with a credential belonging to the person using
it, the product SHALL act with that credential directly and MUST NOT require a
delegated authorization it does not need.

A personal tool obtaining a grant to act on its own operator's behalf is
ceremony that protects nobody: the operator already holds the credential the
grant would produce.

#### Scenario: Configured with the owner's credential
- **WHEN** a deployment is given the owner's BattleGrid credential
- **THEN** requests act with it
- **AND** no authorization flow is required before the product can be used

#### Scenario: Not configured with one
- **WHEN** no owner credential is configured
- **THEN** the product behaves exactly as it does for a delegated connection
- **AND** nothing about the delegated path changes

#### Scenario: The credential stops working
- **WHEN** the platform refuses the owner's credential
- **THEN** the product reports the loss of authority in the same terms it
  reports a lost connection
- **AND** names the remedy that applies to a configured credential
- **AND** does not present the account as readable

#### Scenario: The owner is never turned away for lacking a session
- **WHEN** a deployment is configured with the owner's credential
- **THEN** no request is refused for having no session
- **AND** the page that reports a missing session is unreachable
