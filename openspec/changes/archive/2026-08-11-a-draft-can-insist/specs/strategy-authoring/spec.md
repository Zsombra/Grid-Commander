# Strategy Authoring — Delta

## MODIFIED Requirements

### Requirement: A Drafted Condition Can Be Tried Without Being Saved

The product SHALL let a user compose a condition that the strategy does not
carry — its key, its name, the direction it calls or none, whether the
strategy insists on it, and a definition built from the platform's grammar —
and have the platform resolve that draft against live market state on a coin
selection the user chooses, showing the result with the same evidence,
provisional marking and counts as a resolved condition the strategy already
defines.

Whether the draft must hold SHALL default to optional — the platform's own
default — and SHALL become required only by the operator's explicit choice.
A value the control does not offer SHALL compose as optional: a wrong
"optional" understates a draft, a wrong "required" silently hardens a
strategy the operator was composing.

Composing and trying SHALL write nothing. No draft is persisted, no strategy is
altered, and the surface SHALL state that it cannot save rather than leaving a
user to infer it from an absent control. **Saving a draft SHALL be a separate
act**: a separate request, against a fresh read of the strategy, with its own
description of what would change and its own confirmation. Trying and saving MUST
NOT be the same submission, and the composing surface MUST NOT itself write.

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
taking that condition's definition — and whether it must hold — whole at
whatever depth it has — otherwise the conditions most worth asking a question
about, the deeply nested ones, are exactly the ones no question can be asked
about.

#### Scenario: A draft resolved against live coins
- **GIVEN** a strategy the user can read
- **WHEN** the user composes a condition and asks for it to be tried over a coin
  selection
- **THEN** each coin is named, with the platform's outcome for the drafted
  condition on it
- **AND** the outcome shown is the platform's own, never one derived here

#### Scenario: A draft that must hold
- **WHEN** the user composes a draft and explicitly chooses that it must hold
- **THEN** the draft is composed as required
- **AND** with no choice made, or a value the control does not offer, it is
  composed as optional — the platform's own default

#### Scenario: Trying saves nothing
- **WHEN** a draft is tried
- **THEN** no write reaches the platform and the strategy is unchanged
- **AND** the surface says that trying a draft does not save it

#### Scenario: Saving is a second act, described afresh
- **GIVEN** a draft the user has tried
- **WHEN** the user chooses to save it
- **THEN** the strategy is read again and what would change is described again
- **AND** nothing is written until that description is agreed to

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
- **THEN** the draft carries that condition's definition, and whether it must
  hold, whole
- **AND** the user can give the draft a different key and a different direction
  without the definition changing

#### Scenario: Starting from a condition that is no longer there
- **GIVEN** a request to start from a condition the strategy does not define
- **WHEN** the surface renders
- **THEN** it says that condition was not found
- **AND** this is distinguished from opening the composer with nothing drafted
