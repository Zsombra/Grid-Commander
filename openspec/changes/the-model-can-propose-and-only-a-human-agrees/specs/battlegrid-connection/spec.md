# battlegrid-connection (delta)

## ADDED Requirements

### Requirement: A Recorded Proposal Carries No Authority

A proposal recorded on an operator's behalf SHALL hold no credential, no
confirmation, and no reservation against their BattleGrid account. It SHALL be
a statement of intent and nothing that can be spent.

The confirmation this product mints is a bearer capability: whatever holds one
can complete a write it was formed for. Storing one against a future human
decision would put an unspent authorization at rest, reachable by anything that
reaches the store, for as long as it lives.

#### Scenario: What is stored
- **WHEN** a proposal is recorded
- **THEN** no confirmation token is stored with it
- **AND** no access token is stored with it

#### Scenario: A proposal store that leaks
- **GIVEN** an attacker who can read every recorded proposal
- **WHEN** they use everything they find
- **THEN** no change can be made to any BattleGrid account
