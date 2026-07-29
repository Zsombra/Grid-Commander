## ADDED Requirements

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
- **THEN** the product reports it in the same terms it reports a lost connection
- **AND** does not present the account as readable

### Requirement: A Declared Scope Is Not A Granted One
Where the authority a credential holds cannot be verified, the product SHALL
treat what it was told as a declaration, and MUST NOT present it as a
restriction the platform enforces.

A delegated grant is registered for named scopes, so authority beyond them is
unobtainable. A credential the operator supplies carries whatever the platform
gave it, which may be more. Presenting the second as though it were the first
would claim a boundary that does not exist.

#### Scenario: Acting with a declared scope
- **WHEN** the product acts with a credential whose scopes were declared rather
  than granted
- **THEN** the declaration is used to decide what may be attempted
- **AND** it is not described to the user as a limit the platform imposes

#### Scenario: What still decides
- **WHEN** an operation would change or destroy something
- **THEN** it is decided by what the platform says the operation does, and by
  confirmation
- **AND** not by the declared scope alone

#### Scenario: Declaring less than the credential holds
- **WHEN** a declaration names fewer scopes than the credential actually carries
- **THEN** the product still refuses what the declaration excludes
- **AND** this is understood as the product's own restraint, not the platform's

### Requirement: A Deployment Without A Login Says So
Where the product acts as the owner without authenticating anyone, it SHALL
disclose that on the pages it serves.

Anyone who can reach such a deployment acts as the account owner. That is
correct on one person's machine and wrong the moment it is reachable from
anywhere else, and the difference is invisible from the screen.

#### Scenario: Using a deployment that authenticates nobody
- **WHEN** a user is on any page of a deployment acting as the owner
- **THEN** they are told that it authenticates nobody
- **AND** told what that means for anyone else who can reach it

#### Scenario: A deployment that does authenticate
- **WHEN** the product resolves a session before acting
- **THEN** no such disclosure is shown
