## ADDED Requirements

### Requirement: A Refused Edit Keeps What Was Composed
Where an edit is described, refused, or bounced back, the values the person
entered SHALL still be in the form when they arrive. The form MUST NOT be
re-rendered from the entity's stored values, discarding the edit.

A refusal usually names one thing to fix. Fixing it must not cost everything
else that was typed.

#### Scenario: The describe refuses the edit
- **WHEN** an agent edit is described and refused
- **THEN** the reason is shown
- **AND** the form still holds what was entered, not the agent's stored values

#### Scenario: A preset the catalog cannot resolve
- **WHEN** the chosen position-management preset is not in the catalog
- **THEN** the page says so
- **AND** what was entered is still there

#### Scenario: The perform bounces back
- **WHEN** a submitted edit is refused and the person is returned to the form
- **THEN** the reason arrives with them
- **AND** so do the values they submitted
