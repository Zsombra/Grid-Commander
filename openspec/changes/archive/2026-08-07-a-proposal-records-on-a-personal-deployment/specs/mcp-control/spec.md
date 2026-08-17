## MODIFIED Requirements

### Requirement: A Model Can Record A Proposal And Nothing More

The MCP surface SHALL let a model record, on the operator's behalf, an intent
to make a change: which change, against which target, with which values.
Recording SHALL work on every deployment mode the server starts under —
in particular a personal-key deployment, where no delegated identity row
exists, because that is the mode the stdio server is most run in.

Recording a proposal SHALL NOT read a consequence, mint a confirmation, reserve
anything, or contact BattleGrid. The response SHALL identify the proposal and
say where a human can act on it.

#### Scenario: A model proposes a change
- **GIVEN** a connected account
- **WHEN** a model records a proposal
- **THEN** it receives a reference to the proposal and where to review it
- **AND** the operator's BattleGrid account is unchanged

#### Scenario: On a personal deployment
- **GIVEN** a personal-key deployment, whose acting identity has no stored
  user row
- **WHEN** a model records a proposal
- **THEN** it is recorded and listed for the operator
- **AND** it is not refused on the strength of an identity table only the
  delegated path writes

#### Scenario: A proposal the product cannot express
- **GIVEN** a proposal naming a change this product does not offer
- **WHEN** it is recorded
- **THEN** it is refused, naming what is not offered
- **AND** nothing is stored

#### Scenario: The model does not receive a confirmation
- **WHEN** any proposal is recorded
- **THEN** the response carries no confirmation token
- **AND** no confirmation exists to be carried
