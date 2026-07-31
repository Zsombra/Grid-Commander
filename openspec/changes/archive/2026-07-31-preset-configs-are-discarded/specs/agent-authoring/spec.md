## ADDED Requirements

### Requirement: A Position Preset Is Offered With The Platform's Own Values
Where the platform's catalog states a position-management preset together with
the complete configuration it stands for, Grid-Commander SHALL offer that
preset when an agent is created, and choosing it SHALL send exactly the values
the platform stated for it, with the preset's own label beside them — no value
the product chose among them. A preset whose configuration the platform did
not supply MUST NOT be offered, and a preset name the catalog does not carry
MUST be refused before submission. `CUSTOM` SHALL remain offerable as the name
for values the product assembles.

The platform states each preset's fourteen values and declines to expand a
label into them server-side — the label is sent alongside the configuration,
never instead of it. Discarding those values at the boundary meant every agent
was created `CUSTOM` under numbers nobody picked deliberately, and the create
form had its preset control removed because offering a choice the action
discarded was worse than not asking.

#### Scenario: Choosing a preset
- **WHEN** the operator picks a catalog preset while creating an agent
- **THEN** the position-management values sent are the platform's own for that
  preset, with the preset's label beside them
- **AND** no product-chosen value is among the fourteen

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
