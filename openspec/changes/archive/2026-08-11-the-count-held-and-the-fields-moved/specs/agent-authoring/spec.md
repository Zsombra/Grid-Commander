# Agent Authoring — Delta

## MODIFIED Requirements

### Requirement: A Position Preset Is Offered With The Platform's Own Values
Where the platform's catalog states a position-management preset together with
the complete configuration it stands for, Grid-Commander SHALL offer that
preset when an agent is created, and choosing it SHALL send exactly the values
the platform stated for it, with the preset's own label beside them — no value
the product chose among them. A preset whose configuration the platform did
not supply MUST NOT be offered, and a preset name the catalog does not carry
MUST be refused before submission. `CUSTOM` SHALL remain offerable as the name
for values the product assembles.

The platform states each preset's complete behavioural configuration and
declines to expand a label into it server-side — the label is sent alongside
the configuration, never instead of it. How many values that is belongs to
the platform, not to this contract: v17.2.0 replaced the typed trailing pair
and the take-profit break-even trigger with a giveback percentage and an
R-multiple, taking the set from fourteen to twelve without renaming a single
preset. Discarding those values at the boundary meant every agent was created
`CUSTOM` under numbers nobody picked deliberately, and the create form had
its preset control removed because offering a choice the action discarded was
worse than not asking.

#### Scenario: Choosing a preset
- **WHEN** the operator picks a catalog preset while creating an agent
- **THEN** the position-management values sent are the platform's own for that
  preset, complete, with the preset's label beside them
- **AND** no product-chosen value is among them

#### Scenario: A preset the platform did not describe fully
- **WHEN** the catalog lists a preset without the configuration it stands for
- **THEN** that preset is not offered

#### Scenario: A preset name from outside the catalog
- **WHEN** a create request names a preset the catalog does not carry
- **THEN** it is refused before submission, naming the field

#### Scenario: CUSTOM, chosen or defaulted
- **WHEN** the operator picks `CUSTOM`, or picks nothing
- **THEN** the values sent are the product-assembled set, exactly as before
- **AND** the values the product supplies of its own choosing remain stated as
  its own

### Requirement: Position Management Is Edited With Stated Values, And Drift Is Said
Where an agent is edited, Grid-Commander SHALL offer its position management
— the preset label and the platform's full set of behavioural values —
through the same person-confirmed edit flow as every other agent change.
Choosing a catalog preset SHALL send the platform's own values for it,
wholesale; choosing CUSTOM SHALL send the full field set as the operator
edited it; making no choice SHALL change nothing. The field set is the
platform's current one, not a remembered one — twelve fields at v17.2.0,
fourteen before it. The confirmation SHALL be bound to the resolved values,
and the consequence SHALL name what position management becomes. Where the
agent's current values differ from the catalog's configuration for the
preset it names, the edit surface MUST say so, naming the differing fields —
the label alone is not the truth.

#### Scenario: Managing like a preset
- **WHEN** the operator picks a catalog preset and confirms
- **THEN** the platform's own values for that preset are sent, complete,
  with its label
- **AND** the consequence named the preset before agreement

#### Scenario: Custom values
- **WHEN** the operator picks CUSTOM and edits the behavioural fields
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
