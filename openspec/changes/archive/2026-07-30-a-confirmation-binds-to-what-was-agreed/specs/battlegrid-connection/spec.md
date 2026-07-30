# battlegrid-connection — delta

## MODIFIED Requirements

### Requirement: Destructive Operations Require Confirmation Naming The Consequence
Before performing an operation classified as destructive, Grid-Commander SHALL
obtain confirmation from the user that names what will be changed or lost.

**A confirmation SHALL authorise the operation it described, and no other.**
Where the operation carries values — an amount, a destination, a configuration —
those values are part of what was agreed to, and a confirmation issued against
one set of values MUST NOT authorise a submission carrying different ones.

Matching the user, the tool and the entity is not sufficient. A token issued
against *"sets the most it may lose in a day to $25"* and a submission carrying
$25,000 are the same user, the same tool and the same agent. The consequence is
stored, so such a mismatch is **recorded** in the audit log; recording it is not
preventing it, and the audit log is what this product offers in place of trust.

**The binding SHALL be checked before a request is built**, not after the platform
answers. A refusal that arrives from BattleGrid has already sent the tampered
values.

**One mechanism, in one place.** Where several flows bind values into a
confirmation, they SHALL do so through a single shared construction rather than
each composing the same string by hand. Three flows building it independently is
how the fourth came to be written without it.

#### Scenario: A destructive operation is requested
- **WHEN** a user asks for something classified as destructive
- **THEN** they are shown what it will change or remove before it happens
- **AND** it proceeds only after they confirm

#### Scenario: Confirmation is withheld
- **WHEN** the user does not confirm
- **THEN** nothing is changed

#### Scenario: The submitted values differ from the agreed ones
- **WHEN** an operation is submitted carrying values other than those the
  confirmation was issued against
- **THEN** the confirmation does not authorise it
- **AND** no request is built

#### Scenario: The values are the ones that were agreed
- **WHEN** an operation is submitted carrying exactly the values described
- **THEN** the confirmation authorises it, once
