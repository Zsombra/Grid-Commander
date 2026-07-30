# strategy-authoring — delta

## MODIFIED Requirements

### Requirement: An Unusable Plan Is Refused Before It Is Sent
Where Grid-Commander can determine that a compiled plan will not be accepted, it
SHALL refuse it locally and say why. It MUST NOT treat its own determination as
evidence that a plan *will* be accepted.

**A local refusal SHALL rest on a fact the product actually holds.** *"Where
Grid-Commander can determine"* is the load-bearing clause and it was not honoured:
the account check compared BattleGrid's claim about which account compiled a plan
against an identifier that was never BattleGrid's — the string `'owner'` in one
deployment mode, a random sixteen-byte local id in the other. That is not a
determination. It made the product's headline capability, applying a compiled plan,
unreachable in every configuration from the day it was built.

**Where the product cannot establish the fact, it SHALL NOT refuse on that
ground.** Unknown is not mismatched. The platform holds the authoritative answer
and refuses a foreign plan itself; a local check exists to give a better message
sooner, never to invent a reason the user cannot act on.

#### Scenario: The plan has expired
- **WHEN** a user applies a plan whose window has passed
- **THEN** they are told it expired and invited to compile again
- **AND** nothing is sent

#### Scenario: The plan belongs to someone else
- **WHEN** a plan is presented that was not compiled for this user and this
  strategy
- **THEN** it is refused
- **AND** nothing is sent

#### Scenario: A plan that looks usable
- **WHEN** a plan appears valid by every check Grid-Commander can make
- **THEN** it is submitted
- **AND** the platform's judgement decides the outcome, not Grid-Commander's

#### Scenario: A plan compiled with this deployment's own credential
- **WHEN** a user applies a plan compiled by this deployment
- **THEN** it is not refused on the grounds of which account compiled it

#### Scenario: The acting account is not known
- **WHEN** the product cannot establish which account it is acting as
- **THEN** it does not refuse on that ground
- **AND** the platform decides
