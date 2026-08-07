# Strategy Authoring — Delta

## ADDED Requirements

### Requirement: A Condition Is Written Only As The Whole List, Behind The Ceremony

The product SHALL let a user add a condition to a strategy, change one the
strategy carries, or remove one — only through describe-then-perform. The
describe SHALL read the strategy fresh, compose the strategy's **entire**
condition list with the edit applied, have the platform compile it, and mint a
confirmation bound to that compiled plan. The perform SHALL apply the plan that
was described and no other, and MUST be refused when the confirmation does not
match it.

The list is what is written because the list is what the platform takes. No tool
writes one condition; the only path submits the whole array inside a plan that
reconfigures every bound agent atomically. A surface that spoke of writing one
condition would be describing an operation the platform does not offer.

The conditions the strategy already carries SHALL travel as the platform sent
them, never rebuilt from this product's reading of them. Only a condition that
has no platform object of its own — one the user composed — is serialised, and a
composed condition carrying a form this product did not understand SHALL NOT be
written back at all.

A refusal — from the compiler, from the applier, or from a revision that moved —
SHALL return to the surface acted from, in the platform's words, with the edit
preserved so a fresh describe runs against the strategy as it now stands.

#### Scenario: Adding a condition submits every condition
- **GIVEN** a strategy defining two conditions
- **WHEN** the user saves a drafted third
- **THEN** the request carries all three, in order
- **AND** the two the strategy already had are sent exactly as the platform gave
  them

#### Scenario: A draft whose key the strategy already uses stands in its place
- **WHEN** the user saves a draft whose key matches a condition the strategy
  defines
- **THEN** the list carries that key exactly once
- **AND** the user is told the draft replaced that condition rather than joining it

#### Scenario: A condition is removed
- **GIVEN** a strategy defining two conditions
- **WHEN** the user removes one
- **THEN** the list submitted carries the other alone

#### Scenario: Removing something the strategy does not define
- **WHEN** a removal names a key the strategy does not carry
- **THEN** the surface says so, distinctly from an empty form
- **AND** no plan is compiled and no confirmation is minted

#### Scenario: A form the product cannot express is never written back
- **GIVEN** a draft carrying a part this product reported as not understood
- **WHEN** the user saves it
- **THEN** nothing is compiled and nothing is sent
- **AND** the part that could not be expressed is named

#### Scenario: The agreement cannot be spent on a different plan
- **GIVEN** a confirmation minted for a described plan
- **WHEN** a plan altered after the describe is submitted with it
- **THEN** the write is refused before the platform is asked

#### Scenario: The change is proven by the re-read
- **WHEN** a condition write succeeds
- **THEN** the user lands on the strategy read fresh, showing the condition list
  as the platform now holds it

### Requirement: A Condition Write Names The Whole List And What It Would Strand

The describe SHALL state, before agreement and as part of the text the
confirmation is issued against: every condition the strategy would be left
defining; whether the edit added, replaced, or removed one; every reference the
edit would leave with nothing to resolve; and how many agents the write
reconfigures.

Naming only the condition being changed would understate the agreement, because
the whole list is resubmitted. Naming the references matters for the same reason
one layer down: removing a condition that another one refers to leaves a rule
nobody can evaluate, and that consequence appears nowhere in the condition being
changed.

References the strategy **already** cannot resolve SHALL NOT be attributed to the
edit. They are a property of the strategy and are reported where the strategy is
read; listing them here would overstate what agreeing to this change does.

A dangling reference SHALL be shown and SHALL NOT block the write. Whether the
platform accepts one is its ruling to make, in its own words.

The bound agent count SHALL be stated whether it is zero or many, from the
platform's own plan where the plan carries it and from the strategy as read
otherwise — never omitted.

#### Scenario: The list is stated, not just the edit
- **GIVEN** a strategy defining two conditions and a drafted third
- **WHEN** the describe runs
- **THEN** all three are named as what the strategy would be left defining
- **AND** the text says the platform takes the condition list whole

#### Scenario: A removal names what it would strand
- **GIVEN** a condition that another condition refers to
- **WHEN** the user is shown what removing it would do
- **THEN** the reference left with nothing to resolve is named
- **AND** that naming is part of the text the confirmation was issued against

#### Scenario: A reference that already dangled is not blamed on the edit
- **GIVEN** a strategy whose conditions refer to a key it does not define
- **WHEN** an unrelated condition is added
- **THEN** that pre-existing reference is not listed as a consequence of the edit

#### Scenario: The blast radius is stated for zero as plainly as for many
- **WHEN** a condition write is described on a strategy no agent is bound to
- **THEN** the consequence says so

### Requirement: A Plan That Would Save Something Else Is Refused, Not Described

Where the product composes an update naming only some of a strategy's axes, it
SHALL check the compiled plan's post-state against what it submitted before
asking anyone to agree, and SHALL refuse a plan that would save a condition list
other than the one submitted, or that would change an axis the update did not
name.

Compiling performs no write, so the platform's own account of what it would save
is available for free, and it is the only moment this product can see what its
omissions actually did. The alternative is to carry a behaviour observed once as
a standing assumption — which is how this product has produced dead and dangerous
write paths before.

The refusal SHALL be distinct from a platform refusal. A platform refusal is
BattleGrid declining the change; this is BattleGrid accepting a change nobody
described. The surface SHALL say that nothing was written and that no agreement
was recorded.

#### Scenario: The compiler does not take the submitted list
- **GIVEN** an update submitting a condition list
- **WHEN** the compiled post-state carries a different list
- **THEN** the write is refused with what was submitted and what would be saved
- **AND** no confirmation is minted

#### Scenario: An axis the update never named would move
- **GIVEN** an update naming only the condition list
- **WHEN** the compiled post-state carries a different tagline or a different set
  of report sections
- **THEN** the write is refused rather than described

#### Scenario: A plan that matches what was submitted proceeds
- **WHEN** the compiled post-state carries exactly the list submitted and the
  strategy's own tagline and sections
- **THEN** the describe proceeds to the confirmation

## MODIFIED Requirements

### Requirement: A Drafted Condition Can Be Tried Without Being Saved

The product SHALL let a user compose a condition that the strategy does not
carry — its key, its name, the direction it calls or none, and a definition
built from the platform's grammar — and have the platform resolve that draft
against live market state on a coin selection the user chooses, showing the
result with the same evidence, provisional marking and counts as a resolved
condition the strategy already defines.

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
- **THEN** the draft carries that condition's definition whole
- **AND** the user can give the draft a different key and a different direction
  without the definition changing

#### Scenario: Starting from a condition that is no longer there
- **GIVEN** a request to start from a condition the strategy does not define
- **WHEN** the surface renders
- **THEN** it says that condition was not found
- **AND** this is distinguished from opening the composer with nothing drafted
