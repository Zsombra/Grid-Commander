# battlegrid-connection — delta

## MODIFIED Requirements

### Requirement: The Connection Is The Identity
A connection to BattleGrid SHALL be the identity Grid-Commander acts under, and
the product SHALL NOT invent an identity of its own to act with.

**The local identifier and BattleGrid's are distinct, and SHALL NOT be
interchanged.** `users.id` names a row in this product's database; the subject
BattleGrid issues names an account on the platform. They are stored as separate
columns precisely because they are different facts — one is minted here, the other
is given to us — and a value the platform issued MUST be compared only against the
platform's own.

Every comparison against a platform-issued claim SHALL be typed so that supplying
the local identifier is not possible, rather than guarded by convention. A
convention was in force and produced a check that could never pass: BattleGrid's
account id compared against a random sixteen-byte local id in one mode and the
string `'owner'` in the other.

**Where the platform's identity for the acting account is unknown, it SHALL be
represented as unknown** rather than substituted. A substituted identity reads as
a mismatch, and a mismatch reads as a refusal the user cannot act on.

#### Scenario: Acting under a delegated connection
- **WHEN** the product acts for a user who connected by authorization
- **THEN** the identity it presents to a platform-issued check is the subject
  BattleGrid issued, not the local row id

#### Scenario: Acting under the owner's own credential
- **WHEN** the deployment holds the owner's own key
- **THEN** the platform's identity for that account is established from the
  platform, or reported as unknown

#### Scenario: The two identifiers are not interchangeable
- **WHEN** code compares a platform-issued claim about an account
- **THEN** the local identifier cannot be supplied in its place
