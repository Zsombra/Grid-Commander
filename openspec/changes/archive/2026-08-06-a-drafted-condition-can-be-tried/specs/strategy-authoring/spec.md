# strategy-authoring (delta)

## ADDED Requirements

### Requirement: A Drafted Condition Can Be Tried Without Being Saved

The product SHALL let a user compose a condition that the strategy does not
carry — its key, its name, the direction it calls or none, and a definition
built from the platform's grammar — and have the platform resolve that draft
against live market state on a coin selection the user chooses, showing the
result with the same evidence, provisional marking and counts as a resolved
condition the strategy already defines.

Composing and trying SHALL write nothing. No draft is persisted, no strategy is
altered, and the surface SHALL state that it cannot save rather than leaving a
user to infer it from an absent control. A user who has tried a draft SHALL NOT
be able to reach a save from the same act.

This is the question authoring begins with. Reading a condition answers *what
does this rule say* and reading its outcome answers *what did it do*; neither
answers *what would a different rule have done*, which is the only one that can
change a decision. The platform resolves a draft for free — the tool that
renders a preview takes conditions as an argument and resolves exactly what it
is given — so the answer costs a read this product was already making.

The composer MAY build a narrower grammar than the platform accepts. Where it
does, the limit SHALL be stated where composing happens, and a strategy carrying
a form the composer cannot build SHALL still be readable in full. **A draft
SHALL also be able to start from a condition the strategy already carries**,
taking that condition's definition whole at whatever depth it has — otherwise
the conditions most worth asking a question about, the deeply nested ones, are
exactly the ones no question can be asked about.

#### Scenario: A draft resolved against live coins
- **GIVEN** a strategy the user can read
- **WHEN** the user composes a condition and asks for it to be tried over a coin
  selection
- **THEN** each coin is named, with the platform's outcome for the drafted
  condition on it
- **AND** the outcome shown is the platform's own, never one derived here

#### Scenario: Nothing is saved
- **WHEN** a draft is tried
- **THEN** no write reaches the platform and the strategy is unchanged
- **AND** the surface says that trying a draft cannot save it

#### Scenario: The platform refuses the drafted condition
- **GIVEN** the platform refuses the composition the draft was sent in
- **WHEN** the draft is tried
- **THEN** the refusal is shown in the platform's words on the same page
- **AND** no outcome is invented in its place

#### Scenario: A grammar the composer does not build
- **WHEN** the composer offers less of the grammar than the platform accepts
- **THEN** what it cannot build is stated where composing happens
- **AND** a strategy carrying such a form is still shown in full elsewhere

#### Scenario: Starting from a condition the strategy already has
- **GIVEN** a strategy defining a condition nested deeper than the composer builds
- **WHEN** the user starts a draft from it
- **THEN** the draft carries that condition's definition whole
- **AND** the user can give the draft a different key and a different direction
  without the definition changing

#### Scenario: Starting from a condition that is no longer there
- **GIVEN** a request to start from a condition the strategy does not define
- **WHEN** the surface renders
- **THEN** it says that condition was not found
- **AND** this is distinguished from opening the composer with nothing drafted

### Requirement: A Form The Product Cannot Express Is Never Guessed At

Where a condition carries a form this product read as not understood, the
product SHALL refuse to send it and SHALL name the part it could not express.
It MUST NOT substitute a shape of its own, drop the part, or send the condition
without it.

Everything the product *can* express SHALL be sent to the platform as composed.
An illegal key, an unknown column, a threshold outside the platform's bounds —
these are refused by BattleGrid with its own reason, and that reason is the
content this surface exists to show. Checking them here first would replace the
platform's teaching with this product's guess about a vocabulary that is still
being extended.

The asymmetry is deliberate and is the whole requirement. Reading an unfamiliar
form and reporting it as not understood costs a reader nothing. Writing one back
means inventing a shape for a grammar the platform is still rolling out, and an
invented shape is indistinguishable from the operator's intent once it is sent.

#### Scenario: A draft containing a form the product does not model
- **GIVEN** a condition carrying a part this product reported as not understood
- **WHEN** the user tries it
- **THEN** nothing is sent to the platform
- **AND** the part that could not be expressed is named

#### Scenario: A value the platform will refuse
- **GIVEN** a draft the product can express but the platform will not accept
- **WHEN** the user tries it
- **THEN** it is sent as composed
- **AND** the platform's refusal is shown rather than a local objection raised in
  its place

### Requirement: What Is Sent To Be Resolved Is What The User Is Told Was Sent

Where the product composes a list of conditions to be resolved, it SHALL tell
the user what that list contains: which conditions came from the strategy, that
the draft was added to them, and — where the draft's key matches one the
strategy defines — that the draft stands in that condition's place rather than
beside it.

A condition may refer to another by key, and the platform resolves only the
conditions it is given. So a draft cannot be resolved alone: it is resolved
inside a list this product assembles, and an operator who is not told what that
list holds cannot tell an outcome caused by their draft from one caused by its
neighbours.

A key appearing twice in one list SHALL never be sent. Two conditions with one
key is a list with no answer to which of them a reference names, and the
resulting outcome would be attributed to a draft that may not have produced it.

#### Scenario: A draft that adds to the strategy's conditions
- **GIVEN** a strategy defining conditions, and a draft whose key none of them
  uses
- **WHEN** the draft is tried
- **THEN** the user is told the draft was resolved alongside the strategy's own
  conditions
- **AND** the strategy's conditions are resolved as they stand

#### Scenario: A draft that replaces one of them
- **GIVEN** a draft whose key matches a condition the strategy defines
- **WHEN** the draft is tried
- **THEN** the user is told the draft stood in that condition's place
- **AND** the list sent carries that key exactly once
