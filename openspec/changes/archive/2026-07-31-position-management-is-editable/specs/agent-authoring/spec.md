## ADDED Requirements

### Requirement: Position Management Is Edited With Stated Values, And Drift Is Said
Where an agent is edited, Grid-Commander SHALL offer its position management
— the preset label and the fourteen behavioural values — through the same
person-confirmed edit flow as every other agent change. Choosing a catalog
preset SHALL send the platform's own values for it, wholesale; choosing
CUSTOM SHALL send the fourteen fields as the operator edited them; making no
choice SHALL change nothing. The confirmation SHALL be bound to the resolved
values, and the consequence SHALL name what position management becomes.
Where the agent's current values differ from the catalog's configuration for
the preset it names, the edit surface MUST say so, naming the differing
fields — the label alone is not the truth.

#### Scenario: Managing like a preset
- **WHEN** the operator picks a catalog preset and confirms
- **THEN** the platform's own fourteen values for that preset are sent with
  its label
- **AND** the consequence named the preset before agreement

#### Scenario: Custom values
- **WHEN** the operator picks CUSTOM and edits the fourteen fields
- **THEN** exactly those values are sent, labelled CUSTOM
- **AND** the confirmation is bound to them — an agreement about one set of
  values cannot authorise another

#### Scenario: No choice made
- **WHEN** the operator edits other fields and leaves position management
  alone
- **THEN** no position-management change is sent at all

#### Scenario: The label and the values disagree
- **WHEN** the agent names a preset whose catalog values differ from what it
  carries
- **THEN** the edit surface says which fields differ
- **AND** an agent labelled CUSTOM, or a catalog that cannot answer, draws
  no claim either way
