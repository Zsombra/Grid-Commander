# harness-integrity — delta

## ADDED Requirements

### Requirement: A Check That Walks A Confirmed Write Applies The Change It Described
A check that walks a write requiring confirmation SHALL form one intent, ask for
that intent to be described, and submit that same intent. Where the product
splits one intent into the parts a write takes, the check SHALL use the
product's own split rather than composing the parts itself.

A confirmation is bound to the change it described, not merely to the thing
being changed. A check describing one change and submitting another therefore
mints an authorisation its own submission cannot spend: the write is refused by
the product's own guard before anything reaches the platform, and the check
fails on its own composition. That failure reads as a product defect and invites
the one repair that must never be made — loosening the binding — so a check that
cannot spend what it minted is worse than no check at all.

A check composing the parts of the submission by hand SHALL be treated as the
same defect even where the two currently agree, because that is the divergence
that hides: the describe and the apply are written at different moments and only
the digest notices they have drifted.

#### Scenario: A check walks a confirmed write
- **GIVEN** a check that describes a change and then submits it
- **WHEN** it submits
- **THEN** the confirmation the description minted authorises the submission
- **AND** the write is performed

#### Scenario: The two halves name different changes
- **GIVEN** a check that describes one change and submits another
- **WHEN** it submits
- **THEN** the write is refused before any request is built
- **AND** the check fails rather than reporting the write as performed

#### Scenario: The product splits an intent before writing
- **GIVEN** a write whose intent the product divides into separate arguments
- **WHEN** a check walks that write
- **THEN** it divides the intent the same way the product does

### Requirement: A Live Check's Confirmed Pair Is Proven Without The Platform
The describe-then-submit pair a live check walks SHALL be pinned by a check that
needs no credential and touches no account, driving the same pair and asserting
the authorisation is spendable.

A live check against a real account is run deliberately and rarely, so a pair
that cannot be authorised can sit broken indefinitely — which is what happened
here: the binding was narrowed, nothing ran the probe afterwards, and the defect
was found by reading rather than by failing. Evidence that cannot be produced on
demand is not evidence.

The offline pinning SHALL also exercise the disagreeing pair, so it demonstrates
the refusal rather than asserting only that a working pair works.

#### Scenario: The suite runs with no credential
- **GIVEN** a checkout with no BattleGrid credential and no opt-in to write
- **WHEN** the default suite runs
- **THEN** the pair the live check walks is driven against the doubles
- **AND** the authorisation minted by the description is shown to be spendable

#### Scenario: The pair drifts apart again
- **GIVEN** a live check whose description and submission stop naming the same
  change
- **WHEN** the default suite runs
- **THEN** it fails, without the live check being run
