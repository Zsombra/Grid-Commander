## ADDED Requirements

### Requirement: A Grant Carries Authority, Not Identity
Grid-Commander SHALL establish which BattleGrid account a delegated connection
acts as by an authenticated read performed with the granted authority, and MUST
NOT require the authorization response to carry that identity.

An authorization response says what the bearer may do. It is not required to say
who they are, and BattleGrid's does not: it is plain OAuth 2.1, publishes no
OpenID configuration, and advertises no endpoint that describes the end user. A
product that reads identity off a grant is reading a field its authorization
server never promised.

The identity established this way SHALL be the platform's own answer, obtained
with the authority just granted — never a value this product minted, and never a
default standing in for one it could not obtain.

#### Scenario: The grant carries no subject
- **WHEN** BattleGrid returns a grant that names no account
- **THEN** the connection still completes
- **AND** the acting account is the one the platform answers with when asked
- **AND** the absence of an identity claim on the grant is not itself a refusal

#### Scenario: A returning user
- **WHEN** a user who has connected before authorizes again
- **THEN** the account the platform answers with is recognised as the same one
- **AND** they land back in the workspace they already had, holding what they
  left there

#### Scenario: Two different users connect
- **WHEN** two users each complete an authorization
- **THEN** each acts as the account the platform named for their own credential
- **AND** neither is recognised as the other

### Requirement: A Connection Whose Account Cannot Be Identified Is Refused, And Its Grant Released
Where Grid-Commander cannot establish which account a new delegated connection
acts as, it SHALL store no connection, issue no session, and MUST relinquish the
authority it was just granted at BattleGrid.

A grant that has been issued is live whether or not this product managed to use
it. Discarding it locally would leave a user holding authority they were told was
never established — the same failure that makes local-only disconnection wrong.

The user SHALL be returned to the point where a connection is started, told that
the account could not be identified, and offered a retry. This outcome MUST NOT
reach them as an unhandled failure.

#### Scenario: The identity read cannot answer
- **WHEN** the account read fails or names no account
- **THEN** no connection is stored and no session is issued
- **AND** the authority just granted is relinquished at BattleGrid
- **AND** the user is returned with an explanation and the option to retry

#### Scenario: The grant cannot be released either
- **WHEN** relinquishing the just-granted authority also fails
- **THEN** no connection is stored and no session is issued
- **AND** the user is told that authority may still stand at BattleGrid
- **AND** they are told where it can be withdrawn

#### Scenario: A refusal is never a crash
- **WHEN** a connection is refused for want of an identity
- **THEN** the user sees the connect surface and an explanation
- **AND** they are not shown an unhandled error

### Requirement: The Coverage Around Consent Is Stated Where It Is Read
Where Grid-Commander's checks report on the authorization path, they SHALL state
which part of that path they do not exercise.

A check list that names the connection path reads as covering it. Verifying the
authorization server's published description, and exchanging a code for a token,
are different assertions — and the second cannot be automated, because an
authorization code requires a person at a consent screen. The limit is real; a
reader believing it does not exist is not.

#### Scenario: Reading what the checks cover
- **WHEN** an operator reads the checks that name the authorization path
- **THEN** the boundary between what is verified automatically and what requires
  a human at a consent screen is stated there

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

**That tolerance applies to acting, not to connecting.** A deployment already
acting must survive not knowing its account id. A delegated connection being
established has nothing to act under yet — the account is the key the workspace
is found by — so an unknown identity there refuses the connection rather than
being carried forward as unknown.

#### Scenario: Acting under a delegated connection
- **WHEN** the product acts for a user who connected by authorization
- **THEN** the identity it presents to a platform-issued check is the subject the
  platform answered with when asked, not a claim carried on the authorization
  response, and not the local row id

#### Scenario: Acting under the owner's own credential
- **WHEN** the deployment holds the owner's own key
- **THEN** the platform's identity for that account is established from the
  platform, or reported as unknown
- **AND** an unknown one leaves the deployment working

#### Scenario: The two identifiers are not interchangeable
- **WHEN** code compares a platform-issued claim about an account
- **THEN** the local identifier cannot be supplied in its place
